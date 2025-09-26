#!/bin/bash

# TrendAI Prototype 업데이트 스크립트
# 코드 업데이트 후 자동 배포

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

# Git 상태 확인
check_git_status() {
    log_info "Git 상태 확인 중..."
    
    if [ ! -d ".git" ]; then
        log_warning "Git 저장소가 아닙니다. 수동으로 코드를 업데이트해주세요."
        return 1
    fi
    
    # 변경사항 확인
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "커밋되지 않은 변경사항이 있습니다:"
        git status --short
        read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "업데이트 취소됨"
            exit 0
        fi
    fi
    
    log_success "Git 상태 확인 완료"
}

# 코드 업데이트
update_code() {
    local branch=${1:-main}
    
    log_info "코드 업데이트 중... (브랜치: ${branch})"
    
    # 현재 브랜치 확인
    current_branch=$(git branch --show-current)
    log_info "현재 브랜치: ${current_branch}"
    
    # 원격 저장소에서 최신 코드 가져오기
    git fetch origin
    
    # 브랜치 전환 (필요한 경우)
    if [ "$current_branch" != "$branch" ]; then
        log_info "브랜치 전환: ${current_branch} -> ${branch}"
        git checkout "$branch"
    fi
    
    # 최신 코드로 업데이트
    git pull origin "$branch"
    
    log_success "코드 업데이트 완료"
}

# 백업 생성
create_backup() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    log_info "백업 생성 중... (${backup_dir})"
    
    mkdir -p "$backup_dir"
    
    # 현재 Docker Compose 상태 백업
    docker-compose ps > "$backup_dir/docker_status.txt" 2>/dev/null || true
    
    # 환경 설정 백업
    cp .env "$backup_dir/" 2>/dev/null || true
    
    # Git 커밋 해시 저장
    git rev-parse HEAD > "$backup_dir/git_commit.txt" 2>/dev/null || true
    
    log_success "백업 생성 완료: ${backup_dir}"
}

# 배포 실행
deploy() {
    log_info "배포 시작..."
    
    # 배포 스크립트 실행
    if [ -f "./deploy.sh" ]; then
        chmod +x ./deploy.sh
        ./deploy.sh deploy
    else
        log_error "deploy.sh 파일을 찾을 수 없습니다."
        exit 1
    fi
}

# 헬스체크
health_check() {
    log_info "헬스체크 시작..."
    
    if [ -f "./healthcheck.sh" ]; then
        chmod +x ./healthcheck.sh
        ./healthcheck.sh
    else
        log_warning "healthcheck.sh 파일을 찾을 수 없습니다. 수동으로 확인해주세요."
    fi
}

# 정리
cleanup() {
    log_info "정리 작업 중..."
    
    # 오래된 백업 삭제 (7일 이상)
    find backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    # 사용하지 않는 Docker 이미지 정리
    docker image prune -f
    
    log_success "정리 완료"
}

# 롤백 함수
rollback() {
    local backup_dir=$1
    
    if [ -z "$backup_dir" ]; then
        log_error "백업 디렉토리를 지정해주세요."
        exit 1
    fi
    
    if [ ! -d "$backup_dir" ]; then
        log_error "백업 디렉토리를 찾을 수 없습니다: ${backup_dir}"
        exit 1
    fi
    
    log_warning "롤백 시작... (${backup_dir})"
    
    # Git 커밋으로 롤백
    if [ -f "${backup_dir}/git_commit.txt" ]; then
        local commit_hash=$(cat "${backup_dir}/git_commit.txt")
        log_info "Git 커밋으로 롤백: ${commit_hash}"
        git checkout "$commit_hash"
    fi
    
    # 환경 설정 복구
    if [ -f "${backup_dir}/.env" ]; then
        cp "${backup_dir}/.env" ./
        log_info "환경 설정 복구 완료"
    fi
    
    # 재배포
    deploy
    
    log_success "롤백 완료"
}

# 도움말
help() {
    echo "TrendAI Prototype 업데이트 스크립트"
    echo ""
    echo "사용법: $0 [옵션] [브랜치명]"
    echo ""
    echo "옵션:"
    echo "  update     - 코드 업데이트 및 배포 (기본값)"
    echo "  deploy     - 현재 코드로 배포만 실행"
    echo "  rollback   - 이전 버전으로 롤백"
    echo "  backup     - 백업만 생성"
    echo "  status     - 현재 상태 확인"
    echo "  help       - 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0 update main"
    echo "  $0 deploy"
    echo "  $0 rollback backups/20240101_120000"
    echo "  $0 status"
}

# 현재 상태 확인
status() {
    log_info "현재 상태 확인 중..."
    
    echo "=== Git 상태 ==="
    if [ -d ".git" ]; then
        echo "현재 브랜치: $(git branch --show-current)"
        echo "최근 커밋: $(git log -1 --oneline)"
        echo "원격과의 차이: $(git status --porcelain | wc -l)개 파일 변경됨"
    else
        echo "Git 저장소가 아닙니다."
    fi
    
    echo ""
    echo "=== Docker 상태 ==="
    docker-compose ps 2>/dev/null || echo "Docker Compose가 실행되지 않았습니다."
    
    echo ""
    echo "=== 백업 목록 ==="
    if [ -d "backups" ]; then
        ls -la backups/ 2>/dev/null || echo "백업이 없습니다."
    else
        echo "백업 디렉토리가 없습니다."
    fi
}

# 메인 스크립트
case "${1:-update}" in
    update)
        check_git_status
        create_backup
        update_code "$2"
        deploy
        health_check
        cleanup
        ;;
    deploy)
        create_backup
        deploy
        health_check
        ;;
    rollback)
        rollback "$2"
        ;;
    backup)
        create_backup
        ;;
    status)
        status
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
