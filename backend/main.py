from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import math
import os

from database import engine, get_db, Base
from models import Account, Team, TeamMember, Player, DailyData, Dday

# ── App ──
app = FastAPI(title="LongRun Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ──
SECRET_KEY = os.getenv("SECRET_KEY", "longrun-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── DB Init ──
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # 시드 데이터: 선수 5명 (팀 없이 독립)
    db = next(get_db())
    if db.query(Player).count() == 0:
        players = [
            Player(code="KM", name="김민수", number=7, status="g"),
            Player(code="PK", name="박서진", number=11, status="r"),
            Player(code="LJ", name="이준호", number=4, status="y"),
            Player(code="CH", name="최하은", number=9, status="g"),
            Player(code="JG", name="정기훈", number=22, status="y"),
        ]
        db.add_all(players)
        db.commit()
    db.close()


# ── Models ──
class SignupRequest(BaseModel):
    email: str
    password: str
    phone: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TeamCreateRequest(BaseModel):
    sport: str
    name: str


class TeamJoinRequest(BaseModel):
    code: str


class DdayRequest(BaseModel):
    name: str
    date: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class FindIdRequest(BaseModel):
    phone: str


class FindPwRequest(BaseModel):
    email: str


# ── Helpers ──
def create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def generate_code() -> str:
    import random
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(chars) for _ in range(6))


def seed_random(seed: int) -> float:
    x = math.sin(seed) * 10000
    return x - math.floor(x)


# ── Auth API ──
@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(Account).filter(Account.email == req.email).first():
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다")
    account = Account(
        email=req.email,
        password=pwd_context.hash(req.password),
        phone=req.phone,
    )
    db.add(account)
    db.commit()
    return TokenResponse(access_token=create_token(req.email))


@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == req.email).first()
    if not account or not pwd_context.verify(req.password, account.password):
        raise HTTPException(status_code=401, detail="계정정보가 없거나 일치하지 않습니다")
    return TokenResponse(access_token=create_token(req.email))


@app.post("/api/auth/find-id")
def find_id(req: FindIdRequest, db: Session = Depends(get_db)):
    phone = req.phone.replace("-", "")
    accounts = db.query(Account).all()
    account = next((a for a in accounts if a.phone and a.phone.replace("-", "") == phone), None)
    if not account:
        raise HTTPException(status_code=404, detail="해당 전화번호로 가입된 계정이 없습니다")
    masked = account.email[:2] + "****" + account.email[account.email.index("@"):]
    return {"email": masked}


@app.post("/api/auth/find-pw")
def find_pw(req: FindPwRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == req.email).first()
    if not account:
        raise HTTPException(status_code=404, detail="해당 이메일로 가입된 계정이 없습니다")
    return {"message": "비밀번호 재설정 링크가 발송되었습니다"}


# ── Team API ──
@app.post("/api/teams")
def create_team(req: TeamCreateRequest, db: Session = Depends(get_db)):
    code = generate_code()
    while db.query(Team).filter(Team.code == code).first():
        code = generate_code()
    team = Team(sport=req.sport, name=req.name, code=code)
    db.add(team)
    db.commit()
    db.refresh(team)
    return {"id": team.id, "sport": team.sport, "name": team.name, "code": team.code}


@app.post("/api/teams/join")
def join_team(req: TeamJoinRequest, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.code == req.code.upper()).first()
    if not team:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다")
    return {"id": team.id, "sport": team.sport, "name": team.name, "code": team.code}


@app.get("/api/teams")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    return [{"id": t.id, "sport": t.sport, "name": t.name, "code": t.code} for t in teams]


@app.delete("/api/teams/{code}")
def delete_team(code: str, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.code == code).first()
    if not team:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다")
    db.delete(team)
    db.commit()
    return {"message": "삭제되었습니다"}


# ── D-Day API ──
@app.get("/api/dday")
def get_dday(db: Session = Depends(get_db)):
    dday = db.query(Dday).first()
    if not dday:
        return None
    return {"name": dday.name, "date": dday.date}


@app.post("/api/dday")
def save_dday(req: DdayRequest, db: Session = Depends(get_db)):
    dday = db.query(Dday).first()
    if dday:
        dday.name = req.name
        dday.date = req.date
    else:
        dday = Dday(account_id=0, name=req.name, date=req.date)
        db.add(dday)
    db.commit()
    return {"name": dday.name, "date": dday.date}


@app.delete("/api/dday")
def delete_dday(db: Session = Depends(get_db)):
    db.query(Dday).delete()
    db.commit()
    return {"message": "삭제되었습니다"}


# ── Player API ──
@app.get("/api/players")
def get_players(db: Session = Depends(get_db)):
    players = db.query(Player).all()
    return [{"id": p.code, "name": p.name, "number": p.number, "status": p.status} for p in players]


@app.get("/api/players/{player_code}/day/{year}/{month}/{day}")
def get_day_data(player_code: str, year: int, month: int, day: int):
    seed = year * 10000 + month * 100 + day
    rv = seed_random(seed)

    today = datetime.now(timezone.utc)
    try:
        target = datetime(year, month + 1, day, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 날짜")

    if target > today:
        raise HTTPException(status_code=404, detail="미래 날짜 데이터 없음")

    s = "g" if rv > 0.7 else ("y" if rv > 0.3 else "r")
    status_label = {"g": "양호", "y": "주의", "r": "위험"}
    base = 1 if s == "g" else (0.7 if s == "y" else 0.4)

    return {
        "status": s,
        "statusLabel": status_label[s],
        "hr": round(62 + seed_random(seed + 1) * 30),
        "rhr": round(52 + seed_random(seed + 2) * 18),
        "hrv": round(40 + base * 30 + seed_random(seed + 3) * 10),
        "spo2": round(95 + seed_random(seed + 4) * 4),
        "steps": round(3000 + seed_random(seed + 5) * 10000),
        "cal": round(200 + seed_random(seed + 6) * 400),
        "exercise": round(10 + seed_random(seed + 7) * 60),
        "sleep": round(5 + base * 2.5 + seed_random(seed + 8), 1),
        "stress": round(20 + (1 - base) * 50 + seed_random(seed + 13) * 15),
        "acwr": round(0.8 + (1 - base) * 0.7 + seed_random(seed + 14) * 0.2, 2),
        "pain": 0 if s == "g" else (round(1 + seed_random(seed + 15) * 3) if s == "y" else round(4 + seed_random(seed + 16) * 5)),
    }


# ── Health Check ──
@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "ok", "db": "connected"}
    except Exception:
        return {"status": "ok", "db": "disconnected"}


# ── Static Files ──
app.mount("/src", StaticFiles(directory="src"), name="src")
app.mount("/pages", StaticFiles(directory="pages", html=True), name="pages")


@app.get("/")
def root():
    return FileResponse("pages/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
