import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 데이터베이스 설정
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "trendai_db"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "")
}

# SSL 및 연결 옵션 (선택 사항)
DB_SSL_MODE = os.getenv("DB_SSL_MODE")
if DB_SSL_MODE:
    DB_CONFIG["sslmode"] = DB_SSL_MODE

DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "5"))

PUBLIC_DB_CONFIG = {
    key: DB_CONFIG.get(key)
    for key in ("host", "port", "database", "user", "sslmode")
    if key in DB_CONFIG
}

# 연결 문자열 생성
def get_db_url():
    base_url = (
        f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@"
        f"{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    )
    if DB_SSL_MODE:
        return f"{base_url}?sslmode={DB_SSL_MODE}"
    return base_url
