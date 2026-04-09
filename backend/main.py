from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import httpx
import os

# ── App ──
app = FastAPI(title="LongRun Coach Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB (LongRun-App MySQL 직접 연결) ──
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
Session = sessionmaker(bind=engine)

# ── KG Chat (BizRouter API) ──
BIZROUTER_API_KEY = os.getenv("BIZROUTER_API_KEY", "")


# ── Models ──
class ChatRequest(BaseModel):
    message: str
    session_id: str = ""


# ── /api/coach/players ──
@app.get("/api/coach/players")
def coach_players():
    db = Session()
    try:
        rows = db.execute(text("""
            SELECT
                u.id, u.name, u.sport, u.gender,
                w.heart_rate AS hr,
                w.resting_heart_rate AS rhr,
                w.walking_heart_rate AS walking_hr,
                w.hrv,
                w.blood_oxygen AS spo2,
                w.steps,
                w.distance_km,
                w.active_calories AS active_cal,
                w.basal_calories AS basal_cal,
                w.exercise_minutes AS exercise_min,
                w.stand_minutes AS stand_min,
                w.flights_climbed AS flights,
                w.sleep_hours AS sleep,
                w.env_audio_db AS env_db,
                w.headphone_audio_db AS earphone_db,
                w.created_at AS watch_at,
                c.acwr,
                c.composite_score AS score,
                c.sleep AS condition_sleep,
                c.fatigue AS stress
            FROM users u
            LEFT JOIN (
                SELECT wr.* FROM watch_records wr
                INNER JOIN (
                    SELECT user_id, MAX(created_at) AS max_at
                    FROM watch_records GROUP BY user_id
                ) latest ON wr.user_id = latest.user_id AND wr.created_at = latest.max_at
            ) w ON u.id = w.user_id
            LEFT JOIN (
                SELECT co.* FROM conditions co
                INNER JOIN (
                    SELECT user_id, MAX(recorded_at) AS max_at
                    FROM conditions GROUP BY user_id
                ) latest ON co.user_id = latest.user_id AND co.recorded_at = latest.max_at
            ) c ON u.id = c.user_id
            WHERE u.role = 'athlete' OR u.role IS NULL
            ORDER BY u.id
        """)).fetchall()

        players = []
        for r in rows:
            row = dict(r._mapping)
            # status 계산
            acwr = row.get("acwr")
            score = row.get("score")
            stress = row.get("stress")
            if score is not None:
                if score >= 60:
                    status = "g"
                elif score >= 40:
                    status = "y"
                else:
                    status = "r"
            elif acwr is not None:
                if acwr <= 1.2:
                    status = "g"
                elif acwr <= 1.5:
                    status = "y"
                else:
                    status = "r"
            else:
                status = "g"

            # hrv_change 계산 (간략화)
            hrv_change = None
            if row.get("hrv") is not None:
                hrv_change = "+0%"

            # pain 계산 (conditions에서)
            pain = 0
            if stress and stress > 50:
                pain = 4
            elif stress and stress > 30:
                pain = 2

            players.append({
                "id": row["id"],
                "name": row["name"],
                "sport": row.get("sport") or "",
                "gender": row.get("gender") or "",
                "status": status,
                "hrv": row.get("hrv"),
                "hrv_change": hrv_change,
                "rhr": row.get("rhr"),
                "sleep": row.get("sleep"),
                "stress": int(stress) if stress else None,
                "acwr": float(acwr) if acwr else None,
                "pain": pain,
                "hr": row.get("hr"),
                "spo2": row.get("spo2"),
                "steps": int(row["steps"]) if row.get("steps") else None,
                "active_cal": row.get("active_cal"),
                "exercise_min": row.get("exercise_min"),
                "score": float(score) if score else None,
                "watch_at": row["watch_at"].isoformat() if row.get("watch_at") else None,
                "walking_hr": row.get("walking_hr"),
                "distance_km": row.get("distance_km"),
                "stand_min": row.get("stand_min"),
                "flights": int(row["flights"]) if row.get("flights") else None,
                "env_db": row.get("env_db"),
                "earphone_db": row.get("earphone_db"),
                "basal_cal": row.get("basal_cal"),
            })

        return players
    finally:
        db.close()


# ── /api/kg/coach-chat ──
@app.post("/api/kg/coach-chat")
async def kg_coach_chat(req: ChatRequest):
    if not BIZROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="BIZROUTER_API_KEY not configured")

    db = Session()
    try:
        # KG context 수집: 관련 논문 검색
        papers_rows = db.execute(text("""
            SELECT id, title, authors, year, doi, journal, category
            FROM kg_papers
            ORDER BY RAND()
            LIMIT 5
        """)).fetchall()

        kg_context = ""
        papers = []
        for p in papers_rows:
            row = dict(p._mapping)
            citation = f"{row['authors']} ({row['year']}). {row['title']}. {row['journal'] or ''}"
            papers.append({"citation": citation, "doi": row.get("doi") or ""})
            kg_context += f"- {citation}\n"

        # BizRouter API (LLM) 호출
        system_prompt = f"""너는 스포츠 과학 전문 코치 AI 어시스턴트다.
선수의 훈련 부하, 부상 예방, 회복, 수면, 컨디션 관리에 대해 근거 기반 조언을 제공한다.
다음 논문을 참고하여 답변하라:
{kg_context}"""

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.bizrouter.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {BIZROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": req.message},
                    ],
                    "max_tokens": 1000,
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="AI 응답 오류")

        data = resp.json()
        reply = data["choices"][0]["message"]["content"]
        return {"reply": reply, "papers": papers}

    finally:
        db.close()


# ── /api/watch-data (워치 데이터 수신) ──
@app.post("/api/watch-data")
def receive_watch_data(data: dict):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email 필요")

    db = Session()
    try:
        user = db.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email}).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="사용자 없음")
        user_id = user[0]

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
        score = 50
        if hrv and hrv > 50: score += 15
        elif hrv and hrv < 30: score -= 15
        if sleep and sleep >= 7: score += 10
        elif sleep and sleep < 6: score -= 10
        if spo2 and spo2 >= 95: score += 5
        elif spo2 and spo2 < 95: score -= 15
        if rhr and rhr < 65: score += 5
        elif rhr and rhr > 85: score -= 10
        score = max(0, min(100, score))

        # ACWR 추정
        acwr = 1.0
        if steps:
            if steps > 12000: acwr = 1.3
            elif steps > 8000: acwr = 1.1
            elif steps < 3000: acwr = 0.7

        fatigue = max(1, min(10, 10 - int(score / 10)))
        energy = max(1, min(10, int(score / 10)))
        mood = max(1, min(10, int(score / 12) + 3))

        # conditions 저장
        db.execute(text("""
            INSERT INTO conditions (user_id, sleep, fatigue, mood, energy, composite_score, acwr, srpe)
            VALUES (:uid, :sleep, :fatigue, :mood, :energy, :score, :acwr, 0)
        """), {"uid": user_id, "sleep": sleep or 0, "fatigue": fatigue, "mood": mood,
               "energy": energy, "score": score, "acwr": acwr})

        # watch_records 저장
        db.execute(text("""
            INSERT INTO watch_records
                (user_id, heart_rate, resting_heart_rate, walking_heart_rate, hrv, blood_oxygen,
                 steps, distance_km, active_calories, basal_calories, exercise_minutes,
                 stand_minutes, flights_climbed, sleep_hours, env_audio_db, headphone_audio_db)
            VALUES
                (:uid, :hr, :rhr, :whr, :hrv, :spo2,
                 :steps, :dist, :acal, :bcal, :exmin,
                 :stand, :flights, :sleep, :env, :ear)
        """), {
            "uid": user_id, "hr": hr, "rhr": rhr, "whr": data.get("walking_heart_rate"),
            "hrv": hrv, "spo2": spo2, "steps": steps, "dist": data.get("distance_km"),
            "acal": active_cal, "bcal": basal_cal, "exmin": data.get("exercise_minutes"),
            "stand": data.get("stand_minutes"), "flights": data.get("flights_climbed"),
            "sleep": sleep, "env": data.get("env_audio_db"), "ear": data.get("headphone_audio_db"),
        })

        db.commit()
        return {"status": "ok", "user_id": user_id, "condition_score": score, "acwr": acwr}
    finally:
        db.close()


# ── Health Check ──
@app.get("/api/health")
def health():
    try:
        db = Session()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "ok", "db": f"error: {str(e)}"}


# ── Static Files ──
app.mount("/src", StaticFiles(directory="src"), name="src")
app.mount("/pages", StaticFiles(directory="pages", html=True), name="pages")


@app.get("/")
def root():
    return FileResponse("pages/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
