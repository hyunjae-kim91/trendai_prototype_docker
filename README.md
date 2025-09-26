# TrendAI Prototype Docker 배포

이 프로젝트는 TrendAI Prototype을 Docker Compose를 사용하여 리눅스 환경에서 배포하는 설정입니다.

## 🚀 주요 기능

- **그린/블루 무중단 배포**: 서비스 중단 없이 새 버전 배포
- **Nginx 프록시**: 80포트로 HTTP 접속 가능
- **Redis 캐싱**: 성능 최적화를 위한 Redis 포함
- **헬스체크**: 자동 서비스 상태 모니터링
- **자동 롤백**: 배포 실패 시 자동 이전 버전으로 복구

## 📋 사전 요구사항

- Docker 20.10+
- Docker Compose 2.0+
- 리눅스 환경 (Ubuntu 20.04+ 권장)
- AWS RDS PostgreSQL 데이터베이스

## ⚙️ 설정

### 1. 환경 변수 설정

```bash
# env.example을 복사하여 .env 파일 생성
cp env.example .env

# .env 파일 편집
nano .env
```

`.env` 파일에 다음 정보를 입력하세요:

```env
# 데이터베이스 설정
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=trendai_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis 설정
REDIS_URL=redis://redis:6379

# 애플리케이션 설정
NODE_ENV=production
REACT_APP_API_URL=http://localhost/api
```

### 2. 배포 스크립트 권한 설정

```bash
chmod +x deploy.sh
```

## 🚀 배포 방법

### 첫 배포

```bash
./deploy.sh deploy
```

### 무중단 배포 (업데이트)

```bash
./deploy.sh deploy
```

### 서비스 상태 확인

```bash
./deploy.sh status
```

### 로그 확인

```bash
# 모든 서비스 로그
./deploy.sh logs

# 특정 서비스 로그
./deploy.sh logs backend-green
./deploy.sh logs frontend-blue
./deploy.sh logs nginx
```

### 서비스 중지

```bash
./deploy.sh stop
```

### 정리

```bash
./deploy.sh cleanup
```

## 🏗️ 아키텍처

```
┌─────────────────┐
│   Nginx (80)    │
│   (Load Balancer)│
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐
│ Green │   │ Blue  │
│ Env   │   │ Env   │
└───┬───┘   └───┬───┘
    │           │
┌───▼───┐   ┌───▼───┐
│Backend│   │Backend│
│:8001  │   │:8001  │
└───┬───┘   └───┬───┘
    │           │
┌───▼───┐   ┌───▼───┐
│Frontend│  │Frontend│
│ :80   │   │ :80   │
└───────┘   └───────┘
    │           │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │   Redis   │
    │   :6379   │
    └───────────┘
```

## 🔧 서비스 구성

### Backend (FastAPI)
- **포트**: 8001 (내부)
- **기능**: API 서버, 데이터베이스 연결
- **헬스체크**: `/health` 엔드포인트

### Frontend (React)
- **포트**: 80 (내부)
- **기능**: 웹 애플리케이션
- **빌드**: 프로덕션 최적화된 정적 파일

### Nginx
- **포트**: 80 (외부)
- **기능**: 리버스 프록시, 로드 밸런싱
- **캐싱**: 정적 파일 캐싱, Gzip 압축

### Redis
- **포트**: 6379 (내부)
- **기능**: 캐싱, 세션 저장
- **영속성**: AOF (Append Only File) 활성화

## 🔄 무중단 배포 과정

1. **현재 상태 확인**: Green 또는 Blue 환경 중 활성 환경 파악
2. **이미지 빌드**: 새로운 Docker 이미지 빌드
3. **대상 환경 시작**: 비활성 환경에 새 버전 배포
4. **헬스체크**: 새 환경의 정상 동작 확인
5. **트래픽 전환**: Nginx 설정 업데이트로 트래픽 전환
6. **안정화 대기**: 30초 대기 후 이전 환경 중지
7. **롤백 준비**: 실패 시 자동 이전 버전으로 복구

## 🐛 문제 해결

### 포트 충돌
```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :6379

# 프로세스 종료
sudo kill -9 <PID>
```

### Docker 리소스 부족
```bash
# 사용하지 않는 리소스 정리
./deploy.sh cleanup

# Docker 시스템 정리
docker system prune -a
```

### 데이터베이스 연결 오류
- `.env` 파일의 데이터베이스 설정 확인
- AWS RDS 보안 그룹에서 포트 5432 허용 확인
- 데이터베이스 인스턴스 상태 확인

### 메모리 부족
```bash
# Docker 메모리 제한 확인
docker stats

# 스왑 메모리 활성화 (필요시)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📊 모니터링

### 서비스 상태 확인
```bash
# 전체 서비스 상태
./deploy.sh status

# 특정 서비스 로그
./deploy.sh logs nginx
```

### 리소스 사용량 확인
```bash
# Docker 컨테이너 리소스 사용량
docker stats

# 시스템 리소스 사용량
htop
```

## 🔒 보안 고려사항

- 환경 변수 파일 (`.env`)은 절대 버전 관리에 포함하지 마세요
- 프로덕션 환경에서는 HTTPS 설정을 고려하세요
- 방화벽 설정으로 필요한 포트만 열어두세요
- 정기적인 보안 업데이트를 수행하세요

## 📝 로그 위치

- **Nginx 로그**: `/var/log/nginx/` (컨테이너 내부)
- **애플리케이션 로그**: `docker-compose logs`
- **시스템 로그**: `/var/log/syslog`

## 🤝 지원

문제가 발생하면 다음을 확인하세요:

1. `.env` 파일 설정이 올바른지 확인
2. Docker 및 Docker Compose 버전 확인
3. 시스템 리소스 (메모리, 디스크) 확인
4. 네트워크 연결 상태 확인

추가 도움이 필요하면 로그를 확인하고 문제 상황을 기록해주세요.