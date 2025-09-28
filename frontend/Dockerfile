# Build stage
FROM node:18-alpine as build

WORKDIR /app

# package.json과 lock 파일 복사
COPY package*.json ./

# devDependencies 포함 (React 빌드에 필요)
RUN npm ci

# 소스 복사
COPY . .

# 빌드 시점 환경변수
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# React 빌드
RUN npm run build

# Production stage
FROM nginx:alpine

# 빌드 결과 복사
COPY --from=build /app/build /usr/share/nginx/html

# 커스텀 Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

# 실행
CMD ["nginx", "-g", "daemon off;"]
