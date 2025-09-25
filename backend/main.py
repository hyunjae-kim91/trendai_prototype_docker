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
            FROM ai_image_dm.instagram_tpo_keyword_master 
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
        # 간단한 테스트 쿼리
        cursor.execute("""
            SELECT COUNT(*) as total_count
            FROM ai_image_dm.instagram_web_mood_rate
        """)
        count_result = cursor.fetchone()
        print("총 데이터 개수:", count_result)
        
        # 데이터가 있으면 조회
        if count_result and count_result['total_count'] > 0:
            cursor.execute("""
                SELECT 
                    post_date,
                    category_l1,
                    category_l3,
                    mood_category,
                    mood_look,
                    pattern,
                    color,
                    detail_1,
                    s3_key
                FROM ai_image_dm.instagram_web_mood_rate 
                ORDER BY post_date DESC
            """)
        else:
            print("데이터가 없습니다.")
            result = []
        result = cursor.fetchall()
        
        # 딕셔너리로 변환
        data = [dict(row) for row in result]
        
        # 카테고리 정보 추출
        categories_main = list(set([item['category_l1'] for item in data if item['category_l1']]))
        categories_sub = list(set([item['category_l3'] for item in data if item['category_l3']]))
        
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

@app.get("/api/mood-style")
async def get_mood_style():
    """무드 센싱 가칭2 데이터 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 무드 스타일 데이터 조회 (필수 컬럼만)
        cursor.execute("""
            SELECT 
                desc_style,
                s3_thumbnail_key
            FROM ai_image_dm.instagram_web_mood_hashtags 
            WHERE desc_style IS NOT NULL 
            AND desc_style != '[]'::jsonb
            AND desc_style != 'null'
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
            "message": f"성공적으로 {len(data)}개의 무드 스타일 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "무드 스타일 데이터 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-color")
async def get_item_color():
    """아이템 센싱 컬러 데이터 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 아이템 컬러 데이터 조회
        cursor.execute("""
            SELECT 
                category_l1,
                category_l3,
                follower_count,
                post_date,
                post_year,
                post_month,
                color
            FROM ai_image_dm.instagram_classification_web_date_follow 
            WHERE color IS NOT NULL 
            AND color != ''
            AND color != 'null'
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
            "message": f"성공적으로 {len(data)}개의 아이템 컬러 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "아이템 컬러 데이터 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-pattern")
async def get_item_pattern():
    """아이템 센싱 패턴 데이터 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 아이템 패턴 데이터 조회
        cursor.execute("""
            SELECT 
                category_l1,
                category_l3,
                follower_count,
                post_date,
                post_year,
                post_month,
                pattern
            FROM ai_image_dm.instagram_classification_web_date_follow 
            WHERE pattern IS NOT NULL 
            AND pattern != ''
            AND pattern != 'null'
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
            "message": f"성공적으로 {len(data)}개의 아이템 패턴 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "아이템 패턴 데이터 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-detail")
async def get_item_detail():
    """아이템 센싱 디테일 데이터 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 아이템 디테일 데이터 조회
        cursor.execute("""
            SELECT 
                category_l1,
                category_l3,
                follower_count,
                post_date,
                post_year,
                post_month,
                detail_1
            FROM ai_image_dm.instagram_classification_web_date_follow 
            WHERE detail_1 IS NOT NULL 
            AND detail_1 != ''
            AND detail_1 != 'null'
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
            "message": f"성공적으로 {len(data)}개의 아이템 디테일 데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "아이템 디테일 데이터 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-type-categories")
async def get_item_type_categories():
    """아이템 타입 대분류 목록 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 대분류 목록 조회
        cursor.execute("""
            SELECT DISTINCT category_l1
            FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
            WHERE category_l1 IS NOT NULL
            ORDER BY category_l1
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
            "message": f"성공적으로 {len(data)}개의 대분류를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "대분류 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-type-meta")
async def get_item_type_meta():
    """아이템 타입 메타데이터 조회 API (연도/월 정보)"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 연도/월 데이터 조회
        cursor.execute("""
            SELECT DISTINCT post_year, post_month
            FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
            WHERE post_year IS NOT NULL AND post_month IS NOT NULL
            ORDER BY post_year DESC, post_month DESC
        """)
        result = cursor.fetchall()
        
        # 딕셔너리로 변환
        data = [dict(row) for row in result]
        
        # 연도와 월을 별도로 추출
        years = sorted(list(set([item['post_year'] for item in data if item['post_year']])))
        months = sorted(list(set([item['post_month'] for item in data if item['post_month']])))
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": data,
            "years": years,
            "months": months,
            "count": len(data),
            "message": f"성공적으로 {len(data)}개의 메타데이터를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "메타데이터 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-type-keywords")
async def get_item_type_keywords(
    category_l1: str = None,
    post_year: int = None,
    post_month: int = None,
    follower_count: int = None
):
    """아이템 타입 키워드 상위 10개 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # WHERE 조건 구성
        where_conditions = []
        params = []
        
        if category_l1:
            where_conditions.append("category_l1 = %s")
            params.append(category_l1)
        
        if post_year:
            where_conditions.append("post_year = %s")
            params.append(post_year)
            
        if post_month:
            where_conditions.append("post_month = %s")
            params.append(post_month)
            
        if follower_count:
            where_conditions.append("follower_count >= %s")
            params.append(follower_count)
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        # 현재 월 데이터 조회
        current_query = f"""
            SELECT 
                category_l3,
                COUNT(*) as count
            FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
            WHERE {where_clause}
            AND category_l3 IS NOT NULL
            AND category_l3 != ''
            GROUP BY category_l3
            ORDER BY count DESC
            LIMIT 10
        """
        
        cursor.execute(current_query, params)
        current_result = cursor.fetchall()
        
        # 전월 데이터 조회 (비교용) - 연도/월이 모두 있을 때만
        prev_data = {}
        if post_year and post_month:
            prev_month = post_month - 1 if post_month > 1 else 12
            prev_year = post_year if post_month > 1 else (post_year - 1)
            
            # 전월용 WHERE 조건 구성
            prev_where_conditions = []
            prev_params = []
            
            if category_l1:
                prev_where_conditions.append("category_l1 = %s")
                prev_params.append(category_l1)
            
            prev_where_conditions.append("post_year = %s")
            prev_params.append(prev_year)
            
            prev_where_conditions.append("post_month = %s")
            prev_params.append(prev_month)
                
            if follower_count:
                prev_where_conditions.append("follower_count >= %s")
                prev_params.append(follower_count)
            
            prev_where_clause = " AND ".join(prev_where_conditions)
            
            prev_query = f"""
                SELECT 
                    category_l3,
                    COUNT(*) as count
                FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
                WHERE {prev_where_clause}
                AND category_l3 IS NOT NULL
                AND category_l3 != ''
                GROUP BY category_l3
            """
            
            cursor.execute(prev_query, prev_params)
            prev_result = cursor.fetchall()
            
            # 전월 데이터를 딕셔너리로 변환
            prev_data = {row['category_l3']: row['count'] for row in prev_result}
        
        # 현재 데이터에 전월 대비 증감률 계산
        result_data = []
        for row in current_result:
            current_count = row['count']
            prev_count = prev_data.get(row['category_l3'], 0)
            
            if prev_count > 0:
                change_rate = ((current_count - prev_count) / prev_count) * 100
            else:
                change_rate = 100 if current_count > 0 else 0
            
            result_data.append({
                'category_l3': row['category_l3'],
                'count': current_count,
                'prev_count': prev_count,
                'change_rate': round(change_rate, 2)
            })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": result_data,
            "count": len(result_data),
            "message": f"성공적으로 {len(result_data)}개의 아이템 키워드를 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "아이템 키워드 조회 중 오류가 발생했습니다."
        }

@app.get("/api/item-type-items")
async def get_item_type_items(
    category_l3: str,
    category_l1: str = None,
    post_year: int = None,
    post_month: int = None,
    follower_count: int = None
):
    """선택된 아이템의 유형 상위 10개 조회 API"""
    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # WHERE 조건 구성
        where_conditions = ["category_l3 = %s"]
        params = [category_l3]
        
        if category_l1:
            where_conditions.append("category_l1 = %s")
            params.append(category_l1)
        
        if post_year:
            where_conditions.append("post_year = %s")
            params.append(post_year)
            
        if post_month:
            where_conditions.append("post_month = %s")
            params.append(post_month)
            
        if follower_count:
            where_conditions.append("follower_count >= %s")
            params.append(follower_count)
        
        where_clause = " AND ".join(where_conditions)
        
        # 현재 월 데이터 조회
        current_query = f"""
            SELECT 
                item_type,
                COUNT(*) as count
            FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
            WHERE {where_clause}
            AND item_type IS NOT NULL
            AND item_type != ''
            GROUP BY item_type
            ORDER BY count DESC
            LIMIT 10
        """
        
        cursor.execute(current_query, params)
        current_result = cursor.fetchall()
        
        # 전월 데이터 조회 (비교용) - 연도/월이 모두 있을 때만
        prev_data = {}
        if post_year and post_month:
            prev_month = post_month - 1 if post_month > 1 else 12
            prev_year = post_year if post_month > 1 else (post_year - 1)
            
            # 전월용 WHERE 조건 구성
            prev_where_conditions = ["category_l3 = %s"]
            prev_params = [category_l3]
            
            if category_l1:
                prev_where_conditions.append("category_l1 = %s")
                prev_params.append(category_l1)
            
            prev_where_conditions.append("post_year = %s")
            prev_params.append(prev_year)
            
            prev_where_conditions.append("post_month = %s")
            prev_params.append(prev_month)
                
            if follower_count:
                prev_where_conditions.append("follower_count >= %s")
                prev_params.append(follower_count)
            
            prev_where_clause = " AND ".join(prev_where_conditions)
            
            prev_query = f"""
                SELECT 
                    item_type,
                    COUNT(*) as count
                FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
                WHERE {prev_where_clause}
                AND item_type IS NOT NULL
                AND item_type != ''
                GROUP BY item_type
            """
            
            cursor.execute(prev_query, prev_params)
            prev_result = cursor.fetchall()
            
            # 전월 데이터를 딕셔너리로 변환
            prev_data = {row['item_type']: row['count'] for row in prev_result}
        
        # 현재 데이터에 전월 대비 증감률 계산
        result_data = []
        for row in current_result:
            current_count = row['count']
            prev_count = prev_data.get(row['item_type'], 0)
            
            if prev_count > 0:
                change_rate = ((current_count - prev_count) / prev_count) * 100
            else:
                change_rate = 100 if current_count > 0 else 0
            
            result_data.append({
                'item_type': row['item_type'],
                'count': current_count,
                'prev_count': prev_count,
                'change_rate': round(change_rate, 2)
            })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": result_data,
            "count": len(result_data),
            "message": f"성공적으로 {len(result_data)}개의 아이템 유형을 조회했습니다."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "아이템 유형 조회 중 오류가 발생했습니다."
        }

@app.get("/api/coordi-combination")
async def get_coordi_combination(
    item_type: str,
    main_category: str,
    post_year: int = None,
    post_month: int = None,
    follower_count: int = None
):
    """코디 조합 조회 API"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 1. 선택된 아이템 유형의 post_id들을 가져옴
        where_conditions = []
        params = []

        where_conditions.append("item_type = %s")
        params.append(item_type)

        where_conditions.append("category_l1 = %s")
        params.append(main_category)

        if post_year:
            where_conditions.append("post_year = %s")
            params.append(post_year)

        if post_month:
            where_conditions.append("post_month = %s")
            params.append(post_month)

        if follower_count:
            where_conditions.append("follower_count >= %s")
            params.append(follower_count)

        where_clause = " AND ".join(where_conditions)

        # 선택된 아이템의 post_id 조회
        post_ids_query = f"""
            SELECT DISTINCT post_id
            FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
            WHERE {where_clause}
            AND post_id IS NOT NULL
        """

        cursor.execute(post_ids_query, params)
        post_ids_result = cursor.fetchall()
        
        if not post_ids_result:
            return {
                "success": True,
                "data": {"left": [], "right": []},
                "message": "해당 조건에 맞는 데이터가 없습니다."
            }

        post_ids = [row['post_id'] for row in post_ids_result]
        post_ids_str = ','.join([f"'{pid}'" for pid in post_ids])

        # 2. 다른 대분류들 정의
        all_categories = ['상의', '아우터', '하의']
        other_categories = [cat for cat in all_categories if cat != main_category]
        
        if len(other_categories) < 2:
            return {
                "success": True,
                "data": {"left": [], "right": []},
                "message": "코디 조합을 위한 충분한 대분류가 없습니다."
            }

        # 3. 각 다른 대분류에서 코디 조합 아이템들 조회
        result_data = {"left": [], "right": []}
        
        for i, category in enumerate(other_categories):
            coordi_query = f"""
                SELECT
                    item_type,
                    COUNT(*) as count
                FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
                WHERE post_id IN ({post_ids_str})
                AND category_l1 = %s
                AND item_type IS NOT NULL
                AND item_type != ''
                GROUP BY item_type
                ORDER BY count DESC
                LIMIT 10
            """
            
            cursor.execute(coordi_query, [category])
            coordi_result = cursor.fetchall()
            
            coordi_data = [dict(row) for row in coordi_result]
            
            # left 또는 right에 할당
            if i == 0:
                result_data["left"] = coordi_data
            else:
                result_data["right"] = coordi_data

        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": result_data,
            "message": f"성공적으로 코디 조합을 조회했습니다. (상위 {len(result_data['left'])} + {len(result_data['right'])}개)"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "코디 조합 조회 중 오류가 발생했습니다."
        }

@app.get("/api/coordi-images")
async def get_coordi_images(
    item_type: str,
    main_category: str,
    post_year: int = None,
    post_month: int = None,
    follower_count: int = None,
    limit: int = 20,
    coordi_main_category: str = None,
    coordi_item_type: str = None
):
    """코디 조합 이미지 조회 API"""
    try:
        
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 코디 조합 필터링: 선택된 상의 + 클릭한 코디 아이템이 함께 있는 post_id들만 조회
        if coordi_main_category and coordi_item_type:
            
            # 1. 선택된 상의와 클릭한 코디 아이템이 모두 있는 post_id들을 찾기
            coordi_where_conditions = []
            coordi_params = []
            
            # 상의 조건
            coordi_where_conditions.append("category_l1 = %s")
            coordi_params.append(coordi_main_category)
            coordi_where_conditions.append("item_type = %s")
            coordi_params.append(coordi_item_type)
            
            # 코디 아이템 조건
            coordi_where_conditions.append("category_l1 = %s")
            coordi_params.append(main_category)
            coordi_where_conditions.append("item_type = %s")
            coordi_params.append(item_type)
            
            # 추가 필터 조건
            if post_year:
                coordi_where_conditions.append("post_year = %s")
                coordi_params.append(post_year)
            
            if post_month:
                coordi_where_conditions.append("post_month = %s")
                coordi_params.append(post_month)
            
            if follower_count:
                coordi_where_conditions.append("follower_count >= %s")
                coordi_params.append(follower_count)
            
            coordi_where_clause = " AND ".join(coordi_where_conditions)
            
            # 공통 post_id를 가진 레코드들 찾기 (연도/월 필터 포함)
            coordi_query = f"""
                SELECT DISTINCT a.post_id
                FROM ai_image_dm.instagram_classification_web_date_follow_itemtype a
                INNER JOIN ai_image_dm.instagram_classification_web_date_follow_itemtype b 
                ON a.post_id = b.post_id
                WHERE a.category_l1 = %s AND a.item_type = %s
                AND b.category_l1 = %s AND b.item_type = %s
            """
            
            coordi_params_simple = [coordi_main_category, coordi_item_type, main_category, item_type]
            
            # 연도/월/팔로워 필터 추가
            if post_year:
                coordi_query += " AND a.post_year = %s"
                coordi_params_simple.append(post_year)
            if post_month:
                coordi_query += " AND a.post_month = %s"
                coordi_params_simple.append(post_month)
            if follower_count:
                coordi_query += " AND a.follower_count >= %s"
                coordi_params_simple.append(follower_count)
            
            cursor.execute(coordi_query, coordi_params_simple)
            coordi_result = cursor.fetchall()
            
            if not coordi_result:
                return {
                    "success": True,
                    "data": [],
                    "count": 0,
                    "message": f"'{coordi_item_type}'와 '{item_type}'이 함께 찍힌 사진이 없습니다."
                }
            
            coordi_post_ids = [row['post_id'] for row in coordi_result]
            coordi_post_ids_str = ','.join([f"'{pid}'" for pid in coordi_post_ids])
            
            # 2. 해당 post_id들 중에서 요청된 코디 아이템의 이미지들만 조회
            where_conditions = []
            params = []
            
            where_conditions.append(f"post_id IN ({coordi_post_ids_str})")
            where_conditions.append("item_type = %s")
            params.append(item_type)
            where_conditions.append("category_l1 = %s")
            params.append(main_category)
            
        else:
            # 기존 로직 (코디 조합 필터링이 없는 경우)
            where_conditions = []
            params = []

            where_conditions.append("item_type = %s")
            params.append(item_type)

            where_conditions.append("category_l1 = %s")
            params.append(main_category)

            if post_year:
                where_conditions.append("post_year = %s")
                params.append(post_year)

            if post_month:
                where_conditions.append("post_month = %s")
                params.append(post_month)

            if follower_count:
                where_conditions.append("follower_count >= %s")
                params.append(follower_count)

        where_clause = " AND ".join(where_conditions)

        # s3_key가 있는 이미지들 조회
        images_query = f"""
            SELECT DISTINCT s3_key, post_id, category_l3, item_type, follower_count
            FROM ai_image_dm.instagram_classification_web_date_follow_itemtype
            WHERE {where_clause}
            AND s3_key IS NOT NULL
            AND s3_key != ''
            ORDER BY follower_count DESC
            LIMIT %s
        """

        params.append(limit)
        cursor.execute(images_query, params)
        result = cursor.fetchall()

        # 결과 데이터 정리
        image_data = []
        for row in result:
            image_data.append({
                's3_key': row['s3_key'],
                'post_id': row['post_id'],
                'category_l3': row['category_l3'],
                'item_type': row['item_type'],
                'follower_count': row['follower_count']
            })

        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": image_data,
            "count": len(image_data),
            "message": f"성공적으로 {len(image_data)}개의 이미지를 조회했습니다."
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "이미지 조회 중 오류가 발생했습니다."
        }

if __name__ == "__main__":
    import uvicorn
    print("🚀 서버 시작 중...")
    print("📡 API 문서: http://localhost:8001/docs")
    print("🔗 테스트 API: http://localhost:8001/api/test-db")
    print("🔗 무드 키워드 API: http://localhost:8001/api/mood-keywords")
    print("🔗 무드 레이트 API: http://localhost:8001/api/mood-rate")
    uvicorn.run(app, host="0.0.0.0", port=8001)
