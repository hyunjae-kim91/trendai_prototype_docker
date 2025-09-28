#!/usr/bin/env bash

# TrendAI Prototype Docker 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    log_error ".env 파일이 없습니다. env.example을 참고하여 .env 파일을 생성해주세요."
    exit 1
fi

# docker compose 명령 감지
DOCKER_COMPOSE=()

detect_docker_compose() {
    if [ ${#DOCKER_COMPOSE[@]} -gt 0 ]; then
        return 0
    fi

    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE=(docker compose)
        return 0
    fi

    if command -v docker-compose >/dev/null 2>&1; then
        DOCKER_COMPOSE=(docker-compose)
        return 0
    fi

    return 1
}

ensure_compose() {
    if detect_docker_compose; then
        return 0
    fi
    log_error "Docker Compose가 설치되어 있지 않습니다. docker compose 플러그인 또는 docker-compose 바이너리를 설치해주세요."
    return 1
}

# Docker 및 Docker Compose 설치 확인
check_dependencies() {
    log_info "의존성 확인 중..."
    command -v docker >/dev/null 2>&1 || { log_error "Docker가 설치되어 있지 않습니다."; exit 1; }
    ensure_compose || exit 1

    if [ "${DOCKER_COMPOSE[0]}" = "docker" ]; then
        log_success "의존성 확인 완료 (docker compose)"
    else
        log_success "의존성 확인 완료 (docker-compose)"
    fi
}

# 헬스체크
health_check() {
    local service_name=$1
    local max_attempts=60
    local attempt=1

    log_info "${service_name} 헬스체크 시작..."

    # Redis는 별도 체크 (redis-cli ping → PONG)
    if [ "$service_name" = "trendai_redis" ]; then
        while [ $attempt -le $max_attempts ]; do
            if docker exec $service_name redis-cli ping 2>/dev/null | grep -q PONG; then
                log_success "Redis 정상 시작됨"
                return 0
            fi
            log_info "Redis 헬스체크 시도 ${attempt}/${max_attempts}..."
            sleep 5
            ((attempt++))
        done
        log_error "Redis 헬스체크 실패"
        return 1
    fi

    # 일반 서비스 체크 (Docker Health / State 확인)
    while [ $attempt -le $max_attempts ]; do
        local inspect_output
        inspect_output=$(docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$service_name" 2>/dev/null || echo "")

        if [ -z "$inspect_output" ]; then
            log_info "${service_name} 컨테이너를 찾을 수 없습니다. 헬스체크 시도 ${attempt}/${max_attempts}..."
            sleep 5
            ((attempt++))
            continue
        fi

        IFS='|' read -r container_state health_status <<<"$inspect_output"

        if [ "$health_status" = "healthy" ]; then
            log_success "${service_name} 정상 시작됨"
            return 0
        fi

        if [ "$health_status" = "unhealthy" ]; then
            local health_details
            health_details=$(docker inspect --format '{{range .State.Health.Log}}{{.Start}} | exit {{.ExitCode}} | {{.Output}}{{"\n"}}{{end}}' "$service_name" 2>/dev/null | tail -n 5)
            if [ -n "$health_details" ]; then
                log_warning "${service_name} 최근 헬스체크 로그:\n${health_details}"
            fi
            log_error "${service_name} 헬스체크 실패 (unhealthy)"
            return 1
        fi

        if [ "$health_status" = "none" ] && [ "$container_state" = "running" ]; then
            log_success "${service_name} 실행 중 (헬스체크 미구현)"
            return 0
        fi

        log_info "헬스체크 시도 ${attempt}/${max_attempts}... (상태: state=${container_state}, health=${health_status})"
        sleep 5
        ((attempt++))
    done

    log_error "${service_name} 헬스체크 실패 (시간 초과)"
    return 1
}

# 이미지 빌드
build_images() {
    ensure_compose || exit 1
    log_info "Docker 이미지 빌드 중..."
    "${DOCKER_COMPOSE[@]}" build --no-cache
    log_success "이미지 빌드 완료"
}

# 메인 배포
deploy() {
    log_info "TrendAI Prototype 배포 시작..."

    check_dependencies
    cleanup_containers_and_images
    build_images

    # 모든 서비스 시작
    log_info "모든 서비스 시작 중..."
    if ! "${DOCKER_COMPOSE[@]}" up -d; then
        log_warning "${DOCKER_COMPOSE[*]} up -d 실행 중 오류가 발생했습니다. 헬스체크 진행으로 상세 원인을 확인합니다."
    fi

    # 서비스별 헬스체크 (실패해도 배포는 계속 진행)
    if ! health_check "trendai_redis"; then
        log_warning "trendai_redis 헬스체크 실패 - 로그를 확인해주세요."
    fi
    if ! health_check "trendai_backend"; then
        log_warning "trendai_backend 헬스체크 실패 - 로그를 확인해주세요."
    fi
    if ! health_check "trendai_frontend"; then
        log_warning "trendai_frontend 헬스체크 실패 - 로그를 확인해주세요."
    fi
    if ! health_check "trendai_nginx"; then
        log_warning "trendai_nginx 헬스체크 실패 - 로그를 확인해주세요."
    fi

    log_success "배포 완료! http://localhost 에서 확인하세요."
}

# 기존 컨테이너와 이미지 정리
remove_dead_containers_and_images() {
    log_info "죽은 컨테이너와 이미지 정리..."

    docker ps -a --filter "status=dead" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
    docker ps -a --filter "status=exited" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

    docker images --filter "dangling=true" --format "{{.ID}}" | xargs -r docker rmi -f 2>/dev/null || true

    log_success "죽은 컨테이너와 이미지 정리 완료"
}

cleanup_containers_and_images() {
    ensure_compose || exit 1
    log_info "기존 컨테이너와 이미지 정리 중..."
    
    # 기존 컨테이너 중지 및 삭제
    log_info "기존 컨테이너 중지 및 삭제..."
    "${DOCKER_COMPOSE[@]}" down --remove-orphans 2>/dev/null || true

    log_info "중지된 Compose 서비스 정리..."
    "${DOCKER_COMPOSE[@]}" rm -f 2>/dev/null || true
    
    # 프로젝트 관련 컨테이너 강제 삭제
    docker ps -a --filter "name=trendai_" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true

    remove_dead_containers_and_images
    
    # 프로젝트 관련 이미지 삭제
    log_info "프로젝트 관련 이미지 삭제..."
    docker images --filter "reference=trendai_prototype_docker*" --format "{{.Repository}}:{{.Tag}}" | xargs -r docker rmi -f 2>/dev/null || true
    
    # 사용하지 않는 이미지 삭제
    log_info "사용하지 않는 이미지 삭제..."
    docker image prune -f 2>/dev/null || true
    
    log_success "컨테이너 및 이미지 정리 완료"
}

# 강제 정리 (모든 관련 리소스 삭제)
force_cleanup() {
    ensure_compose || exit 1
    log_warning "강제 정리 시작 (모든 관련 리소스 삭제)..."
    
    # 모든 컨테이너 중지 및 삭제
    log_info "모든 컨테이너 중지 및 삭제..."
    "${DOCKER_COMPOSE[@]}" down --remove-orphans --volumes 2>/dev/null || true
    
    # 프로젝트 관련 컨테이너 강제 삭제
    docker ps -a --filter "name=trendai_" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true

    remove_dead_containers_and_images
    
    # 프로젝트 관련 이미지 강제 삭제
    log_info "프로젝트 관련 이미지 강제 삭제..."
    docker images --filter "reference=trendai_prototype_docker*" --format "{{.Repository}}:{{.Tag}}" | xargs -r docker rmi -f 2>/dev/null || true
    
    # 사용하지 않는 모든 리소스 삭제
    log_info "사용하지 않는 모든 리소스 삭제..."
    docker system prune -af --volumes 2>/dev/null || true
    
    # 네트워크 정리
    log_info "사용하지 않는 네트워크 정리..."
    docker network prune -f 2>/dev/null || true
    
    log_success "강제 정리 완료"
}

# 기타 유틸리티
cleanup() {
    log_info "사용하지 않는 Docker 리소스 정리..."
    cleanup_containers_and_images
    docker system prune -f
    log_success "정리 완료"
}

logs() {
    local service_name=${1:-""}
    ensure_compose || exit 1
    if [ -n "$service_name" ]; then
        "${DOCKER_COMPOSE[@]}" logs -f $service_name
    else
        "${DOCKER_COMPOSE[@]}" logs -f
    fi
}

status() {
    log_info "서비스 상태 확인..."
    ensure_compose || exit 1
    "${DOCKER_COMPOSE[@]}" ps
}

stop() {
    log_info "모든 서비스 중지..."
    ensure_compose || exit 1
    "${DOCKER_COMPOSE[@]}" down
    log_success "모든 서비스 중지 완료"
}

help() {
    echo "TrendAI Prototype Docker 배포 스크립트"
    echo ""
    echo "사용법: $0 [명령어]"
    echo ""
    echo "명령어:"
    echo "  deploy         - 서비스 배포 실행 (자동 정리 포함)"
    echo "  status         - 서비스 상태 확인"
    echo "  logs [svc]     - 로그 확인 (서비스명 선택 가능)"
    echo "  stop           - 모든 서비스 중지"
    echo "  cleanup        - 사용하지 않는 Docker 리소스 정리"
    echo "  force-cleanup  - 모든 관련 리소스 강제 삭제 (컨테이너, 이미지, 볼륨, 네트워크)"
    echo "  help           - 도움말 표시"
}

COMMAND=${1:-deploy}
SERVICE=${2:-}

case "$COMMAND" in
    deploy)         deploy ;;
    status)         status ;;
    logs)           logs $SERVICE ;;
    stop)           stop ;;
    cleanup)        cleanup ;;
    force-cleanup)  force_cleanup ;;
    help|-h|--help) help ;;
    *) log_error "알 수 없는 명령어: ${COMMAND}"; help; exit 1 ;;
esac
