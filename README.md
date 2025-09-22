# TrendAI Prototype

AI 트렌드 분석 플랫폼 프로토타입

## 프로젝트 구조

```
trendai_prototype/
├── backend/                 # Python FastAPI 백엔드
│   ├── main.py             # 메인 애플리케이션
│   └── requirements.txt    # Python 의존성
├── frontend/               # React 프론트엔드
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js          # 메인 컴포넌트
│   │   ├── App.css         # 스타일
│   │   ├── index.js        # 진입점
│   │   └── index.css       # 글로벌 스타일
│   └── package.json        # Node.js 의존성
└── README.md
```

## 개발 환경 설정

### 백엔드 실행

```bash
# 백엔드 디렉토리로 이동
cd backend

# 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```

백엔드는 `http://localhost:8000`에서 실행됩니다.

### 프론트엔드 실행

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

프론트엔드는 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

- `GET /` - 기본 메시지
- `GET /health` - 헬스 체크

## 기술 스택

- **Frontend**: React 18, Axios
- **Backend**: FastAPI, Uvicorn
- **개발 도구**: Create React App, Python 3.8+
