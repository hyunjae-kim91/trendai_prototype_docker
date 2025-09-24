from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG, get_db_url

app = FastAPI(title="TrendAI Prototype API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PostgreSQL 연결 테스트 함수
def test_db_connection():
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 테스트 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_table (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                value INTEGER
            )
        ''')
        
        # 테스트 데이터 삽입 (UPSERT)
        cursor.execute("""
            INSERT INTO test_table (id, name, value) 
            VALUES (1, '테스트', 100)
            ON CONFLICT (id) 
            DO UPDATE SET name = EXCLUDED.name, value = EXCLUDED.value
        """)
        conn.commit()
        
        # 실제 데이터 조회
        cursor.execute("""
            SELECT hashtags_str 
            FROM llm_poc.temp_style 
            WHERE desc_style != '[]'::jsonb 
            LIMIT 10
        """)
        result = cursor.fetchall()
        
        # 딕셔너리로 변환
        data = [dict(row) for row in result]
        
        cursor.close()
        conn.close()
        return {
            "success": True, 
            "data": data, 
            "count": len(data),
            "message": f"성공적으로 {len(data)}개의 해시태그 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False, 
            "error": str(e), 
            "config": DB_CONFIG,
            "message": "데이터베이스 연결 또는 쿼리 실행 중 오류가 발생했습니다."
        }

@app.get("/")
async def root():
    return {"message": "TrendAI Prototype API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/test-db")
async def test_db():
    """DB 연결 테스트 API"""
    result = test_db_connection()
    return result

@app.get("/api/mood-keywords")
async def get_mood_keywords():
    """무드 센싱 키워드 데이터 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 무드 키워드 데이터 조회
        cursor.execute("""
            SELECT DISTINCT keyword_cate1, keyword_cate2, tag_norm
            FROM llm_poc.tpo_keyword_mst 
            WHERE keyword_cate1 IS NOT NULL 
            AND keyword_cate2 IS NOT NULL
            ORDER BY keyword_cate1, keyword_cate2
        """)
        result = cursor.fetchall()
        
        # 딕셔너리로 변환
        data = [dict(row) for row in result]
        
        # 카테고리별로 그룹화
        categories = {}
        for item in data:
            cate1 = item['keyword_cate1']
            cate2 = item['keyword_cate2']
            
            if cate1 not in categories:
                categories[cate1] = {}
            if cate2 not in categories[cate1]:
                categories[cate1][cate2] = []
            
            categories[cate1][cate2].append(item['tag_norm'])
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": data,
            "categories": categories,
            "count": len(data),
            "message": f"성공적으로 {len(data)}개의 무드 키워드 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "무드 키워드 데이터 조회 중 오류가 발생했습니다."
        }

@app.get("/api/mood-rate")
async def get_mood_rate():
    """무드 센싱 가칭1 데이터 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 무드 레이트 데이터 조회
        cursor.execute("""
            SELECT 
                date_posted,
                category_main,
                category_sub,
                mood_category,
                mood_look,
                pattern,
                color,
                detail1,
                thumbnail_s3_url
            FROM llm_poc.mood_rate 
            WHERE date_posted IS NOT NULL
            ORDER BY date_posted DESC
        """)
        result = cursor.fetchall()
        
        # 딕셔너리로 변환
        data = [dict(row) for row in result]
        
        # 카테고리 정보 추출
        categories_main = list(set([item['category_main'] for item in data if item['category_main']]))
        categories_sub = list(set([item['category_sub'] for item in data if item['category_sub']]))
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": data,
            "categories_main": categories_main,
            "categories_sub": categories_sub,
            "count": len(data),
            "message": f"성공적으로 {len(data)}개의 무드 레이트 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "무드 레이트 데이터 조회 중 오류가 발생했습니다."
        }

if __name__ == "__main__":
    import uvicorn
    print("🚀 서버 시작 중...")
    print("📡 API 문서: http://localhost:8001/docs")
    print("🔗 테스트 API: http://localhost:8001/api/test-db")
    print("🔗 무드 키워드 API: http://localhost:8001/api/mood-keywords")
    print("🔗 무드 레이트 API: http://localhost:8001/api/mood-rate")
    uvicorn.run(app, host="0.0.0.0", port=8001)
