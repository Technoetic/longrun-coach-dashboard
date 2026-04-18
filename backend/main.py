import os
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, Response, Cookie, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session

# Local imports
from database import engine, get_db, Base
from models import (
    User, Condition, MenstrualCycle, Workout, Injury,
    Todo, NotificationSetting, Team, TrainingLog, Schedule,
    ParentChild, Message, WatchRecord
)
from schemas import (
    UserCreate, UserResponse, UserUpdate,
    ConditionCreate, ConditionResponse,
    MenstrualCycleCreate, MenstrualCycleResponse,
    WorkoutCreate, WorkoutResponse,
    InjuryCreate, InjuryResponse,
    TodoCreate, TodoResponse, TodoUpdate,
    NotificationSettingResponse, NotificationSettingUpdate,
    TrainingLogCreate, TrainingLogResponse,
    ScheduleCreate, ScheduleResponse,
    Token
)

# Environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

COOKIE_NAME = "longrun_token"
COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_DAYS * 86400  # 7일 (초)

# Initialize FastAPI app
app = FastAPI(title="Health Tracking API", version="1.0.0")

_default_origins = [
    "https://longrun-coach-dashboard-production.up.railway.app",
    "https://longrun-athlete-frontend-production.up.railway.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
]
_env_origins = os.getenv("FRONTEND_ORIGIN", "")
_allowed_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] or _default_origins
if _env_origins and set(_default_origins) - set(_allowed_origins):
    _allowed_origins = list({*_allowed_origins, *_default_origins})

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper functions
def gen_player_code() -> str:
    import uuid
    return str(uuid.uuid4())[:8].upper()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
    )

def _clear_token_cookie(response: Response):
    response.delete_cookie(key=COOKIE_NAME, httponly=True, secure=True, samesite="none")

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = int(sub)
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def to_dict(obj):
    d = {}
    for c in obj.__table__.columns:
        v = getattr(obj, c.name)
        if hasattr(v, 'isoformat'):
            v = v.isoformat()
        d[c.name] = v
    return d

def to_list(objs):
    return [to_dict(o) for o in objs]

# Startup event
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    # Idempotent column migrations for WatchRecord — MySQL/PostgreSQL 호환.
    # MySQL 은 ADD COLUMN IF NOT EXISTS 를 8.0.20 미만에서 지원하지 않아
    # information_schema 로 사전 검사 후 ADD.
    from sqlalchemy import text
    new_cols = [
        "vo2_max", "skin_temperature", "basal_metabolic_rate",
        "weight_kg", "body_fat_pct",
        "blood_pressure_sys", "blood_pressure_dia", "respiratory_rate",
        "body_temperature", "blood_glucose", "hydration_liters",
        "nutrition_kcal", "run_speed_mps", "run_power_w", "elevation_m",
        "bone_mass_kg", "sleep_deep_min", "sleep_rem_min", "sleep_light_min",
        "steps_cadence", "cycling_cadence", "lean_body_mass_kg",
        "body_water_mass_kg", "basal_body_temperature",
    ]
    try:
        with engine.begin() as conn:
            existing = set()
            # MySQL / PostgreSQL 둘 다 information_schema 지원
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'watch_records'"
            ))
            for row in res:
                existing.add(row[0].lower())
            for col in new_cols:
                if col.lower() in existing:
                    continue
                try:
                    conn.execute(text(f"ALTER TABLE watch_records ADD COLUMN {col} DOUBLE"))
                    print(f"migration: added column {col}")
                except Exception as e:
                    # PostgreSQL 은 DOUBLE 키워드 없음 — DOUBLE PRECISION 재시도
                    try:
                        conn.execute(text(f"ALTER TABLE watch_records ADD COLUMN {col} DOUBLE PRECISION"))
                        print(f"migration: added column {col} (DOUBLE PRECISION)")
                    except Exception as e2:
                        print(f"migration failed for {col}: {e2}")
    except Exception as e:
        print(f"migration block failed: {e}")

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# Auth endpoints
@app.post("/api/auth/signup")
async def signup(user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name or user_data.email.split("@")[0],
        player_code=gen_player_code(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.id)})
    _set_token_cookie(response, access_token)
    return {"status": "ok", "user_id": new_user.id}

@app.post("/api/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response = None,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    _set_token_cookie(response, access_token)
    return {"status": "ok", "user_id": user.id}

@app.post("/api/auth/logout")
async def logout(response: Response):
    _clear_token_cookie(response)
    return {"status": "ok"}

# User endpoints
@app.get("/api/user/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

@app.patch("/api/user/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.name:
        current_user.name = user_update.name
    if user_update.gender:
        current_user.gender = user_update.gender
    if user_update.role:
        current_user.role = user_update.role
    if user_update.sport:
        current_user.sport = user_update.sport
    if user_update.team_code:
        code = user_update.team_code.strip().upper()
        # Athlete 가 팀 코드 입력 시 실제로 존재하는 팀인지 검증
        if (current_user.role or "athlete") == "athlete":
            team = db.query(Team).filter(Team.code == code).first()
            if not team:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"존재하지 않는 팀 코드입니다: {code}",
                )
            current_user.team_code = code
            current_user.team_name = team.name
        else:
            current_user.team_code = code

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

# Condition endpoints
@app.post("/api/conditions", response_model=ConditionResponse)
async def create_condition(
    condition_data: ConditionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_condition = Condition(
        user_id=current_user.id,
        sleep=condition_data.sleep,
        fatigue=condition_data.fatigue,
        mood=condition_data.mood,
        energy=condition_data.energy,
        composite_score=condition_data.composite_score,
        acwr=condition_data.acwr,
        srpe=condition_data.srpe,
        recorded_at=datetime.utcnow()
    )
    db.add(new_condition)
    db.commit()
    db.refresh(new_condition)
    return new_condition

@app.get("/api/conditions", )
async def get_conditions(
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conditions = db.query(Condition).filter(
        Condition.user_id == current_user.id
    ).order_by(Condition.recorded_at.desc()).limit(limit).all()
    return to_list(conditions)

# Menstrual Cycle endpoints
@app.post("/api/menstrual-cycles", response_model=MenstrualCycleResponse)
async def create_menstrual_cycle(
    cycle_data: MenstrualCycleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_cycle = MenstrualCycle(
        user_id=current_user.id,
        start_date=cycle_data.start_date,
        end_date=cycle_data.end_date,
    )
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    return new_cycle

@app.get("/api/menstrual-cycles", )
async def get_menstrual_cycles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cycles = db.query(MenstrualCycle).filter(
        MenstrualCycle.user_id == current_user.id
    ).order_by(MenstrualCycle.start_date.desc()).all()
    return to_list(cycles)

# Workout endpoints
@app.post("/api/workouts", response_model=WorkoutResponse)
async def create_workout(
    workout_data: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_workout = Workout(
        user_id=current_user.id,
        name=workout_data.name,
        duration_seconds=workout_data.duration_seconds,
        srpe=workout_data.srpe,
        intensity=workout_data.intensity,
        recorded_at=datetime.utcnow()
    )
    db.add(new_workout)
    db.commit()
    db.refresh(new_workout)
    return new_workout

@app.get("/api/workouts", )
async def get_workouts(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workouts = db.query(Workout).filter(
        Workout.user_id == current_user.id
    ).order_by(Workout.recorded_at.desc()).limit(limit).all()
    return to_list(workouts)

# Injury endpoints
@app.post("/api/injuries", response_model=InjuryResponse)
async def create_injury(
    injury_data: InjuryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_injury = Injury(
        user_id=current_user.id,
        part_name=injury_data.part_name,
        side=injury_data.side,
        risk_percent=injury_data.risk_percent,
        risk_level=injury_data.risk_level,
        diagnosis=injury_data.diagnosis,
        ai_recommendation=injury_data.ai_recommendation,
        recorded_at=datetime.utcnow()
    )
    db.add(new_injury)
    db.commit()
    db.refresh(new_injury)
    return new_injury

@app.get("/api/injuries", )
async def get_injuries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    injuries = db.query(Injury).filter(
        Injury.user_id == current_user.id
    ).order_by(Injury.recorded_at.desc()).all()
    return to_list(injuries)

# Todo endpoints
@app.post("/api/todos", response_model=TodoResponse)
async def create_todo(
    todo_data: TodoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_todo = Todo(
        user_id=current_user.id,
        text=todo_data.text,
        done=False,
        created_at=datetime.utcnow()
    )
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    return new_todo

@app.get("/api/todos", )
async def get_todos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    todos = db.query(Todo).filter(
        Todo.user_id == current_user.id
    ).order_by(Todo.created_at.desc()).all()
    return to_list(todos)

@app.patch("/api/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: int,
    todo_update: TodoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id,
        Todo.user_id == current_user.id
    ).first()

    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )

    if todo_update.text:
        todo.text = todo_update.text
    if todo_update.done is not None:
        todo.done = todo_update.done

    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo

@app.delete("/api/todos/{todo_id}")
async def delete_todo(
    todo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    todo = db.query(Todo).filter(
        Todo.id == todo_id,
        Todo.user_id == current_user.id
    ).first()

    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )

    db.delete(todo)
    db.commit()
    return {"deleted": True}

# Notification endpoints
@app.get("/api/notifications", response_model=NotificationSettingResponse)
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == current_user.id
    ).first()

    if not settings:
        settings = NotificationSetting(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings

@app.patch("/api/notifications", response_model=NotificationSettingResponse)
async def update_notifications(
    settings_update: NotificationSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == current_user.id
    ).first()

    if not settings:
        settings = NotificationSetting(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    if settings_update.enabled is not None:
        settings.enabled = settings_update.enabled
    if settings_update.email_notifications is not None:
        settings.email_notifications = settings_update.email_notifications
    if settings_update.push_notifications is not None:
        settings.push_notifications = settings_update.push_notifications

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings

# Training Log endpoints
@app.post("/api/training-logs", response_model=TrainingLogResponse)
async def create_training_log(
    data: TrainingLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log = TrainingLog(user_id=current_user.id, **data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@app.get("/api/training-logs", )
async def get_training_logs(
    date: Optional[str] = None,
    limit: int = Query(30, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(TrainingLog).filter(TrainingLog.user_id == current_user.id)
    if date:
        q = q.filter(TrainingLog.date == date)
    results = q.order_by(TrainingLog.created_at.desc()).limit(limit).all()
    return to_list(results)

# Schedule endpoints (medical, psych, competition)
@app.post("/api/schedules", response_model=ScheduleResponse)
async def create_schedule(
    data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    s = Schedule(user_id=current_user.id, **data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@app.get("/api/schedules", )
async def get_schedules(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Schedule).filter(Schedule.user_id == current_user.id)
    if type:
        q = q.filter(Schedule.type == type)
    results = q.order_by(Schedule.created_at.desc()).all()
    return to_list(results)

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    s = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(s)
    db.commit()
    return {"deleted": True}

# ===== Watch Data 수신 (HealthKit → 자동 컨디션 입력) =====
@app.post("/api/watch-data")
async def receive_watch_data(
    data: dict,
    db: Session = Depends(get_db)
):
    """워치/health-bot에서 건강 데이터 수신 → 컨디션 자동 생성"""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email 필요")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자 없음")

    # 건강 데이터에서 컨디션 자동 생성
    hr = data.get("heart_rate")
    # HR이 워치에서 너무 오래된 값이면 (>60분) 신선도가 없다고 보고 제외.
    # Android 브릿지가 heart_rate_age_min 을 함께 전송함.
    hr_age = data.get("heart_rate_age_min")
    if hr is not None and hr_age is not None and hr_age > 60:
        hr = None
    rhr = data.get("resting_heart_rate")
    hrv = data.get("hrv")
    spo2 = data.get("blood_oxygen")
    sleep = data.get("sleep_hours")
    steps = data.get("steps")
    stress = data.get("stress")
    active_cal = data.get("active_calories")
    basal_cal = data.get("basal_calories")

    # 빈 배치 거부: 모든 의미있는 지표가 null/0이면 저장하지 않는다.
    # Health Connect가 14분마다 빈 sync를 보내 과거 HR row가 limit() 뒤로 밀려나는 현상 방지.
    meaningful = [hr, rhr, hrv, spo2, sleep, data.get("walking_heart_rate")]
    meaningful_steps = steps if (steps and steps > 100) else None
    if all(v is None for v in meaningful) and meaningful_steps is None:
        return {"status": "skipped", "reason": "empty batch"}

    # 15분 경계 버켓: 한 버켓(00/15/30/45분)당 최대 1개 레코드만 저장.
    # onResume / Worker / requestSync 중첩 트리거로 인한 중복, 14분 주기 Health
    # Connect sync 로 인한 불규칙 분 저장을 방지. 저장되는 created_at 도 해당
    # 15분 경계로 내림(floor)하여 시계열 눈금을 균일하게 맞춘다.
    now_utc = datetime.utcnow()
    bucket_start = now_utc.replace(
        minute=(now_utc.minute // 15) * 15,
        second=0, microsecond=0,
    )
    bucket_end = bucket_start + timedelta(minutes=15)
    bucket_exists = db.query(WatchRecord.id).filter(
        WatchRecord.user_id == user.id,
        WatchRecord.created_at >= bucket_start,
        WatchRecord.created_at < bucket_end,
    ).first()
    if bucket_exists is not None:
        return {"status": "skipped", "reason": "bucket_15min_already_saved"}

    # Option G: Samsung Energy Score 모사 — 수면/HRV/RHR/활동을 가중 합산.
    # Samsung 공식 점수는 0~100 이며 70+ 가 "양호". 우리가 보내는 HRV 는
    # pseudo-HRV(정수 bpm 기반, 실제 RMSSD 의 1/3~1/5) 이므로 임계값이 낮다.
    # 각 컴포넌트는 0~100 으로 정규화 후 가중 평균.
    def clamp(v, lo, hi): return max(lo, min(hi, v))

    # Samsung Health 표시값과 방향성을 맞추기 위해 곡선 관용도를 완화.
    # 전문준님 실측 기준점: 수면 4.3h → Samsung "60점 보통". 우리도 60 근처.
    sleep_score = None
    if sleep is not None:
        # 8h+=100, 6h=80, 4h=58, 2h=15, 0h=0 (2차 곡선)
        # 8h가 만점, 그 이하부터 부드럽게 하강
        if sleep >= 8:
            sleep_score = 100
        else:
            # sleep^1.3 * 14 근사 (4.3h → 약 58)
            sleep_score = clamp(int((sleep ** 1.3) * 14), 0, 100)

    hrv_score = None
    if hrv is not None:
        # pseudo-HRV: 15ms=100, 10ms=70, 5ms=30 (완만)
        hrv_score = clamp(int((hrv - 3) / 12 * 90 + 10), 0, 100)

    rhr_score = None
    if rhr is not None:
        # 55bpm=100, 75bpm=70, 90bpm=30 (완만)
        rhr_score = clamp(int((90 - rhr) * 2.2), 0, 100)

    activity_score = None
    if steps is not None:
        # Samsung 하루 목표 6000보 기준. 6000=80, 10000+=100, 3000=40
        activity_score = clamp(int(steps / 100 + 20), 0, 100)

    spo2_score = None
    if spo2 is not None:
        # 96%+=100, 94%=80, 91%=50, 88%-=0
        spo2_score = clamp(int((spo2 - 87) * 12), 0, 100)

    # 가중 평균: 사용 가능한 컴포넌트만 정규화해 합산
    weights = {'sleep': 0.30, 'hrv': 0.25, 'rhr': 0.20, 'activity': 0.15, 'spo2': 0.10}
    components = {
        'sleep': sleep_score, 'hrv': hrv_score, 'rhr': rhr_score,
        'activity': activity_score, 'spo2': spo2_score,
    }
    total_w = sum(weights[k] for k, v in components.items() if v is not None)
    if total_w > 0:
        score = int(sum(weights[k] * v for k, v in components.items() if v is not None) / total_w)
    else:
        score = 50  # 데이터 없으면 중립
    score = clamp(score, 0, 100)

    # ACWR 추정 (steps 기반 간이 계산)
    acwr = 1.0
    if steps:
        if steps > 12000: acwr = 1.3
        elif steps > 8000: acwr = 1.1
        elif steps < 3000: acwr = 0.7

    fatigue = max(1, min(10, 10 - int(score / 10)))
    energy = max(1, min(10, int(score / 10)))
    mood = max(1, min(10, int(score / 12) + 3))

    condition = Condition(
        user_id=user.id,
        sleep=sleep or 0,
        fatigue=fatigue,
        mood=mood,
        energy=energy,
        composite_score=score,
        acwr=acwr,
        srpe=0,
    )
    db.add(condition)
    db.commit()

    # 원본 15개 지표 저장 + HR stream 통계 (Phase 2-C) + 샘플 배열 (Phase 3-C)
    import json as _json
    hr_samples_raw = data.get("heart_rate_samples")
    hr_samples_str = None
    if isinstance(hr_samples_raw, list):
        hr_samples_str = _json.dumps(hr_samples_raw)
    elif isinstance(hr_samples_raw, str):
        hr_samples_str = hr_samples_raw  # already JSON-encoded
    watch = WatchRecord(
        user_id=user.id,
        heart_rate=hr, resting_heart_rate=rhr, walking_heart_rate=data.get("walking_heart_rate"),
        hrv=hrv, blood_oxygen=spo2, steps=steps, distance_km=data.get("distance_km"),
        active_calories=active_cal, basal_calories=basal_cal,
        exercise_minutes=data.get("exercise_minutes"), stand_minutes=data.get("stand_minutes"),
        flights_climbed=data.get("flights_climbed"), sleep_hours=sleep,
        env_audio_db=data.get("env_audio_db"), headphone_audio_db=data.get("headphone_audio_db"),
        heart_rate_max=data.get("heart_rate_max"),
        heart_rate_avg=data.get("heart_rate_avg"),
        heart_rate_samples_count=data.get("heart_rate_samples_count"),
        heart_rate_samples=hr_samples_str,
        vo2_max=data.get("vo2_max"),
        skin_temperature=data.get("skin_temperature"),
        basal_metabolic_rate=data.get("basal_metabolic_rate"),
        weight_kg=data.get("weight_kg"),
        body_fat_pct=data.get("body_fat_pct"),
        blood_pressure_sys=data.get("blood_pressure_sys"),
        blood_pressure_dia=data.get("blood_pressure_dia"),
        respiratory_rate=data.get("respiratory_rate"),
        body_temperature=data.get("body_temperature"),
        blood_glucose=data.get("blood_glucose"),
        hydration_liters=data.get("hydration_liters"),
        nutrition_kcal=data.get("nutrition_kcal"),
        run_speed_mps=data.get("run_speed_mps"),
        run_power_w=data.get("run_power_w"),
        elevation_m=data.get("elevation_m"),
        bone_mass_kg=data.get("bone_mass_kg"),
        sleep_deep_min=data.get("sleep_deep_min"),
        sleep_rem_min=data.get("sleep_rem_min"),
        sleep_light_min=data.get("sleep_light_min"),
        steps_cadence=data.get("steps_cadence"),
        cycling_cadence=data.get("cycling_cadence"),
        lean_body_mass_kg=data.get("lean_body_mass_kg"),
        body_water_mass_kg=data.get("body_water_mass_kg"),
        basal_body_temperature=data.get("basal_body_temperature"),
        created_at=bucket_start,
    )
    db.add(watch)
    db.commit()
    raw = {k: v for k, v in data.items() if k != "email" and v is not None}
    if hr is None:
        raw.pop("heart_rate", None)

    return {
        "status": "ok",
        "user_id": user.id,
        "condition_score": score,
        "acwr": acwr,
        "data_received": raw
    }

@app.get("/api/bio-timeseries")
async def get_bio_timeseries(
    response: Response,
    limit: int = 100,
    player_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """최근 N개 WatchRecord 시계열. player_id 가 있으면 그 선수(코치 뷰), 없으면 본인."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    limit = max(1, min(500, limit))
    target_id = current_user.id
    if player_id is not None and current_user.role == "coach":
        target_id = player_id
    records = db.query(WatchRecord).filter(
        WatchRecord.user_id == target_id,
    ).order_by(WatchRecord.created_at.desc()).limit(limit).all()
    return {"records": [to_dict(r) for r in records], "count": len(records)}


@app.get("/api/bio-data")
async def get_bio_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """최근 7일 생체 데이터 (분석 화면 + 트렌드)"""
    records = db.query(WatchRecord).filter(
        WatchRecord.user_id == current_user.id
    ).order_by(WatchRecord.created_at.desc()).limit(50).all()

    if records:
        latest = to_dict(records[0])
        # 메타 필드는 최신 row 고정, 데이터 필드는 최근 → 과거 순회하며 첫 non-null 채우기.
        # 빈 배치(id=612처럼 hr=null인 row)가 들어와도 이전 값이 가려지지 않음.
        meta_keys = {'id','user_id','created_at'}
        data_keys = ['heart_rate','resting_heart_rate','walking_heart_rate','hrv','blood_oxygen',
                     'heart_rate_max','heart_rate_avg','heart_rate_samples_count','heart_rate_samples',
                     'steps','distance_km','active_calories','basal_calories','exercise_minutes',
                     'stand_minutes','flights_climbed','sleep_hours','env_audio_db','headphone_audio_db']
        for k in data_keys:
            if latest.get(k) is None:
                for r in records[1:]:
                    v = to_dict(r).get(k)
                    if v is not None:
                        latest[k] = v
                        break
        # 7일 트렌드 (오래된 순)
        trends = {}
        reversed_records = list(reversed(records))
        for k in data_keys:
            vals = [to_dict(r).get(k) for r in reversed_records]
            vals = [v for v in vals if v is not None]
            trends[k] = vals
        return {"latest": latest, "trends": trends, "count": len(records)}

    # WatchRecord 없으면 컨디션에서 추출
    cond = db.query(Condition).filter(
        Condition.user_id == current_user.id
    ).order_by(Condition.recorded_at.desc()).first()
    if cond:
        return {"latest": {"sleep_hours": cond.sleep, "composite_score": cond.composite_score, "acwr": cond.acwr}, "trends": {}, "count": 1}

    return {"latest": None, "trends": {}, "count": 0}


@app.get("/api/bio-daily")
async def get_bio_daily(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """최근 N일 간의 일자별 watch_record 스냅샷.
    각 일자별로 created_at 기준 최신 레코드 1개를 반환.
    반환 형식: [{date, heart_rate, resting_heart_rate, heart_rate_max,
                 heart_rate_avg, steps, distance_km, active_calories}, ...]
    가장 오래된 날짜 → 최신 날짜 순서.
    """
    from sqlalchemy import text as sa_text
    days = max(1, min(days, 30))
    rows = db.execute(sa_text("""
        SELECT w.*
        FROM watch_records w
        INNER JOIN (
            SELECT DATE(created_at) AS d, MAX(id) AS max_id
            FROM watch_records
            WHERE user_id = :uid
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            GROUP BY DATE(created_at)
        ) latest ON w.id = latest.max_id
        ORDER BY w.created_at ASC
    """), {"uid": current_user.id, "days": days}).mappings().all()

    out = []
    for r in rows:
        d = dict(r)
        created = d.get("created_at")
        date_str = created.strftime("%Y-%m-%d") if hasattr(created, "strftime") else str(created)[:10]
        out.append({
            "date": date_str,
            "heart_rate": d.get("heart_rate"),
            "resting_heart_rate": d.get("resting_heart_rate"),
            "heart_rate_max": d.get("heart_rate_max"),
            "heart_rate_avg": d.get("heart_rate_avg"),
            "heart_rate_samples_count": d.get("heart_rate_samples_count"),
            "steps": d.get("steps"),
            "distance_km": d.get("distance_km"),
            "active_calories": d.get("active_calories"),
            "exercise_minutes": d.get("exercise_minutes"),
        })
    return {"days": out, "count": len(out)}

# ===== Parent-Child 연결 =====
@app.post("/api/children/connect")
async def connect_child(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code = data.get("player_code", "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="코드를 입력하세요")
    child = db.query(User).filter(User.player_code == code).first()
    if not child:
        raise HTTPException(status_code=404, detail="해당 코드의 선수를 찾을 수 없습니다")
    existing = db.query(ParentChild).filter(
        ParentChild.parent_id == current_user.id, ParentChild.child_id == child.id
    ).first()
    if existing:
        return {"status": "already_connected", "child": to_dict(child)}
    pc = ParentChild(parent_id=current_user.id, child_id=child.id)
    db.add(pc)
    db.commit()
    return {"status": "ok", "child": {"id": child.id, "name": child.name, "sport": child.sport, "player_code": child.player_code}}

@app.get("/api/my-parents")
async def get_my_parents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """선수 입장: 나를 연결한 학부모/코치 목록"""
    links = db.query(ParentChild).filter(ParentChild.child_id == current_user.id).all()
    parents = []
    for link in links:
        parent = db.query(User).filter(User.id == link.parent_id).first()
        if parent:
            parents.append({"id": parent.id, "name": parent.name, "role": parent.role, "email": parent.email})
    return parents

@app.get("/api/children")
async def get_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    links = db.query(ParentChild).filter(ParentChild.parent_id == current_user.id).all()
    children = []
    for link in links:
        child = db.query(User).filter(User.id == link.child_id).first()
        if child:
            # 최신 컨디션
            cond = db.query(Condition).filter(Condition.user_id == child.id).order_by(Condition.recorded_at.desc()).first()
            # 최신 부상
            inj = db.query(Injury).filter(Injury.user_id == child.id).order_by(Injury.recorded_at.desc()).first()
            children.append({
                "id": child.id, "name": child.name, "sport": child.sport,
                "player_code": child.player_code, "gender": child.gender,
                "condition": to_dict(cond) if cond else None,
                "injury": to_dict(inj) if inj else None,
            })
    return children

@app.get("/api/children/{child_id}/conditions")
async def get_child_conditions(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    link = db.query(ParentChild).filter(
        ParentChild.parent_id == current_user.id, ParentChild.child_id == child_id
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="연결된 자녀가 아닙니다")
    conds = db.query(Condition).filter(Condition.user_id == child_id).order_by(Condition.recorded_at.desc()).limit(30).all()
    return to_list(conds)

@app.get("/api/children/{child_id}/injuries")
async def get_child_injuries(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    link = db.query(ParentChild).filter(
        ParentChild.parent_id == current_user.id, ParentChild.child_id == child_id
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="연결된 자녀가 아닙니다")
    injuries = db.query(Injury).filter(Injury.user_id == child_id).order_by(Injury.recorded_at.desc()).all()
    return to_list(injuries)

# ===== 메시징 (AES-256-GCM 암호화) =====
from crypto_utils import encrypt, decrypt
import json as _json

# WebSocket 연결 관리
class ChatConnectionManager:
    def __init__(self):
        self.connections: dict[int, list[WebSocket]] = {}  # user_id → [ws, ...]

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self.connections:
            self.connections[user_id] = [w for w in self.connections[user_id] if w != ws]
            if not self.connections[user_id]:
                del self.connections[user_id]

    async def send_to_user(self, user_id: int, data: dict):
        if user_id in self.connections:
            dead = []
            for ws in self.connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.connections[user_id].remove(ws)

chat_ws = ChatConnectionManager()

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    # 쿠키에서 토큰 추출
    token = websocket.cookies.get(COOKIE_NAME)
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await chat_ws.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keepalive
    except WebSocketDisconnect:
        chat_ws.disconnect(user_id, websocket)

@app.post("/api/messages")
async def send_message(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    receiver_id = data.get("receiver_id")
    text = data.get("text", "").strip()
    if not receiver_id or not text:
        raise HTTPException(status_code=400, detail="receiver_id와 text 필요")
    encrypted = encrypt(text)
    msg = Message(sender_id=current_user.id, receiver_id=receiver_id, encrypted_text=encrypted)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    msg_data = {"id": msg.id, "sender_id": msg.sender_id, "receiver_id": msg.receiver_id,
                "text": text, "read": msg.read, "created_at": msg.created_at.isoformat() if msg.created_at else None}

    # WebSocket으로 상대방에게 실시간 전송
    await chat_ws.send_to_user(receiver_id, {
        "type": "new_message",
        "message": msg_data,
        "sender_name": current_user.name,
    })

    return msg_data

@app.get("/api/messages/{other_id}")
async def get_messages(
    other_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msgs = db.query(Message).filter(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == other_id)) |
        ((Message.sender_id == other_id) & (Message.receiver_id == current_user.id))
    ).order_by(Message.created_at.asc()).limit(100).all()
    # 읽음 처리
    db.query(Message).filter(
        Message.sender_id == other_id, Message.receiver_id == current_user.id, Message.read == False
    ).update({"read": True})
    db.commit()
    result = []
    for m in msgs:
        try:
            text = decrypt(m.encrypted_text)
        except Exception:
            text = "[복호화 실패]"
        result.append({"id": m.id, "sender_id": m.sender_id, "receiver_id": m.receiver_id,
                        "text": text, "read": m.read, "created_at": m.created_at.isoformat() if m.created_at else None})
    return result

@app.get("/api/messages/unread/count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id, Message.read == False
    ).count()
    return {"unread": count}

# Prediction endpoint
@app.post("/api/predict")
async def predict(
    data: dict,
    current_user: User = Depends(get_current_user),
):
    try:
        from predictor import predict_injury
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model load error: {e}")
    role = current_user.role or "general"
    pattern = data.pop("_pattern", None) or current_user.sport or ""
    result = predict_injury(role, pattern, data)
    result["user_id"] = current_user.id
    return result

# ══════════════════════════════════
# 팀 관리 API
# ══════════════════════════════════

@app.post("/api/teams")
def create_team(
    req: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """코치가 팀 생성. teams 테이블에 INSERT + 본인 team_code 설정."""
    name = (req.get("name") or "").strip()
    code = (req.get("code") or "").strip().upper()
    if not name or not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="name 과 code 필수",
        )
    existing = db.query(Team).filter(Team.code == code).first()
    if existing:
        if existing.coach_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 팀 코드입니다",
            )
        current_user.team_code = code
        current_user.team_name = name
        current_user.role = "coach"
        db.commit()
        return {"id": existing.id, "code": code, "name": existing.name}

    team = Team(code=code, name=name, coach_id=current_user.id)
    db.add(team)
    current_user.team_code = code
    current_user.team_name = name
    current_user.role = "coach"
    db.commit()
    db.refresh(team)
    return {"id": team.id, "code": team.code, "name": team.name}


@app.get("/api/teams/{code}")
def get_team(code: str, db: Session = Depends(get_db)):
    """팀 코드 존재 확인 (선수 앱 가입 시 검증용, 공개)."""
    team = db.query(Team).filter(Team.code == code.upper()).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="존재하지 않는 팀 코드입니다",
        )
    return {"id": team.id, "code": team.code, "name": team.name}


# ══════════════════════════════════
# 코치 대시보드 전용 API
# ══════════════════════════════════

@app.get("/api/coach/players")
def coach_players(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """코치 대시보드: 로그인한 코치의 team_code 에 속한 선수만 반환.
    코치가 team_code 를 설정하지 않았으면 403 (팀 먼저 생성 필요)."""
    if current_user.role not in ("coach", "general"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="코치 계정만 접근 가능합니다",
        )
    if not current_user.team_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="먼저 팀을 생성해주세요 (team_code 없음)",
        )

    from sqlalchemy import text as sa_text
    rows = db.execute(sa_text("""
        SELECT
            u.id, u.name, u.sport, u.gender,
            w.heart_rate AS hr, w.resting_heart_rate AS rhr,
            w.walking_heart_rate AS walking_hr, w.hrv,
            w.blood_oxygen AS spo2, w.steps, w.distance_km,
            w.active_calories AS active_cal, w.basal_calories AS basal_cal,
            w.exercise_minutes AS exercise_min, w.stand_minutes AS stand_min,
            w.flights_climbed AS flights, w.sleep_hours AS sleep,
            w.env_audio_db AS env_db, w.headphone_audio_db AS earphone_db,
            w.heart_rate_max AS hr_max, w.heart_rate_avg AS hr_avg,
            w.heart_rate_samples_count AS hr_samples_count,
            w.heart_rate_samples AS hr_samples_json,
            w.created_at AS watch_at,
            c.acwr, c.composite_score AS score, c.fatigue AS stress
        FROM users u
        LEFT JOIN (
            SELECT wr.* FROM watch_records wr
            INNER JOIN (SELECT user_id, MAX(id) AS max_id FROM watch_records GROUP BY user_id) latest
            ON wr.user_id = latest.user_id AND wr.id = latest.max_id
        ) w ON u.id = w.user_id
        LEFT JOIN (
            SELECT co.* FROM conditions co
            INNER JOIN (SELECT user_id, MAX(id) AS max_id FROM conditions GROUP BY user_id) latest
            ON co.user_id = latest.user_id AND co.id = latest.max_id
        ) c ON u.id = c.user_id
        WHERE (u.role = 'athlete' OR u.role IS NULL)
          AND u.team_code = :team_code
        ORDER BY u.id
    """), {"team_code": current_user.team_code}).fetchall()

    players = []
    for r in rows:
        row = dict(r._mapping)
        score = row.get("score")
        acwr = row.get("acwr")
        stress = row.get("stress")
        if score is not None:
            pstatus = "g" if score >= 60 else ("y" if score >= 40 else "r")
        elif acwr is not None:
            pstatus = "g" if acwr <= 1.2 else ("y" if acwr <= 1.5 else "r")
        else:
            pstatus = "g"
        pain = 0
        if stress and stress > 50: pain = 4
        elif stress and stress > 30: pain = 2
        players.append({
            "id": row["id"], "name": row["name"],
            "sport": row.get("sport") or "", "gender": row.get("gender") or "",
            "status": pstatus,
            "hrv": row.get("hrv"), "hrv_change": "+0%" if row.get("hrv") else None,
            "rhr": row.get("rhr"), "sleep": row.get("sleep"),
            "stress": int(stress) if stress else None,
            "acwr": float(acwr) if acwr else None, "pain": pain,
            "hr": row.get("hr"), "spo2": row.get("spo2"),
            "steps": int(row["steps"]) if row.get("steps") else None,
            "active_cal": row.get("active_cal"), "exercise_min": row.get("exercise_min"),
            "score": float(score) if score else None,
            "watch_at": row["watch_at"].isoformat() if row.get("watch_at") else None,
            "walking_hr": row.get("walking_hr"), "distance_km": row.get("distance_km"),
            "stand_min": row.get("stand_min"),
            "flights": int(row["flights"]) if row.get("flights") else None,
            "env_db": row.get("env_db"), "earphone_db": row.get("earphone_db"),
            "basal_cal": row.get("basal_cal"),
        })
    return players


@app.post("/api/kg/chat")
async def kg_chat(req: dict, current_user: User = Depends(get_current_user)):
    """선수용 KG 챗 (인증 필요)"""
    req["_user"] = current_user.name
    return await kg_coach_chat(req)


# ── 멀티턴: DB 테이블 자동 생성 ──
@app.on_event("startup")
def create_chat_history_table():
    from sqlalchemy import text as sa_text
    db = next(get_db())
    try:
        db.execute(sa_text("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(100) NOT NULL,
                role VARCHAR(10) NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session (session_id)
            )
        """))
        db.commit()
    except Exception:
        pass
    finally:
        db.close()


@app.post("/api/kg/coach-chat")
async def kg_coach_chat(req: dict):
    """코치용 KG 챗 — 오케스트레이터 + 멀티턴 + KG 논문 검색"""
    import httpx
    from sqlalchemy import text as sa_text
    BIZROUTER_API_KEY = os.getenv("BIZROUTER_API_KEY", "")
    if not BIZROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="BIZROUTER_API_KEY not configured")

    message = req.get("message", "")
    session_id = req.get("session_id", "")
    db = next(get_db())
    try:
        # ── Step 1: KG 그래프 탐색 (LLM 없이 직접 검색) ──
        import re as _re
        # 질문에서 한글/영어 단어 추출
        words = _re.findall(r'[가-힣]+|[a-zA-Z]{2,}', message)
        words = [w.lower() for w in words if len(w) >= 2]

        # 일상 대화 감지 (스포츠 과학 단어 없으면 스킵)
        casual_words = {'고마워','감사','안녕','네','응','ㅇㅇ','ㅋ','ㅎ','ok','thanks','hello','hi','bye'}
        is_casual = all(w in casual_words for w in words) or len(words) == 0

        papers_rows = []
        triples_context = ""

        if not is_casual and words:
            # Step 1a: concepts 매칭
            concept_clauses = " OR ".join([f"LOWER(name) LIKE :w{i}" for i in range(len(words))])
            concept_params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}
            concepts = db.execute(sa_text(
                f"SELECT DISTINCT name FROM kg_concepts WHERE {concept_clauses} LIMIT 10"
            ), concept_params).fetchall()
            concept_names = [c[0] for c in concepts]

            # Step 1b: triples 그래프 탐색 (concepts → 관련 트리플 → 논문)
            if concept_names:
                triple_clauses = " OR ".join([f"LOWER(subject) LIKE :c{i} OR LOWER(object) LIKE :c{i}" for i in range(len(concept_names))])
                triple_params = {f"c{i}": f"%{n.lower()}%" for i, n in enumerate(concept_names)}
                triples = db.execute(sa_text(
                    f"SELECT subject, relation, object, evidence, paper_id FROM kg_triples WHERE {triple_clauses} LIMIT 10"
                ), triple_params).fetchall()

                # 트리플에서 근거 컨텍스트 구성
                paper_ids = set()
                for t in triples:
                    row = dict(t._mapping)
                    triples_context += f"- {row['subject']} → {row['relation']} → {row['object']}"
                    if row.get('evidence'):
                        triples_context += f" (근거: {row['evidence']})"
                    triples_context += "\n"
                    if row.get('paper_id'):
                        paper_ids.add(row['paper_id'])

                # Step 1c: findings.evidence 직접 인용
                finding_ids = [row.get('finding_id') for row in [dict(t._mapping) for t in triples] if row.get('finding_id')]
                if finding_ids:
                    fid_list = ",".join([f"'{fid}'" for fid in list(set(finding_ids))[:10]])
                    findings = db.execute(sa_text(
                        f"SELECT id, description, p_value, effect_size, effect_magnitude FROM kg_findings WHERE id IN ({fid_list})"
                    )).fetchall()
                    for f in findings:
                        frow = dict(f._mapping)
                        if frow.get('description'):
                            triples_context += f"  근거: {frow['description']}"
                            if frow.get('p_value'):
                                triples_context += f" (p={frow['p_value']})"
                            if frow.get('effect_size'):
                                triples_context += f" (효과크기={frow['effect_size']})"
                            triples_context += "\n"

                # Step 1d: 연결된 논문 조회
                if paper_ids:
                    id_list = ",".join([f"'{pid}'" for pid in list(paper_ids)[:5]])
                    papers_rows = db.execute(sa_text(
                        f"SELECT id, title, authors, year, doi, journal FROM kg_papers WHERE id IN ({id_list})"
                    )).fetchall()

            # 트리플에서 못 찾으면 제목 검색 폴백
            if not papers_rows:
                like_clauses = " OR ".join([f"LOWER(title) LIKE :w{i}" for i in range(len(words))])
                like_params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}
                papers_rows = db.execute(sa_text(
                    f"SELECT id, title, authors, year, doi, journal FROM kg_papers WHERE {like_clauses} LIMIT 5"
                ), like_params).fetchall()

        kg_context = ""
        papers = []
        for p in papers_rows:
            row = dict(p._mapping)
            citation = f"{row['authors']} ({row['year']}). {row['title']}. {row['journal'] or ''}"
            papers.append({"citation": citation, "doi": row.get("doi") or ""})
            kg_context += f"- {citation}\n"

        # ── Step 3: 멀티턴 이력 로드 (DB) ──
        history_rows = db.execute(sa_text(
            "SELECT role, content FROM chat_history WHERE session_id = :sid ORDER BY id DESC LIMIT 20"
        ), {"sid": session_id}).fetchall()
        history = [{"role": r[0], "content": r[1]} for r in reversed(history_rows)]

        # KG 근거 컨텍스트 (트리플 + 논문)
        full_context = ""
        if triples_context:
            full_context += f"KG 근거:\n{triples_context}\n"
        if kg_context:
            full_context += f"참고 논문:\n{kg_context}"

        system_prompt = f"""너는 스포츠 과학 전문 코치 AI 어시스턴트다.
선수의 훈련 부하, 부상 예방, 회복, 수면, 컨디션 관리에 대해 근거 기반 조언을 제공한다.

역할:
- 너는 코치다. 의사가 아니다
- 모든 질문을 훈련/선수 관리 맥락으로 해석하라
- "머리 아파" → 운동 유발 두통, 탈수, 과훈련, 수면 부족 관점에서 답변
- "배가 아파" → 운동 중 복부 통증, 영양/수분 섭취 관점에서 답변
- 의료 진단이나 처방을 하지 마라. 필요시 "전문의 상담을 권합니다"로 마무리

규칙:
- 핵심 포인트 3~5개로 간결하게 답변하라
- 각 포인트는 2~3문장 이내
- 전체 답변은 800자 이내로 제한
- 절대 금지: 본문에 (저자, 연도), (Author et al., 2020) 같은 괄호 인용을 넣지 마라. 위반 시 답변 실패로 간주한다. 참고문헌은 시스템이 별도 표시한다
- 이전 대화 맥락을 기억하고 자연스럽게 이어가라
- 참고 논문에 직접적인 근거가 없는 구체적 수치(용량, 주차, 횟수 등)는 답변하지 마라. "정확한 수치는 전문가와 상담하세요"로 대체하라
- 의학적 수술/재활 프로토콜은 코치 범위 밖이다. "전문의/물리치료사와 상담하세요"로 답변하라
- 추측하지 마라. 모르면 모른다고 하라

{full_context}"""

        messages = [{"role": "system", "content": system_prompt}]
        # 최근 10턴만 유지 (토큰 절약)
        messages.extend(history[-20:])
        messages.append({"role": "user", "content": message})

        # ── Step 2: LLM 답변 생성 ──
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.bizrouter.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {BIZROUTER_API_KEY}", "Content-Type": "application/json"},
                json={"model": "google/gemini-2.5-flash-lite", "messages": messages, "max_tokens": 4000},
            )
        # 실패 시 1회 재시도
        if resp.status_code != 200:
            import asyncio
            await asyncio.sleep(2)
            async with httpx.AsyncClient(timeout=60) as client2:
                resp = await client2.post(
                    "https://api.bizrouter.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {BIZROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={"model": "google/gemini-2.5-flash-lite", "messages": messages, "max_tokens": 4000},
                )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="AI 응답 오류")
        reply = resp.json()["choices"][0]["message"]["content"]

        # 가드레일 LLM 제거 — 규칙 필터가 확정적으로 처리

        # ── 후처리: 괄호 인용 강제 제거 ──
        import re
        reply = re.sub(r'\s*\([^)]*et al\.\s*,?\s*\d{4}\)', '', reply)
        reply = re.sub(r'\s*\([A-Z][a-z]+ (?:& |and )?[A-Z][a-z]+(?:,?\s*\d{4})?\)', '', reply)
        reply = re.sub(r'\s*\([^)]*\d{4}[a-z]?\)', '', reply)

        # ── 규칙 기반 필터: 의학적 처방/구체적 수치 문장 삭제 ──
        BANNED_PATTERNS = [
            r'\d+~?\d*\s*mg',               # 300mg, 20~30mg
            r'\d+~?\d*\s*g[^a-z]',          # 20g, 3~5g (GPS 등 제외)
            r'체중\s*\d*\s*kg당',            # 체중 1kg당
            r'하루\s*(총\s*)?\d+',           # 하루 20, 하루 총 20
            r'\d+g씩\s*\d+회',              # 5g씩 4회
            r'\d+~?\d*\s*주차',              # 4주차, 4~12주차
            r'수술\s*(후|직후)',              # 수술 후, 수술 직후
            r'\d+회\s*/\s*일',               # 4회/일
            r'처방',                          # 처방
            r'투약|복용량|용량',              # 투약, 복용량, 용량
        ]
        banned_re = re.compile('|'.join(BANNED_PATTERNS))

        lines = reply.split('\n')
        filtered = []
        removed = False
        for line in lines:
            if banned_re.search(line):
                removed = True
            else:
                filtered.append(line)

        reply = '\n'.join(filtered).strip()
        if removed:
            reply += '\n\n정확한 수치와 의학적 프로토콜은 전문가와 상담하시기 바랍니다.'

        # ── 멀티턴 이력 저장 (DB) ──
        db.execute(sa_text(
            "INSERT INTO chat_history (session_id, role, content) VALUES (:sid, 'user', :msg)"
        ), {"sid": session_id, "msg": message})
        db.execute(sa_text(
            "INSERT INTO chat_history (session_id, role, content) VALUES (:sid, 'assistant', :reply)"
        ), {"sid": session_id, "reply": reply})
        # 20턴(40메시지) 초과 시 오래된 것 삭제
        db.execute(sa_text("""
            DELETE FROM chat_history WHERE session_id = :sid AND id NOT IN (
                SELECT id FROM (SELECT id FROM chat_history WHERE session_id = :sid ORDER BY id DESC LIMIT 40) t
            )
        """), {"sid": session_id})
        db.commit()

        return {"reply": reply, "papers": papers}
    finally:
        db.close()


# ── /api/kg/coach-chat/stream (SSE 스트리밍) ──
from fastapi.responses import StreamingResponse

@app.post("/api/kg/coach-chat/stream")
async def kg_coach_chat_stream(req: dict):
    """코치용 KG 챗 — SSE 스트리밍"""
    import httpx
    from sqlalchemy import text as sa_text
    BIZROUTER_API_KEY = os.getenv("BIZROUTER_API_KEY", "")
    if not BIZROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="BIZROUTER_API_KEY not configured")

    message = req.get("message", "")
    session_id = req.get("session_id", "")
    db = next(get_db())

    # 그래프 탐색 + 컨텍스트 구성 (비스트리밍과 동일)
    import re as _re
    words = _re.findall(r'[가-힣]+|[a-zA-Z]{2,}', message)
    words = [w.lower() for w in words if len(w) >= 2]
    casual_words = {'고마워','감사','안녕','네','응','ㅇㅇ','ㅋ','ㅎ','ok','thanks','hello','hi','bye'}
    is_casual = all(w in casual_words for w in words) or len(words) == 0

    papers = []
    triples_context = ""
    kg_context = ""

    if not is_casual and words:
        concept_clauses = " OR ".join([f"LOWER(name) LIKE :w{i}" for i in range(len(words))])
        concept_params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}
        concepts = db.execute(sa_text(f"SELECT DISTINCT name FROM kg_concepts WHERE {concept_clauses} LIMIT 10"), concept_params).fetchall()
        concept_names = [c[0] for c in concepts]

        if concept_names:
            triple_clauses = " OR ".join([f"LOWER(subject) LIKE :c{i} OR LOWER(object) LIKE :c{i}" for i in range(len(concept_names))])
            triple_params = {f"c{i}": f"%{n.lower()}%" for i, n in enumerate(concept_names)}
            triples = db.execute(sa_text(f"SELECT subject, relation, object, evidence, paper_id, finding_id FROM kg_triples WHERE {triple_clauses} LIMIT 10"), triple_params).fetchall()
            paper_ids = set()
            for t in triples:
                row = dict(t._mapping)
                triples_context += f"- {row['subject']} → {row['relation']} → {row['object']}"
                if row.get('evidence'): triples_context += f" (근거: {row['evidence']})"
                triples_context += "\n"
                if row.get('paper_id'): paper_ids.add(row['paper_id'])

            if paper_ids:
                id_list = ",".join([f"'{pid}'" for pid in list(paper_ids)[:5]])
                papers_rows = db.execute(sa_text(f"SELECT id, title, authors, year, doi, journal FROM kg_papers WHERE id IN ({id_list})")).fetchall()
                for p in papers_rows:
                    row = dict(p._mapping)
                    citation = f"{row['authors']} ({row['year']}). {row['title']}. {row['journal'] or ''}"
                    papers.append({"citation": citation, "doi": row.get("doi") or ""})
                    kg_context += f"- {citation}\n"

    full_context = ""
    if triples_context: full_context += f"KG 근거:\n{triples_context}\n"
    if kg_context: full_context += f"참고 논문:\n{kg_context}"

    # 멀티턴 이력
    history_rows = db.execute(sa_text("SELECT role, content FROM chat_history WHERE session_id = :sid ORDER BY id DESC LIMIT 20"), {"sid": session_id}).fetchall()
    history = [{"role": r[0], "content": r[1]} for r in reversed(history_rows)]

    system_prompt = f"""너는 스포츠 과학 전문 코치 AI 어시스턴트다.
선수의 훈련 부하, 부상 예방, 회복, 수면, 컨디션 관리에 대해 근거 기반 조언을 제공한다.
규칙:
- 핵심 포인트 3~5개로 간결하게 답변하라
- 전체 답변은 800자 이내
- 본문에 괄호 인용을 넣지 마라
- 모르면 모른다고 하라
{full_context}"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history[-20:])
    messages.append({"role": "user", "content": message})

    async def stream_generator():
        import json
        full_reply = ""
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    "https://api.bizrouter.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {BIZROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={"model": "google/gemini-2.5-flash-lite", "messages": messages, "max_tokens": 4000, "stream": True},
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                token = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if token:
                                    full_reply += token
                                    yield f"data: {json.dumps({'token': token})}\n\n"
                            except json.JSONDecodeError:
                                pass

            # 논문 정보 전송
            if papers:
                yield f"data: {json.dumps({'papers': papers})}\n\n"
            yield "data: [DONE]\n\n"

            # DB에 대화 이력 저장
            db2 = next(get_db())
            try:
                db2.execute(sa_text("INSERT INTO chat_history (session_id, role, content) VALUES (:sid, 'user', :msg)"), {"sid": session_id, "msg": message})
                db2.execute(sa_text("INSERT INTO chat_history (session_id, role, content) VALUES (:sid, 'assistant', :reply)"), {"sid": session_id, "reply": full_reply})
                db2.commit()
            finally:
                db2.close()

        except Exception as e:
            if not full_reply:
                yield f"data: {json.dumps({'error': 'stream failed'})}\n\n"

    db.close()
    return StreamingResponse(stream_generator(), media_type="text/event-stream")


# ── Static Files (코치 대시보드 프론트엔드) ──
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if os.path.exists("pages"):
    app.mount("/src", StaticFiles(directory="src"), name="src")
    app.mount("/pages", StaticFiles(directory="pages", html=True), name="pages")

    @app.get("/")
    def root():
        return FileResponse("pages/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))