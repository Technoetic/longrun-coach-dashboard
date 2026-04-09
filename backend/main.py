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

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://longrun-coach-dashboard-production.up.railway.app")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
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
        current_user.team_code = user_update.team_code

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
    rhr = data.get("resting_heart_rate")
    hrv = data.get("hrv")
    spo2 = data.get("blood_oxygen")
    sleep = data.get("sleep_hours")
    steps = data.get("steps")
    stress = data.get("stress")
    active_cal = data.get("active_calories")
    basal_cal = data.get("basal_calories")

    # 컨디션 점수 자동 계산
    score = 50  # 기본
    if hrv and hrv > 50: score += 15
    elif hrv and hrv < 30: score -= 15
    if sleep and sleep >= 7: score += 10
    elif sleep and sleep < 6: score -= 10
    if spo2 and spo2 >= 95: score += 5
    elif spo2 and spo2 < 95: score -= 15
    if rhr and rhr < 65: score += 5
    elif rhr and rhr > 85: score -= 10
    score = max(0, min(100, score))

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

    # 원본 15개 지표 저장
    watch = WatchRecord(
        user_id=user.id,
        heart_rate=hr, resting_heart_rate=rhr, walking_heart_rate=data.get("walking_heart_rate"),
        hrv=hrv, blood_oxygen=spo2, steps=steps, distance_km=data.get("distance_km"),
        active_calories=active_cal, basal_calories=basal_cal,
        exercise_minutes=data.get("exercise_minutes"), stand_minutes=data.get("stand_minutes"),
        flights_climbed=data.get("flights_climbed"), sleep_hours=sleep,
        env_audio_db=data.get("env_audio_db"), headphone_audio_db=data.get("headphone_audio_db"),
    )
    db.add(watch)
    db.commit()
    raw = {k: v for k, v in data.items() if k != "email" and v is not None}

    return {
        "status": "ok",
        "user_id": user.id,
        "condition_score": score,
        "acwr": acwr,
        "data_received": raw
    }

@app.get("/api/bio-data")
async def get_bio_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """최근 7일 생체 데이터 (분석 화면 + 트렌드)"""
    records = db.query(WatchRecord).filter(
        WatchRecord.user_id == current_user.id
    ).order_by(WatchRecord.created_at.desc()).limit(7).all()

    if records:
        latest = to_dict(records[0])
        # 7일 트렌드 (오래된 순)
        trend_keys = ['heart_rate','resting_heart_rate','walking_heart_rate','hrv','blood_oxygen',
                      'steps','distance_km','active_calories','basal_calories','exercise_minutes',
                      'stand_minutes','flights_climbed','sleep_hours','env_audio_db','headphone_audio_db']
        trends = {}
        reversed_records = list(reversed(records))
        for k in trend_keys:
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
# 코치 대시보드 전용 API
# ══════════════════════════════════

@app.get("/api/coach/players")
def coach_players(db: Session = Depends(get_db)):
    """코치 대시보드: 전체 선수 데이터 (워치 + 컨디션)"""
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
            w.created_at AS watch_at,
            c.acwr, c.composite_score AS score, c.fatigue AS stress
        FROM users u
        LEFT JOIN (
            SELECT wr.* FROM watch_records wr
            INNER JOIN (SELECT user_id, MAX(created_at) AS max_at FROM watch_records GROUP BY user_id) latest
            ON wr.user_id = latest.user_id AND wr.created_at = latest.max_at
        ) w ON u.id = w.user_id
        LEFT JOIN (
            SELECT co.* FROM conditions co
            INNER JOIN (SELECT user_id, MAX(recorded_at) AS max_at FROM conditions GROUP BY user_id) latest
            ON co.user_id = latest.user_id AND co.recorded_at = latest.max_at
        ) c ON u.id = c.user_id
        WHERE u.role = 'athlete' OR u.role IS NULL
        ORDER BY u.id
    """)).fetchall()

    players = []
    for r in rows:
        row = dict(r._mapping)
        score = row.get("score")
        acwr = row.get("acwr")
        stress = row.get("stress")
        if score is not None:
            status = "g" if score >= 60 else ("y" if score >= 40 else "r")
        elif acwr is not None:
            status = "g" if acwr <= 1.2 else ("y" if acwr <= 1.5 else "r")
        else:
            status = "g"
        pain = 0
        if stress and stress > 50: pain = 4
        elif stress and stress > 30: pain = 2
        players.append({
            "id": row["id"], "name": row["name"],
            "sport": row.get("sport") or "", "gender": row.get("gender") or "",
            "status": status,
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


@app.post("/api/kg/coach-chat")
async def kg_coach_chat(req: dict):
    """코치용 KG 챗 (오케스트레이터 + 멀티턴)"""
    import httpx
    from sqlalchemy import text as sa_text
    BIZROUTER_API_KEY = os.getenv("BIZROUTER_API_KEY", "")
    if not BIZROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="BIZROUTER_API_KEY not configured")

    message = req.get("message", "")
    db = next(get_db())
    try:
        papers_rows = db.execute(sa_text(
            "SELECT id, title, authors, year, doi, journal FROM kg_papers ORDER BY RAND() LIMIT 5"
        )).fetchall()
        kg_context = ""
        papers = []
        for p in papers_rows:
            row = dict(p._mapping)
            citation = f"{row['authors']} ({row['year']}). {row['title']}. {row['journal'] or ''}"
            papers.append({"citation": citation, "doi": row.get("doi") or ""})
            kg_context += f"- {citation}\n"

        system_prompt = f"""너는 스포츠 과학 전문 코치 AI 어시스턴트다.
선수의 훈련 부하, 부상 예방, 회복, 수면, 컨디션 관리에 대해 근거 기반 조언을 제공한다.
다음 논문을 참고하여 답변하라:
{kg_context}"""

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.bizrouter.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {BIZROUTER_API_KEY}", "Content-Type": "application/json"},
                json={"model": "openai/gpt-5.4-mini", "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ], "max_tokens": 1000},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="AI 응답 오류")
        reply = resp.json()["choices"][0]["message"]["content"]
        return {"reply": reply, "papers": papers}
    finally:
        db.close()


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