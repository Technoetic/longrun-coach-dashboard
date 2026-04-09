"""Injury prediction engine — endurance + mixed + general"""
import json
import os
import joblib
import numpy as np
import xgboost as xgb

ML_DIR = os.path.join(os.path.dirname(__file__), "ml")

# Engine registry: pattern → model files
ENGINE_MAP = {
    "endurance": "endurance",   # 지구성, 폭발성, 기술
    "mixed": "mixed",           # 혼합
    "general": "general",       # 일반인
}

_cache = {}


def _load(prefix):
    if prefix in _cache:
        return _cache[prefix]
    model = xgb.XGBClassifier()
    model.load_model(os.path.join(ML_DIR, f"{prefix}_model.json"))
    scaler = joblib.load(os.path.join(ML_DIR, f"{prefix}_scaler.pkl"))
    with open(os.path.join(ML_DIR, f"{prefix}_meta.json")) as f:
        meta = json.load(f)
    _cache[prefix] = (model, scaler, meta)
    return model, scaler, meta


def resolve_engine(role: str, pattern: str = None) -> str:
    """Resolve user role + load pattern to engine name"""
    if role in ("general", None, ""):
        return "general"
    # athlete/coach/parent → pattern-based
    if pattern == "mixed":
        return "mixed"
    # endurance, explosive, skill → all use endurance engine
    return "endurance"


def predict_injury(role: str, pattern: str, data: dict) -> dict:
    engine = resolve_engine(role, pattern)
    model, scaler, meta = _load(engine)

    features = meta["features"]
    threshold = meta["threshold"]

    values = [float(data.get(f, 0)) for f in features]
    X = np.array([values])
    X_scaled = scaler.transform(X)

    proba = float(model.predict_proba(X_scaled)[0, 1])
    risk_pct = round(proba * 100, 1)

    if proba >= threshold:
        risk_level = "high"
    elif proba >= threshold * 0.6:
        risk_level = "medium"
    else:
        risk_level = "low"

    importances = model.feature_importances_
    factors = sorted(
        [{"feature": f, "importance": round(float(importances[i]), 4), "value": values[i]}
         for i, f in enumerate(features)],
        key=lambda x: x["importance"], reverse=True
    )

    return {
        "risk_percent": risk_pct,
        "risk_level": risk_level,
        "threshold": round(threshold, 3),
        "engine": engine,
        "top_factors": factors[:5],
    }
