#!/bin/bash

# TrendAI Prototype Docker 배포 스크립트
# 그린/블루 무중단 배포 지원

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    log_error ".env 파일이 없습니다. env.example을 참고하여 .env 파일을 생성해주세요."
    exit 1
fi

# Docker 및 Docker Compose 설치 확인
check_dependencies() {
    log_info "의존성 확인 중..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되어 있지 않습니다."
        exit 1
    fi
    
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

# 헬스체크 함수
health_check() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    log_info "${service_name} 헬스체크 시작..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "${service_name}.*Up"; then
            log_success "${service_name} 정상 시작됨"
            return 0
        fi
        
        log_info "헬스체크 시도 ${attempt}/${max_attempts}..."
        sleep 10
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
    
    if health_check ${service_name}; then
        log_success "${service_name} 시작 완료"
        return 0
    else
        log_error "${service_name} 시작 실패"
        return 1
    fi
}

# 이미지 빌드
build_images() {
    log_info "Docker 이미지 빌드 중..."
    docker-compose build --no-cache
    log_success "이미지 빌드 완료"
}

# Nginx 설정 업데이트
update_nginx_config() {
    local active_color=$1
    local backup_color=$2
    
    log_info "Nginx 설정 업데이트 중... (활성: ${active_color}, 백업: ${backup_color})"
    
    # nginx.conf에서 upstream 서버 순서 변경
    if [ "$active_color" = "green" ]; then
        sed -i 's/server backend-green:8001 max_fails=3 fail_timeout=30s;/server backend-green:8001 max_fails=3 fail_timeout=30s;/g' nginx/nginx.conf
        sed -i 's/server backend-blue:8001 max_fails=3 fail_timeout=30s backup;/server backend-blue:8001 max_fails=3 fail_timeout=30s backup;/g' nginx/nginx.conf
        sed -i 's/server frontend-green:80 max_fails=3 fail_timeout=30s;/server frontend-green:80 max_fails=3 fail_timeout=30s;/g' nginx/nginx.conf
        sed -i 's/server frontend-blue:80 max_fails=3 fail_timeout=30s backup;/server frontend-blue:80 max_fails=3 fail_timeout=30s backup;/g' nginx/nginx.conf
    else
        sed -i 's/server backend-green:8001 max_fails=3 fail_timeout=30s;/server backend-green:8001 max_fails=3 fail_timeout=30s backup;/g' nginx/nginx.conf
        sed -i 's/server backend-blue:8001 max_fails=3 fail_timeout=30s backup;/server backend-blue:8001 max_fails=3 fail_timeout=30s;/g' nginx/nginx.conf
        sed -i 's/server frontend-green:80 max_fails=3 fail_timeout=30s;/server frontend-green:80 max_fails=3 fail_timeout=30s backup;/g' nginx/nginx.conf
        sed -i 's/server frontend-blue:80 max_fails=3 fail_timeout=30s backup;/server frontend-blue:80 max_fails=3 fail_timeout=30s;/g' nginx/nginx.conf
    fi
    
    # Nginx 재시작
    docker-compose restart nginx
    log_success "Nginx 설정 업데이트 완료"
}

# 롤백 함수
rollback() {
    local failed_color=$1
    local rollback_color=$2
    
    log_warning "롤백 시작... (실패: ${failed_color} -> 복구: ${rollback_color})"
    
    # 실패한 서비스 중지
    stop_service "backend-${failed_color}"
    stop_service "frontend-${failed_color}"
    
    # 이전 서비스 재시작
    start_service "backend-${rollback_color}"
    start_service "frontend-${rollback_color}"
    
    # Nginx 설정 복구
    update_nginx_config ${rollback_color} ${failed_color}
    
    log_success "롤백 완료"
}

# 메인 배포 함수
deploy() {
    log_info "TrendAI Prototype 배포 시작..."
    
    # 스크립트 권한 설정
    chmod +x ./deploy.sh
    chmod +x ./healthcheck.sh
    chmod +x ./update.sh
    chmod +x ./monitor.sh
    
    # 의존성 확인
    check_dependencies
    
    # 현재 배포 상태 확인
    check_current_deployment
    
    # 이미지 빌드
    build_images
    
    # Redis 시작 (이미 실행 중이면 무시)
    log_info "Redis 시작 중..."
    docker-compose up -d redis
    health_check "trendai_redis"
    
    if [ "$CURRENT_COLOR" = "none" ]; then
        # 첫 배포
        log_info "첫 배포 시작 (Green 환경)"
        
        start_service "backend-green"
        start_service "frontend-green"
        start_service "nginx"
        
        log_success "첫 배포 완료! http://localhost 에서 확인하세요."
        
    else
        # 무중단 배포
        log_info "무중단 배포 시작 (${CURRENT_COLOR} -> ${TARGET_COLOR})"
        
        # 대상 환경 시작
        if start_service "backend-${TARGET_COLOR}"; then
            if start_service "frontend-${TARGET_COLOR}"; then
                # Nginx 설정 업데이트 (트래픽 전환)
                update_nginx_config ${TARGET_COLOR} ${CURRENT_COLOR}
                
                # 잠시 대기 (트래픽 안정화)
                log_info "트래픽 안정화 대기 중..."
                sleep 30
                
                # 이전 환경 중지
                stop_service "backend-${CURRENT_COLOR}"
                stop_service "frontend-${CURRENT_COLOR}"
                
                log_success "무중단 배포 완료! (${TARGET_COLOR} 환경 활성화)"
            else
                log_error "프론트엔드 시작 실패, 롤백 중..."
                rollback ${TARGET_COLOR} ${CURRENT_COLOR}
                exit 1
            fi
        else
            log_error "백엔드 시작 실패, 롤백 중..."
            rollback ${TARGET_COLOR} ${CURRENT_COLOR}
            exit 1
        fi
    fi
}

# 정리 함수
cleanup() {
    log_info "사용하지 않는 Docker 리소스 정리 중..."
    docker system prune -f
    log_success "정리 완료"
}

# 로그 확인 함수
logs() {
    local service_name=${1:-""}
    if [ -n "$service_name" ]; then
        docker-compose logs -f $service_name
    else
        docker-compose logs -f
    fi
}

# 상태 확인 함수
status() {
    log_info "서비스 상태 확인 중..."
    docker-compose ps
}

# 중지 함수
stop() {
    log_info "모든 서비스 중지 중..."
    docker-compose down
    log_success "모든 서비스 중지 완료"
}

# 도움말 함수
help() {
    echo "TrendAI Prototype Docker 배포 스크립트"
    echo ""
    echo "사용법: $0 [명령어]"
    echo ""
    echo "명령어:"
    echo "  deploy     - 그린/블루 무중단 배포 실행"
    echo "  status     - 서비스 상태 확인"
    echo "  logs       - 로그 확인 (서비스명 선택사항)"
    echo "  stop       - 모든 서비스 중지"
    echo "  cleanup    - 사용하지 않는 Docker 리소스 정리"
    echo "  help       - 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0 deploy"
    echo "  $0 logs backend-green"
    echo "  $0 status"
}

# 메인 스크립트
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    status)
        status
        ;;
    logs)
        logs $2
        ;;
    stop)
        stop
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "알 수 없는 명령어: $1"
        help
        exit 1
        ;;
esac
