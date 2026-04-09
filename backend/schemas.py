from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ===== Auth =====
class UserCreate(BaseModel):
    email: str
    phone: Optional[str] = None
    password: str
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ===== User =====
class UserUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    role: Optional[str] = None
    sport: Optional[str] = None
    team_code: Optional[str] = None
    team_name: Optional[str] = None
    student_code: Optional[str] = None
    training_frequency: Optional[str] = None
    watch_device: Optional[str] = None
    onboarding_done: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    phone: Optional[str]
    name: str
    gender: Optional[str]
    role: str
    sport: Optional[str]
    team_code: Optional[str]
    player_code: Optional[str]
    onboarding_done: bool

    class Config:
        from_attributes = True


# ===== Condition =====
class ConditionCreate(BaseModel):
    sleep: Optional[float] = None
    fatigue: Optional[float] = None
    mood: Optional[float] = None
    energy: Optional[float] = None
    composite_score: Optional[float] = None
    acwr: Optional[float] = None
    srpe: Optional[int] = None


class ConditionResponse(ConditionCreate):
    id: int
    user_id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


# ===== Menstrual Cycle =====
class MenstrualCycleCreate(BaseModel):
    start_date: str
    end_date: str


class MenstrualCycleResponse(MenstrualCycleCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ===== Workout =====
class WorkoutCreate(BaseModel):
    name: str
    duration_seconds: int = 0
    srpe: Optional[int] = None
    intensity: Optional[str] = None


class WorkoutResponse(WorkoutCreate):
    id: int
    user_id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


# ===== Injury =====
class InjuryCreate(BaseModel):
    part_name: str
    side: Optional[str] = None
    risk_percent: Optional[float] = None
    risk_level: Optional[str] = None
    diagnosis: Optional[str] = None
    ai_recommendation: Optional[str] = None


class InjuryResponse(InjuryCreate):
    id: int
    user_id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


# ===== Todo =====
class TodoCreate(BaseModel):
    text: str


class TodoUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None


class TodoResponse(BaseModel):
    id: int
    text: str
    done: bool

    class Config:
        from_attributes = True


# ===== Notification =====
class NotificationSettingUpdate(BaseModel):
    condition_reminder: Optional[bool] = None
    workout_reminder: Optional[bool] = None
    injury_alert: Optional[bool] = None
    menstrual_reminder: Optional[bool] = None
    mission_notification: Optional[bool] = None


class NotificationSettingResponse(NotificationSettingUpdate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ===== TrainingLog =====
class TrainingLogCreate(BaseModel):
    date: str
    elapsed_seconds: int = 0
    exercise_count: int = 0
    srpe: Optional[int] = None
    srpe_intensity: Optional[str] = None
    srpe_duration: Optional[int] = None


class TrainingLogResponse(TrainingLogCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ===== Schedule =====
class ScheduleCreate(BaseModel):
    type: str
    title: str
    date: Optional[str] = None
    time: Optional[str] = None
    memo: Optional[str] = None


class ScheduleResponse(ScheduleCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True
