# Build stage
FROM node:18-alpine as build

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 환경 변수 설정 (빌드 시점에 주입)
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# React 앱 빌드
RUN npm run build

# Production stage
FROM nginx:alpine

# 빌드된 파일을 nginx 서빙 디렉토리로 복사
COPY --from=build /app/build /usr/share/nginx/html

# nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]
