#!/bin/bash

# TrendAI Prototype 헬스체크 스크립트

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

# 서비스 헬스체크
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=5
    local attempt=1
    
    log_info "${service_name} 헬스체크 시작... (${url})"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "${service_name} 정상 동작"
            return 0
        fi
        
        log_warning "${service_name} 헬스체크 시도 ${attempt}/${max_attempts} 실패"
        sleep 5
        ((attempt++))
    done
    
    log_error "${service_name} 헬스체크 실패"
    return 1
}

# 메인 헬스체크
main() {
    log_info "TrendAI Prototype 헬스체크 시작..."
    
    # Nginx 헬스체크
    if ! check_service "Nginx" "http://localhost/health"; then
        exit 1
    fi
    
    # API 헬스체크
    if ! check_service "API" "http://localhost/api/health"; then
        exit 1
    fi
    
    # 프론트엔드 헬스체크 (기본 페이지 로드)
    if ! check_service "Frontend" "http://localhost/"; then
        exit 1
    fi
    
    log_success "모든 서비스 정상 동작"
    exit 0
}

# 스크립트 실행
main "$@"
