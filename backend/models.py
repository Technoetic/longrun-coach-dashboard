from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=True)
    role = Column(String(20), default="athlete")
    sport = Column(String(50), nullable=True)
    team_code = Column(String(10), nullable=True)
    team_name = Column(String(100), nullable=True)
    player_code = Column(String(20), unique=True, nullable=True)
    student_code = Column(String(20), nullable=True)
    onboarding_done = Column(Boolean, default=False)
    training_frequency = Column(String(50), nullable=True)
    watch_device = Column(String(100), nullable=True)
    profile_photo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conditions = relationship("Condition", back_populates="user", cascade="all, delete-orphan")
    menstrual_cycles = relationship("MenstrualCycle", back_populates="user", cascade="all, delete-orphan")
    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    injuries = relationship("Injury", back_populates="user", cascade="all, delete-orphan")
    todos = relationship("Todo", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("NotificationSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Condition(Base):
    __tablename__ = "conditions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sleep = Column(Float, nullable=True)
    fatigue = Column(Float, nullable=True)
    mood = Column(Float, nullable=True)
    energy = Column(Float, nullable=True)
    composite_score = Column(Float, nullable=True)
    acwr = Column(Float, nullable=True)
    srpe = Column(Integer, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conditions")


class MenstrualCycle(Base):
    __tablename__ = "menstrual_cycles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="menstrual_cycles")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    duration_seconds = Column(Integer, default=0)
    srpe = Column(Integer, nullable=True)
    intensity = Column(String(20), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")


class Injury(Base):
    __tablename__ = "injuries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    part_name = Column(String(50), nullable=False)
    side = Column(String(10), nullable=True)
    risk_percent = Column(Float, nullable=True)
    risk_level = Column(String(20), nullable=True)
    diagnosis = Column(Text, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="injuries")


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(500), nullable=False)
    done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="todos")


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    condition_reminder = Column(Boolean, default=True)
    workout_reminder = Column(Boolean, default=True)
    injury_alert = Column(Boolean, default=True)
    menstrual_reminder = Column(Boolean, default=True)
    mission_notification = Column(Boolean, default=True)

    user = relationship("User", back_populates="notifications")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ParentChild(Base):
    __tablename__ = "parent_children"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    child_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    encrypted_text = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class WatchRecord(Base):
    __tablename__ = "watch_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    heart_rate = Column(Float, nullable=True)
    resting_heart_rate = Column(Float, nullable=True)
    walking_heart_rate = Column(Float, nullable=True)
    hrv = Column(Float, nullable=True)
    blood_oxygen = Column(Float, nullable=True)
    # Phase 2-C: per-minute HR stream statistics (R21 cat=0x03)
    heart_rate_max = Column(Float, nullable=True)
    heart_rate_avg = Column(Float, nullable=True)
    heart_rate_samples_count = Column(Integer, nullable=True)
    steps = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    active_calories = Column(Float, nullable=True)
    basal_calories = Column(Float, nullable=True)
    exercise_minutes = Column(Float, nullable=True)
    stand_minutes = Column(Float, nullable=True)
    flights_climbed = Column(Float, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    env_audio_db = Column(Float, nullable=True)
    headphone_audio_db = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False)
    elapsed_seconds = Column(Integer, default=0)
    exercise_count = Column(Integer, default=0)
    srpe = Column(Integer, nullable=True)
    srpe_intensity = Column(String(20), nullable=True)
    srpe_duration = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # "medical", "psych", "competition"
    title = Column(String(200), nullable=False)
    date = Column(String(10), nullable=True)
    time = Column(String(10), nullable=True)
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
