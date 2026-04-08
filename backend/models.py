from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    teams = relationship("TeamMember", back_populates="account")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sport = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(6), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    members = relationship("TeamMember", back_populates="team")
    players = relationship("Player", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    account = relationship("Account", back_populates="teams")
    team = relationship("Team", back_populates="members")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    code = Column(String(10), nullable=False)
    name = Column(String(50), nullable=False)
    number = Column(Integer, nullable=True)
    status = Column(String(1), default="g")

    team = relationship("Team", back_populates="players")
    daily_data = relationship("DailyData", back_populates="player")


class DailyData(Base):
    __tablename__ = "daily_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    date = Column(String(10), nullable=False)
    status = Column(String(1), nullable=False)
    hr = Column(Integer)
    rhr = Column(Integer)
    hrv = Column(Integer)
    spo2 = Column(Integer)
    steps = Column(Integer)
    cal = Column(Integer)
    exercise = Column(Integer)
    sleep = Column(Float)
    stress = Column(Integer)
    acwr = Column(Float)
    pain = Column(Integer)

    player = relationship("Player", back_populates="daily_data")


class Dday(Base):
    __tablename__ = "dday"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    name = Column(String(100), nullable=False)
    date = Column(String(10), nullable=False)
