<div align="center">

# LongRun Coach Dashboard

### AI 기반 선수 컨디션 모니터링 & 코칭 플랫폼

[![Live Demo](https://img.shields.io/badge/라이브_데모-Railway-blueviolet?style=for-the-badge)](https://longrun-coach-dashboard-production.up.railway.app/pages/onboarding.html)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES2024-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-Injury_Prediction-EC4E20?style=for-the-badge)](https://xgboost.readthedocs.io)

<br/>

**Apple Watch 워치 데이터** 기반으로 선수의 컨디션을 실시간 모니터링하고,<br/>
**Knowledge Graph + LLM** 파이프라인으로 논문 근거 기반 코칭 조언을 제공합니다.

<br/>

[![Play Now](assets/playnow.gif)](https://longrun-coach-dashboard-production.up.railway.app/pages/onboarding.html)

<br/>

<img src="assets/onboarding.gif" width="250" alt="온보딩"> &nbsp; <img src="assets/dashboard.gif" width="250" alt="대시보드"> &nbsp; <img src="assets/chatbot.gif" width="250" alt="AI 챗봇">

</div>

---

## How It Works

```mermaid
flowchart LR
    A["⌚ Apple Watch"] -->|HealthKit| B["📱 선수 앱"]
    B -->|POST /api/watch-data| C["⚙️ FastAPI"]
    C -->|MySQL| D[("🗄️ DB")]
    D --> E["📊 코치 대시보드"]
    E -->|질문| F["🤖 KG + LLM"]
    F -->|근거 기반 답변| E
```

| 구성요소 | 역할 |
|:---:|:---|
| ⌚ Apple Watch | HR, HRV, SpO2, 걸음 수, 수면, 소음 등 15개 지표 수집 |
| 📱 선수 앱 | 워치 데이터 업로드 + 컨디션/부상/훈련 기록 |
| ⚙️ FastAPI | 39개 REST API + SSE 스트리밍 |
| 🗄️ MySQL | 선수 데이터 + Knowledge Graph (156 논문, 1,001 트리플) |
| 📊 대시보드 | 실시간 선수 모니터링 + 상세 분석 |
| 🤖 KG + LLM | 그래프 탐색 → 논문 근거 → AI 답변 (멀티턴) |

---

## 핵심 기능

<div align="center">
<img src="assets/mid.gif" width="90%" alt="선수 상세 분석 + AI 챗봇 멀티턴">
</div>

<br/>

### 1. 실시간 선수 모니터링

선수별 **워치 데이터 + 컨디션 점수 + 부상 위험도**를 한 화면에 표시합니다.

| 지표 | 출처 | 설명 |
|:---:|:---:|:---|
| HR / RHR | Apple Watch | 심박수 / 안정시 심박수 |
| HRV | Apple Watch | 심박변이도 — 회복 상태 바이오마커 |
| SpO2 | Apple Watch | 혈중 산소포화도 |
| Steps | Apple Watch | 걸음 수 |
| Sleep | Apple Watch | 수면 시간 |
| ACWR | 자동 계산 | 급성:만성 부하 비율 — 부상 위험 지표 |
| Score | 자동 계산 | 종합 컨디션 점수 (0~100) |
| Pain | 선수 입력 | 통증 수준 (0~10) |

- 🟢 양호 (score ≥ 60) / 🟡 주의 (40~59) / 🔴 위험 (< 40)
- 선수 카드 클릭 → 주간/월간/일별 상세 분석 패널

### 2. AI 코칭 챗봇 — KG 그래프 탐색 + LLM

> [!TIP]
> 자연어로 질문하면 **156편 스포츠 과학 논문의 Knowledge Graph**를 탐색하고,
> 근거 기반으로 답변합니다. 모든 참고 논문은 DOI 링크로 제공됩니다.

```mermaid
flowchart TD
    A["코치 질문"] --> B["KG 그래프 탐색"]

    subgraph KG["Knowledge Graph — MySQL"]
        C1["483 Concepts"]
        C2["1,001 Triples\nsubject → relation → object"]
        C3["352 Findings\nevidence + p-value"]
        C4["156 Papers\ntitle + DOI"]
        C1 --> C2
        C2 --> C3
        C3 --> C4
    end

    B --> KG
    KG --> D["LLM 1회\nSSE 스트리밍"]
    D --> E["규칙 필터\n의학적 수치 차단"]
    E --> F["코치에게 답변\n+ 📚 논문 참고문헌"]
```

**파이프라인 특징:**

| 항목 | 설명 |
|:---|:---|
| LLM 호출 | **1회**/질문 (google/gemini-2.5-flash-lite) |
| 응답 방식 | SSE 스트리밍 (토큰 단위 실시간) |
| 멀티턴 | DB 저장 — 10턴 유지, 재배포 후에도 보존 |
| 일상 대화 | 자동 감지 → 논문 스킵 |
| 환각 방지 | 프롬프트 + regex + 규칙 필터 (의학적 수치/처방 차단) |
| 논문 검색 | 랜덤이 아닌 **그래프 탐색** (concepts → triples → papers) |

### 3. 부상 예측 — XGBoost

**워치 데이터 + 컨디션 데이터**를 입력으로 부상 위험도를 예측합니다.

| 모델 | 종류 | 용도 |
|:---|:---|:---|
| endurance_model | XGBoost | 지구력 종목 (마라톤, 철인3종) |
| mixed_model | XGBoost | 혼합 종목 (축구, 농구) |
| general_model | XGBoost | 범용 |

### 4. 워치 데이터 수신 — 15개 지표 자동 수집

```mermaid
flowchart LR
    A["⌚ Apple Watch"] --> B["📱 iPhone\nHealthKit"]
    B --> C["POST /api/watch-data"]
    C --> D["컨디션 점수\n자동 계산"]
    C --> E["watch_records\n15개 지표 저장"]
    D --> F["conditions\nACWR + score"]
```

| 지표 | 필드명 |
|:---|:---|
| 심박수 | heart_rate |
| 안정시 심박수 | resting_heart_rate |
| 걷기 심박수 | walking_heart_rate |
| 심박변이도 | hrv |
| 혈중 산소포화도 | blood_oxygen |
| 걸음 수 | steps |
| 이동 거리 | distance_km |
| 활동 칼로리 | active_calories |
| 기초대사 칼로리 | basal_calories |
| 운동 시간 | exercise_minutes |
| 서있는 시간 | stand_minutes |
| 오른 층 수 | flights_climbed |
| 수면 시간 | sleep_hours |
| 환경 소음 | env_audio_db |
| 이어폰 음량 | headphone_audio_db |

---

## Architecture

```mermaid
graph TB
    subgraph client["클라이언트 — Browser"]
        ON["온보딩"]
        LG["로그인 / 회원가입"]
        TS["팀 설정"]
        DB["대시보드\n선수 모니터링"]
        DP["상세 패널\n주간/월간/일별"]
        CB["AI 챗봇\nKG + LLM"]
        FAB["FAB 버튼\n드래그 가능"]
    end

    subgraph server["FastAPI — Railway"]
        AUTH["/api/auth/*"]
        COACH["/api/coach/players"]
        WATCH["/api/watch-data"]
        KG_CHAT["/api/kg/coach-chat\n/stream"]
        PREDICT["/api/predict"]
        CRUD["/api/conditions\n/injuries\n/workouts\n/todos\n..."]
    end

    subgraph database["MySQL — Railway"]
        T1[(users)]
        T2[(watch_records)]
        T3[(conditions)]
        T4[(kg_papers\nkg_triples\nkg_concepts\nkg_findings)]
        T5[(injuries\nworkouts\ntraining_logs\n...)]
    end

    subgraph ml["ML Models"]
        XGB["XGBoost\nendurance / mixed / general"]
    end

    client -->|HTTPS| server
    server --> database
    server --> ml
    CB -->|SSE| KG_CHAT

    style client fill:#1a1a2e,color:#fff
    style server fill:#16213e,color:#fff
    style database fill:#0f3460,color:#fff
    style ml fill:#533483,color:#fff
```

---

## Tech Stack

| 분류 | 기술 | 용도 |
|:---|:---|:---|
| **프론트엔드** | Vanilla JavaScript | Class 기반 11개 모듈 |
| | CSS | 10개 모듈 (tokens + 페이지별 + 컴포넌트별) |
| **백엔드** | FastAPI | 39개 REST API + SSE 스트리밍 |
| | Uvicorn | ASGI 서버 |
| | SQLAlchemy | ORM |
| | PyMySQL | MySQL 드라이버 |
| | httpx | BizRouter LLM API 비동기 호출 |
| **AI / ML** | Knowledge Graph | 156 논문, 1,001 트리플, 483 개념, 352 발견 |
| | BizRouter API | LLM 게이트웨이 (gemini-2.5-flash-lite) |
| | XGBoost | 부상 예측 모델 (3종) |
| **DB** | MySQL 8.0 | Railway 호스팅 |
| **인프라** | Railway | 배포 (Docker) |

---

## Project Structure

```
longrun-coach-dashboard/
├── Dockerfile
├── backend/
│   ├── main.py              # FastAPI — 39개 API + KG 챗봇 + SSE
│   ├── database.py          # SQLAlchemy 엔진
│   ├── models.py            # ORM 모델
│   ├── schemas.py           # Pydantic 스키마
│   ├── crypto_utils.py      # 비밀번호 해싱
│   ├── predictor.py         # XGBoost 부상 예측
│   ├── requirements.txt
│   └── ml/                  # XGBoost 모델 (JSON + Scaler)
│       ├── endurance_model.json
│       ├── general_model.json
│       └── mixed_model.json
├── pages/                   # HTML 6개
│   ├── index.html           # → onboarding 리다이렉트
│   ├── onboarding.html      # 온보딩 슬라이드
│   ├── login.html           # 로그인
│   ├── signup.html          # 회원가입
│   ├── team-setup.html      # 팀 설정
│   └── dashboard.html       # 메인 대시보드
└── src/
    ├── css/                 # CSS 10개 모듈
    │   ├── tokens.css       # 디자인 토큰 (색상, 리셋)
    │   ├── dashboard-*.css  # 대시보드 (layout, chat, detail, fab, responsive)
    │   └── *.css            # 페이지별 (login, signup, onboarding, team-setup)
    └── js/                  # JS 11개 Class 모듈
        ├── ChatBot.js       # AI 챗봇 (SSE 스트리밍 + 폴백)
        ├── TeamManager.js   # 팀 관리 + 선수 카드 렌더링
        ├── DetailPanel.js   # 주간/월간/일별 상세 분석
        ├── DraggableFab.js  # 드래그 가능한 FAB
        ├── DdayManager.js   # D-Day 관리
        ├── SettingsManager.js
        ├── LoginApp.js
        ├── SignupApp.js
        ├── OnboardingApp.js
        ├── TeamSetupApp.js
        └── utils.js         # 공유 유틸리티
```

---

## Setup

```bash
# 1. 클론
git clone https://github.com/Technoetic/longrun-coach-dashboard.git
cd longrun-coach-dashboard

# 2. 의존성 설치
pip install -r backend/requirements.txt

# 3. 환경 변수 설정
export DATABASE_URL="mysql+pymysql://user:pass@host:port/db"
export BIZROUTER_API_KEY="your-key"
export SECRET_KEY="your-secret"

# 4. 서버 실행
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

| Env | Required | Description |
|:---|:---:|:---|
| `DATABASE_URL` | ✓ | MySQL 연결 URL |
| `BIZROUTER_API_KEY` | ✓ | LLM API 키 (BizRouter) |
| `SECRET_KEY` | ✓ | JWT 시크릿 |
| `PORT` | | 서버 포트 (기본 8000) |

> [!IMPORTANT]
> `DATABASE_URL`과 `BIZROUTER_API_KEY`가 없으면 선수 데이터 조회와 AI 챗봇이 동작하지 않습니다.

---

## API Overview

<details>
<summary><b>39개 엔드포인트 전체 목록</b></summary>

| 메서드 | 경로 | 기능 |
|:---|:---|:---|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT) |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/user/me` | 내 프로필 |
| PATCH | `/api/user/me` | 프로필 수정 |
| GET | `/api/coach/players` | 전체 선수 데이터 (워치 + 컨디션) |
| POST | `/api/watch-data` | 워치 데이터 수신 (15개 지표) |
| GET | `/api/bio-data` | 최근 7일 생체 데이터 |
| POST | `/api/kg/coach-chat` | AI 챗봇 (KG + LLM) |
| POST | `/api/kg/coach-chat/stream` | AI 챗봇 SSE 스트리밍 |
| POST | `/api/kg/chat` | 선수용 챗봇 (인증 필요) |
| POST | `/api/predict` | 부상 예측 (XGBoost) |
| POST/GET | `/api/conditions` | 컨디션 기록 |
| POST/GET | `/api/injuries` | 부상 기록 |
| POST/GET | `/api/workouts` | 운동 기록 |
| POST/GET | `/api/training-logs` | 훈련 일지 |
| POST/GET/DELETE | `/api/schedules` | 스케줄 관리 |
| POST/GET/PATCH/DELETE | `/api/todos` | 할 일 관리 |
| GET/PATCH | `/api/notifications` | 알림 설정 |
| POST/GET | `/api/menstrual-cycles` | 월경 주기 |
| POST/GET | `/api/messages` | 메시지 |
| POST | `/api/children/connect` | 자녀 연결 |
| GET | `/api/children` | 자녀 목록 |
| GET | `/api/health` | 헬스체크 |

</details>

---

## 팀 소개

<div align="center">
<img src="assets/team.gif" width="90%" alt="Team LongRun"/>
</div>

<table>
<tr align="center" valign="top">
<td width="20%">
<a href="https://github.com/junhyeonkim92-oscar">
<img src="https://github.com/junhyeonkim92-oscar.png" width="100" style="border-radius:50%"/><br/>
<b>김준현</b>
</a><br/>
프로젝트 총괄<br/>
도메인 지식 (스포츠 의학/과학)<br/>
데이터셋 확보 및 AI 모델링
</td>
<td width="20%">
<a href="https://github.com/Technoetic">
<img src="https://github.com/Technoetic.png" width="100" style="border-radius:50%"/><br/>
<b>전문준</b>
</a><br/>
LLM 파이프라인 구축<br/>
백엔드/DB 설계
</td>
<td width="20%">
<a href="https://github.com/musclepark">
<img src="https://github.com/musclepark.png" width="100" style="border-radius:50%"/><br/>
<b>박형민</b>
</a><br/>
앱 프론트 UI/UX<br/>
논문 DB 전처리<br/>
프롬프트 엔지니어링
</td>
<td width="20%">
<a href="https://github.com/ssohk26">
<img src="https://github.com/ssohk26.png" width="100" style="border-radius:50%"/><br/>
<b>소혜경</b>
</a><br/>
통합 테스트 시나리오 설계<br/>
UX 사용성 검증 및 피드백 루프<br/>
크로스 브라우저 호환성 점검
</td>
<td width="20%">
<a href="https://github.com/kyj415876">
<img src="https://github.com/kyj415876.png" width="100" style="border-radius:50%"/><br/>
<b>김유진</b>
</a><br/>
데이터 시각화 컴포넌트 설계<br/>
프레젠테이션 스토리보드 기획<br/>
디자인 에셋 및 인포그래픽
</td>
</tr>
</table>

---

<div align="center">

<img src="assets/footer.gif" width="90%" alt="대시보드 데스크톱 전체 뷰"/>

<br/>

**스포츠 코칭 커뮤니티를 위해 제작되었습니다**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app)

</div>
