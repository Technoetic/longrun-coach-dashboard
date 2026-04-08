from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import math
import random
import os

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
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24h

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── In-Memory DB (프로토타입) ──
db_accounts = []
db_teams = []
db_dday = {}


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
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        account = next((a for a in db_accounts if a["email"] == email), None)
        if not account:
            raise HTTPException(status_code=401, detail="User not found")
        return account
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(chars) for _ in range(6))


def seed_random(seed: int) -> float:
    x = math.sin(seed) * 10000
    return x - math.floor(x)


# ── Auth API ──
@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(req: SignupRequest):
    if any(a["email"] == req.email for a in db_accounts):
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다")
    account = {
        "email": req.email,
        "password": pwd_context.hash(req.password),
        "phone": req.phone,
        "teams": [],
    }
    db_accounts.append(account)
    return TokenResponse(access_token=create_token(req.email))


@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    account = next((a for a in db_accounts if a["email"] == req.email), None)
    if not account or not pwd_context.verify(req.password, account["password"]):
        raise HTTPException(status_code=401, detail="계정정보가 없거나 일치하지 않습니다")
    return TokenResponse(access_token=create_token(req.email))


@app.post("/api/auth/find-id")
def find_id(req: FindIdRequest):
    phone = req.phone.replace("-", "")
    account = next(
        (a for a in db_accounts if a["phone"].replace("-", "") == phone), None
    )
    if not account:
        raise HTTPException(status_code=404, detail="해당 전화번호로 가입된 계정이 없습니다")
    masked = account["email"][:2] + "****" + account["email"][account["email"].index("@"):]
    return {"email": masked}


@app.post("/api/auth/find-pw")
def find_pw(req: FindPwRequest):
    account = next((a for a in db_accounts if a["email"] == req.email), None)
    if not account:
        raise HTTPException(status_code=404, detail="해당 이메일로 가입된 계정이 없습니다")
    return {"message": "비밀번호 재설정 링크가 발송되었습니다"}


# ── Team API ──
@app.post("/api/teams")
def create_team(req: TeamCreateRequest):
    code = generate_code()
    team = {"sport": req.sport, "name": req.name, "code": code, "players": []}
    db_teams.append(team)
    return team


@app.post("/api/teams/join")
def join_team(req: TeamJoinRequest):
    team = next((t for t in db_teams if t["code"] == req.code.upper()), None)
    if not team:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다")
    return team


@app.get("/api/teams")
def list_teams():
    return db_teams


@app.delete("/api/teams/{code}")
def delete_team(code: str):
    team = next((t for t in db_teams if t["code"] == code), None)
    if not team:
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다")
    db_teams.remove(team)
    return {"message": "삭제되었습니다"}


# ── D-Day API ──
@app.get("/api/dday")
def get_dday():
    if not db_dday:
        return None
    return db_dday


@app.post("/api/dday")
def save_dday(req: DdayRequest):
    db_dday.update({"name": req.name, "date": req.date})
    return db_dday


@app.delete("/api/dday")
def delete_dday():
    db_dday.clear()
    return {"message": "삭제되었습니다"}


# ── Player Data API (시드 기반 생성 — 프론트엔드와 동일) ──
@app.get("/api/players")
def get_players():
    players = [
        {"id": "KM", "name": "김민수", "number": 7, "status": "g"},
        {"id": "PK", "name": "박서진", "number": 11, "status": "r"},
        {"id": "LJ", "name": "이준호", "number": 4, "status": "y"},
        {"id": "CH", "name": "최하은", "number": 9, "status": "g"},
        {"id": "JG", "name": "정기훈", "number": 22, "status": "y"},
    ]
    return players


@app.get("/api/players/{player_id}/day/{year}/{month}/{day}")
def get_day_data(player_id: str, year: int, month: int, day: int):
    today = datetime.now()
    target = datetime(year, month + 1, day) if month < 12 else datetime(year + 1, 1, day)

    seed = year * 10000 + month * 100 + day
    rv = seed_random(seed)

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


# ── Static Files (프론트엔드 서빙) ──
app.mount("/src", StaticFiles(directory="src"), name="src")
app.mount("/pages", StaticFiles(directory="pages", html=True), name="pages")


@app.get("/")
def root():
    return FileResponse("pages/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
