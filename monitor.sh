#!/bin/bash

# TrendAI Prototype 모니터링 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1"
}

# 시스템 리소스 확인
check_system_resources() {
    log_info "시스템 리소스 확인 중..."
    
    # CPU 사용률
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    log_metric "CPU 사용률: ${cpu_usage}%"
    
    # 메모리 사용률
    memory_info=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    log_metric "메모리 사용률: ${memory_info}"
    
    # 디스크 사용률
    disk_usage=$(df -h / | awk 'NR==2{print $5}')
    log_metric "디스크 사용률: ${disk_usage}"
    
    # 로드 평균
    load_avg=$(uptime | awk -F'load average:' '{print $2}')
    log_metric "로드 평균: ${load_avg}"
}

# Docker 리소스 확인
check_docker_resources() {
    log_info "Docker 리소스 확인 중..."
    
    # 실행 중인 컨테이너 수
    container_count=$(docker ps -q | wc -l)
    log_metric "실행 중인 컨테이너: ${container_count}개"
    
    # Docker 이미지 수
    image_count=$(docker images -q | wc -l)
    log_metric "Docker 이미지: ${image_count}개"
    
    # Docker 볼륨 사용량
    volume_size=$(docker system df -v | grep "Local Volumes" | awk '{print $3}' || echo "N/A")
    log_metric "Docker 볼륨 크기: ${volume_size}"
    
    # 컨테이너별 리소스 사용량
    echo ""
    log_info "컨테이너별 리소스 사용량:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 서비스 상태 확인
check_services() {
    log_info "서비스 상태 확인 중..."
    
    # Docker Compose 서비스 상태
    echo ""
    log_info "Docker Compose 서비스 상태:"
    docker-compose ps
    
    # 서비스별 헬스체크
    echo ""
    log_info "서비스 헬스체크:"
    
    # Nginx 헬스체크
    if curl -f -s "http://localhost/health" > /dev/null 2>&1; then
        log_success "Nginx: 정상"
    else
        log_error "Nginx: 오류"
    fi
    
    # API 헬스체크
    if curl -f -s "http://localhost/api/health" > /dev/null 2>&1; then
        log_success "API: 정상"
    else
        log_error "API: 오류"
    fi
    
    # Redis 헬스체크
    if docker exec trendai_redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis: 정상"
    else
        log_error "Redis: 오류"
    fi
}

# 네트워크 상태 확인
check_network() {
    log_info "네트워크 상태 확인 중..."
    
    # 포트 사용 현황
    log_metric "포트 80 사용 중: $(netstat -tlnp | grep :80 | wc -l)개 프로세스"
    log_metric "포트 6379 사용 중: $(netstat -tlnp | grep :6379 | wc -l)개 프로세스"
    
    # 네트워크 연결 수
    connection_count=$(netstat -an | grep ESTABLISHED | wc -l)
    log_metric "활성 네트워크 연결: ${connection_count}개"
}

# 로그 확인
check_logs() {
    local service_name=${1:-""}
    local lines=${2:-50}
    
    if [ -n "$service_name" ]; then
        log_info "${service_name} 최근 로그 (${lines}줄):"
        docker-compose logs --tail="$lines" "$service_name"
    else
        log_info "전체 서비스 최근 로그 (${lines}줄):"
        docker-compose logs --tail="$lines"
    fi
}

# 실시간 모니터링
realtime_monitor() {
    local interval=${1:-5}
    
    log_info "실시간 모니터링 시작 (${interval}초 간격)..."
    log_info "종료하려면 Ctrl+C를 누르세요."
    
    while true; do
        clear
        echo "=== TrendAI Prototype 실시간 모니터링 ==="
        echo "시간: $(date)"
        echo ""
        
        check_system_resources
        echo ""
        check_docker_resources
        echo ""
        check_services
        echo ""
        check_network
        
        sleep "$interval"
    done
}

# 알림 설정
setup_alerts() {
    local email=${1:-""}
    local webhook=${2:-""}
    
    log_info "알림 설정 중..."
    
    # 이메일 알림 설정 (필요한 경우)
    if [ -n "$email" ]; then
        log_info "이메일 알림 설정: ${email}"
        # 실제 구현에서는 mail 명령어나 외부 서비스 사용
    fi
    
    # 웹훅 알림 설정 (필요한 경우)
    if [ -n "$webhook" ]; then
        log_info "웹훅 알림 설정: ${webhook}"
        # 실제 구현에서는 curl로 웹훅 호출
    fi
    
    log_success "알림 설정 완료"
}

# 성능 리포트 생성
generate_report() {
    local output_file=${1:-"monitor_report_$(date +%Y%m%d_%H%M%S).txt"}
    
    log_info "성능 리포트 생성 중... (${output_file})"
    
    {
        echo "=== TrendAI Prototype 성능 리포트 ==="
        echo "생성 시간: $(date)"
        echo ""
        
        echo "=== 시스템 리소스 ==="
        check_system_resources
        echo ""
        
        echo "=== Docker 리소스 ==="
        check_docker_resources
        echo ""
        
        echo "=== 서비스 상태 ==="
        check_services
        echo ""
        
        echo "=== 네트워크 상태 ==="
        check_network
        echo ""
        
        echo "=== 최근 에러 로그 ==="
        docker-compose logs --tail=100 | grep -i error || echo "에러 로그 없음"
        
    } > "$output_file"
    
    log_success "성능 리포트 생성 완료: ${output_file}"
}

# 도움말
help() {
    echo "TrendAI Prototype 모니터링 스크립트"
    echo ""
    echo "사용법: $0 [명령어] [옵션]"
    echo ""
    echo "명령어:"
    echo "  status     - 전체 상태 확인 (기본값)"
    echo "  resources  - 리소스 사용량만 확인"
    echo "  services   - 서비스 상태만 확인"
    echo "  network    - 네트워크 상태만 확인"
    echo "  logs       - 로그 확인 (서비스명 선택사항)"
    echo "  realtime   - 실시간 모니터링"
    echo "  report     - 성능 리포트 생성"
    echo "  alerts     - 알림 설정"
    echo "  help       - 도움말 표시"
    echo ""
    echo "옵션:"
    echo "  -s, --service  서비스명 (logs 명령어와 함께 사용)"
    echo "  -l, --lines    로그 줄 수 (기본값: 50)"
    echo "  -i, --interval 실시간 모니터링 간격 (기본값: 5초)"
    echo "  -o, --output   리포트 출력 파일명"
    echo "  -e, --email    이메일 주소 (알림 설정용)"
    echo "  -w, --webhook  웹훅 URL (알림 설정용)"
    echo ""
    echo "예시:"
    echo "  $0 status"
    echo "  $0 logs -s backend-green -l 100"
    echo "  $0 realtime -i 10"
    echo "  $0 report -o my_report.txt"
    echo "  $0 alerts -e admin@example.com"
}

# 메인 스크립트
case "${1:-status}" in
    status)
        check_system_resources
        echo ""
        check_docker_resources
        echo ""
        check_services
        echo ""
        check_network
        ;;
    resources)
        check_system_resources
        echo ""
        check_docker_resources
        ;;
    services)
        check_services
        ;;
    network)
        check_network
        ;;
    logs)
        service_name=""
        lines=50
        
        # 옵션 파싱
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                -s|--service)
                    service_name="$2"
                    shift 2
                    ;;
                -l|--lines)
                    lines="$2"
                    shift 2
                    ;;
                *)
                    shift
                    ;;
            esac
        done
        
        check_logs "$service_name" "$lines"
        ;;
    realtime)
        interval=5
        
        # 옵션 파싱
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                -i|--interval)
                    interval="$2"
                    shift 2
                    ;;
                *)
                    shift
                    ;;
            esac
        done
        
        realtime_monitor "$interval"
        ;;
    report)
        output_file=""
        
        # 옵션 파싱
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                -o|--output)
                    output_file="$2"
                    shift 2
                    ;;
                *)
                    shift
                    ;;
            esac
        done
        
        generate_report "$output_file"
        ;;
    alerts)
        email=""
        webhook=""
        
        # 옵션 파싱
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                -e|--email)
                    email="$2"
                    shift 2
                    ;;
                -w|--webhook)
                    webhook="$2"
                    shift 2
                    ;;
                *)
                    shift
                    ;;
            esac
        done
        
        setup_alerts "$email" "$webhook"
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
