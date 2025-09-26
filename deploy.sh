#!/usr/bin/env bash

# TrendAI Prototype Docker 배포 스크립트
# Green/Blue 무중단 배포 (네트워크 alias 방식)

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

# 네트워크 이름 (docker-compose project명에 따라 달라질 수 있음)
NETWORK="trendai_prototype_docker_trendai_network"

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    log_error ".env 파일이 없습니다. env.example을 참고하여 .env 파일을 생성해주세요."
    exit 1
fi

# Docker 및 Docker Compose 설치 확인
check_dependencies() {
    log_info "의존성 확인 중..."
    command -v docker >/dev/null 2>&1 || { log_error "Docker가 설치되어 있지 않습니다."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose가 설치되어 있지 않습니다."; exit 1; }
    log_success "의존성 확인 완료"
}

# 현재 배포 상태 확인
check_current_deployment() {
    log_info "현재 배포 상태 확인 중..."

    if docker-compose ps | grep -q "trendai_backend_green.*Up"; then
        CURRENT_COLOR="green"
        TARGET_COLOR="blue"
    elif docker-compose ps | grep -q "trendai_backend_blue.*Up"; then
        CURRENT_COLOR="blue"
        TARGET_COLOR="green"
    else
        CURRENT_COLOR="none"
        TARGET_COLOR="green"
    fi

    log_info "현재 배포: ${CURRENT_COLOR}, 대상 배포: ${TARGET_COLOR}"
}

# 헬스체크
health_check() {
    local service_name=$1
    local max_attempts=30
    local attempt=1

    log_info "${service_name} 헬스체크 시작..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "${service_name}.*healthy"; then
            log_success "${service_name} 정상 시작됨"
            return 0
        fi
        log_info "헬스체크 시도 ${attempt}/${max_attempts}..."
        sleep 5
        ((attempt++))
    done

    log_error "${service_name} 헬스체크 실패"
    return 1
}

# 서비스 중지
stop_service() {
    local service_name=$1
    log_info "${service_name} 중지 중..."
    docker-compose stop ${service_name} || true
    docker-compose rm -f ${service_name} || true
    log_success "${service_name} 중지 완료"
}

# 서비스 시작
start_service() {
    local service_name=$1
    log_info "${service_name} 시작 중..."
    docker-compose up -d ${service_name}
    health_check ${service_name}
}

# 이미지 빌드
build_images() {
    log_info "Docker 이미지 빌드 중..."
    docker-compose build --no-cache
    log_success "이미지 빌드 완료"
}

# 네트워크 alias 전환
switch_alias() {
    local active_color=$1

    log_info "네트워크 alias 전환 중... (활성: $active_color)"

    # 프론트엔드
    docker network disconnect $NETWORK trendai_frontend_blue || true
    docker network disconnect $NETWORK trendai_frontend_green || true
    docker network connect --alias frontend-active $NETWORK trendai_frontend_${active_color}

    # 백엔드
    docker network disconnect $NETWORK trendai_backend_blue || true
    docker network disconnect $NETWORK trendai_backend_green || true
    docker network connect --alias backend-active $NETWORK trendai_backend_${active_color}

    # Nginx 재시작
    docker-compose restart nginx

    log_success "네트워크 alias 전환 완료 (${active_color} 활성화)"
}

# 롤백
rollback() {
    local failed_color=$1
    local rollback_color=$2

    log_warning "롤백 시작... (실패: ${failed_color} -> 복구: ${rollback_color})"

    stop_service "backend-${failed_color}"
    stop_service "frontend-${failed_color}"

    start_service "backend-${rollback_color}"
    start_service "frontend-${rollback_color}"

    switch_alias ${rollback_color}

    log_success "롤백 완료"
}

# 메인 배포
deploy() {
    log_info "TrendAI Prototype 배포 시작..."

    check_dependencies
    check_current_deployment
    build_images

    # Redis 시작
    log_info "Redis 시작..."
    docker-compose up -d redis
    health_check "trendai_redis"

    if [ "$CURRENT_COLOR" = "none" ]; then
        # 첫 배포
        log_info "첫 배포 시작 (Green 환경)"
        start_service "backend-green"
        start_service "frontend-green"
        switch_alias green
        log_success "첫 배포 완료! http://localhost 에서 확인하세요."
    else
        # 무중단 배포
        log_info "무중단 배포 시작 (${CURRENT_COLOR} -> ${TARGET_COLOR})"

        if start_service "backend-${TARGET_COLOR}"; then
            if start_service "frontend-${TARGET_COLOR}"; then
                switch_alias ${TARGET_COLOR}
                sleep 10
                stop_service "backend-${CURRENT_COLOR}"
                stop_service "frontend-${CURRENT_COLOR}"
                log_success "무중단 배포 완료! (${TARGET_COLOR} 환경 활성화)"
            else
                log_error "프론트엔드 시작 실패, 롤백 중..."
                rollback ${TARGET_COLOR} ${CURRENT_COLOR}
            fi
        else
            log_error "백엔드 시작 실패, 롤백 중..."
            rollback ${TARGET_COLOR} ${CURRENT_COLOR}
        fi
    fi
}

# 기타 유틸리티
cleanup() {
    log_info "사용하지 않는 Docker 리소스 정리..."
    docker system prune -f
    log_success "정리 완료"
}

logs() {
    local service_name=${1:-""}
    if [ -n "$service_name" ]; then
        docker-compose logs -f $service_name
    else
        docker-compose logs -f
    fi
}

status() {
    log_info "서비스 상태 확인..."
    docker-compose ps
}

stop() {
    log_info "모든 서비스 중지..."
    docker-compose down
    log_success "모든 서비스 중지 완료"
}

help() {
    echo "TrendAI Prototype Docker 배포 스크립트"
    echo ""
    echo "사용법: $0 [명령어]"
    echo ""
    echo "명령어:"
    echo "  deploy     - 그린/블루 무중단 배포 실행"
    echo "  status     - 서비스 상태 확인"
    echo "  logs [svc] - 로그 확인 (서비스명 선택 가능)"
    echo "  stop       - 모든 서비스 중지"
    echo "  cleanup    - 사용하지 않는 Docker 리소스 정리"
    echo "  help       - 도움말 표시"
}

COMMAND=${1:-deploy}
SERVICE=${2:-}

case "$COMMAND" in
    deploy)   deploy ;;
    status)   status ;;
    logs)     logs $SERVICE ;;
    stop)     stop ;;
    cleanup)  cleanup ;;
    help|-h|--help) help ;;
    *) log_error "알 수 없는 명령어: ${COMMAND}"; help; exit 1 ;;
esac