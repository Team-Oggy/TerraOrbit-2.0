import os
import json
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import Date
import hashlib

from app.database import get_db
from app import models

load_dotenv()

app = FastAPI(title="TerraOrbit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-for-terraorbit-demo")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_farm_if_authorized(field_id: int, current_user: models.User, db: Session):
    farm = db.query(models.Farm).filter(models.Farm.id == field_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Field not found")
    if farm.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this field")
    return farm

def envelope(data, source="live"):
    return {
        "data": data,
        "meta": {
            "source": source,
            "generatedAt": datetime.utcnow().isoformat()
        }
    }

def get_seeded_random(field_id: int, seed_key: str):
    # Returns a float between 0 and 1
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    h = hashlib.sha256(f"{field_id}_{today_str}_{seed_key}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF

@app.get("/")
def read_root():
    return {"status": "TerraOrbit Backend is running", "mode": os.getenv("DATA_MODE", "demo")}

@app.post("/api/auth/send-otp")
def send_otp(phone_number: str = Body(...), full_name: Optional[str] = Body(None), db: Session = Depends(get_db)):
    return {"status": "success", "message": "Demo Mode: OTP sent. Use 123456."}

@app.post("/api/auth/verify-otp")
def verify_otp(phone_number: str = Body(...), otp: str = Body(...), full_name: Optional[str] = Body(None), db: Session = Depends(get_db)):
    if otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid Demo OTP")
    
    user = db.query(models.User).filter(models.User.phone_number == phone_number).first()
    if not user:
        if not full_name:
            raise HTTPException(status_code=400, detail="Full name required for new registration")
        user = models.User(phone_number=phone_number, full_name=full_name)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        demo_user = db.query(models.User).filter(models.User.full_name == "Demo Farmer").first()
        if demo_user:
            demo_farms = db.query(models.Farm).filter(models.Farm.user_id == demo_user.id).all()
            for df in demo_farms:
                new_farm = models.Farm(
                    user_id=user.id,
                    name=df.name,
                    lat=df.lat,
                    lon=df.lon,
                    boundary_geojson=df.boundary_geojson,
                    crop_type=df.crop_type,
                    variety=df.variety,
                    sowing_date=df.sowing_date,
                    soil_type=df.soil_type,
                    irrigation_type=df.irrigation_type,
                    season=df.season,
                    area_hectares=df.area_hectares
                )
                db.add(new_farm)
            db.commit()

    token = create_access_token({"user_id": user.id})
    return {"status": "success", "token": token, "user": {"id": user.id, "full_name": user.full_name, "phone_number": user.phone_number}}

@app.get("/api/fields")
@app.get("/api/compare")
def get_compare_fields(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    results = []
    for f in farms:
        rng = random.Random(f"compare_{f.id}_{datetime.utcnow().date()}")
        base_yield = 20.0
        if f.crop_type == "Cotton": base_yield = 10.0
        elif f.crop_type == "Paddy": base_yield = 25.0
        elif f.crop_type == "Mustard": base_yield = 8.0
        
        mandi_price = {"Cotton": 7000, "Paddy": 2200, "Mustard": 5500}.get(f.crop_type, 3000)
        
        area_acres = f.area_hectares * 2.47105
        predicted_yield = base_yield + rng.uniform(-1.0, 1.0)
        revenue = int(predicted_yield * area_acres * mandi_price)
        
        water_use = rng.randint(400, 800) if f.crop_type == "Paddy" else rng.randint(150, 400)
        
        results.append({
            "id": f.id,
            "name": f.name,
            "crop": f.crop_type,
            "area": round(area_acres, 1),
            "yield": round(predicted_yield, 1),
            "revenue": revenue,
            "water": water_use,
            "health": "Excellent" if rng.random() > 0.3 else "Good"
        })
    return envelope(results, source="simulated")

@app.get("/api/fields")
def get_fields(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    results = []
    for f in farms:
        days_after_sowing = (datetime.utcnow().date() - f.sowing_date).days if f.sowing_date else 0
        results.append({
            "id": f.id,
            "name": f.name,
            "crop": f.crop_type,
            "variety": f.variety,
            "area": f.area_hectares * 2.47105, # Acres
            "geometry": json.loads(f.boundary_geojson),
            "stage": "Vegetative" if days_after_sowing < 40 else "Reproductive",
            "health": "Optimal"
        })
    return envelope(results)

@app.get("/api/fields/{field_id}/overview")
def get_field_overview(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    days_after_sowing = (datetime.utcnow().date() - f.sowing_date).days if f.sowing_date else 0
    return envelope({
        "id": f.id,
        "name": f.name,
        "crop": f.crop_type,
        "variety": f.variety,
        "sowingDate": f.sowing_date.isoformat() if f.sowing_date else None,
        "soilType": f.soil_type,
        "irrigationType": f.irrigation_type,
        "areaAcres": f.area_hectares * 2.47105,
        "centroid": [f.lat, f.lon],
        "geometry": json.loads(f.boundary_geojson),
        "daysAfterSowing": days_after_sowing,
        "phenology": [
            {"stage": "Germination", "days": 10},
            {"stage": "Vegetative", "days": 40},
            {"stage": "Reproductive", "days": 30},
            {"stage": "Maturity", "days": 20}
        ]
    })

@app.get("/api/fields/{field_id}/telemetry")
def get_field_telemetry(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    base = get_seeded_random(field_id, "telemetry")
    return envelope({
        "ndvi": 0.5 + (base * 0.4),
        "canopyIndex": 60 + (base * 30),
        "healthTrend": 2.1 if base > 0.5 else -1.2,
        "waterDeficit": 5 + (base * 20),
        "pumpRuntime": 2 + (base * 5),
        "diseaseIndex": base * 0.5,
        "mandiPrice": 2000 + (base * 1000),
        "carbonOffset": 1.2 + (base * 0.8)
    }, source="simulated")

@app.get("/api/fields/{field_id}/soil")
def get_field_soil(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    base = get_seeded_random(field_id, "soil")
    return envelope({
        "moisture": {"value": 20 + (base * 20), "status": "optimal", "target": [25, 35]},
        "temp": {"value": 22 + (base * 5), "status": "optimal", "target": [20, 28]},
        "ph": {"value": 6.0 + (base * 1.5), "status": "optimal", "target": [6.5, 7.5]},
        "nitrogen": {"value": 80 + (base * 40), "status": "low" if base < 0.3 else "optimal", "target": [100, 140]},
        "phosphorus": {"value": 30 + (base * 20), "status": "optimal", "target": [25, 45]},
        "potassium": {"value": 150 + (base * 100), "status": "optimal", "target": [150, 250]},
        "organicCarbon": {"value": 0.8 + (base * 1.0), "status": "low" if base < 0.5 else "optimal", "target": [1.5, 2.5]},
        "salinity": {"value": 1.2 + (base * 2.0), "status": "high" if base > 0.7 else "optimal", "target": [0.5, 1.5]}
    }, source="simulated")

@app.get("/api/fields/{field_id}/zones")
def get_field_zones(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    # Return 4 mock zones
    return envelope([
        {"name": "Zone A (North)", "area_pct": 30, "status": "Optimal", "prescription": "Standard plan"},
        {"name": "Zone B (East)", "area_pct": 25, "status": "Water Deficit", "prescription": "+10mm irrigation"},
        {"name": "Zone C (South)", "area_pct": 25, "status": "Low Nitrogen", "prescription": "Top dressing 20kg/ha"},
        {"name": "Zone D (West)", "area_pct": 20, "status": "Pest Risk", "prescription": "Scout for aphids"}
    ], source="simulated")

@app.get("/api/fields/{field_id}/insights")
def get_field_insights(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    return envelope([
        {"category": "Water", "text": f"Increase irrigation due to low moisture in {f.soil_type}."},
        {"category": "Nutrients", "text": "Nitrogen levels optimal for current stage."},
        {"category": "Disease", "text": "Low risk for fungal pathogens today."},
        {"category": "Market", "text": f"Local mandi price for {f.crop_type} is trending up."}
    ], source="simulated")

# Fallback for weather and yield and plans (stubbed for Step 1-3 to avoid crashing frontends)
@app.get("/api/fields/{field_id}/weather")
def get_field_weather(field_id: int, date: str = None, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    return envelope([], source="simulated")

import random
from datetime import timedelta

@app.get("/api/fields/{field_id}/yield")
def get_field_yield(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    
    rng = random.Random(f"yield_{field_id}_{datetime.utcnow().date()}")
    
    # Base yield logic (Quintals / Acre)
    base_yield = 20.0
    if f.crop_type == "Cotton": base_yield = 10.0
    elif f.crop_type == "Paddy": base_yield = 25.0
    elif f.crop_type == "Mustard": base_yield = 8.0
    
    # Adjust for field specific random noise
    base_yield += rng.uniform(-2.0, 2.0)
    
    # Prices (Rs per Quintal)
    mandi_price = {"Cotton": 7000, "Paddy": 2200, "Mustard": 5500}.get(f.crop_type, 3000)
    
    # Timeline generation (16 weeks of crop season)
    weeks = 16
    start_date = f.sowing_date if f.sowing_date else datetime.utcnow().date() - timedelta(days=50)
    current_week = (datetime.utcnow().date() - start_date).days // 7
    if current_week < 0: current_week = 0
    if current_week > weeks: current_week = weeks
    
    timeline = []
    events = []
    
    current_estimate = base_yield * 0.8
    district_avg = base_yield * rng.uniform(0.9, 0.95)
    last_season = base_yield * rng.uniform(0.85, 1.1)
    
    for w in range(weeks):
        date_str = (start_date + timedelta(weeks=w)).strftime('%d %b')
        is_future = w > current_week
        
        trend = rng.uniform(-0.5, 1.0)
        current_estimate += trend
        uncertainty = 0.5 if not is_future else 0.5 + (w - current_week) * 0.3
        
        data_point = {
            "week": w + 1,
            "date": date_str,
            "district_avg": round(district_avg + rng.uniform(-0.2, 0.2), 1),
            "last_season": round(last_season + rng.uniform(-0.2, 0.2), 1),
            "is_future": is_future
        }
        
        if is_future:
            data_point["forecast"] = round(current_estimate, 1)
            data_point["p10"] = round(current_estimate - uncertainty, 1)
            data_point["p90"] = round(current_estimate + uncertainty, 1)
        else:
            data_point["actual"] = round(current_estimate, 1)
            data_point["p10"] = round(current_estimate - uncertainty * 0.5, 1)
            data_point["p90"] = round(current_estimate + uncertainty * 0.5, 1)
            
        timeline.append(data_point)
        
        if w < current_week and rng.random() > 0.7:
            event_type = rng.choice(["Irrigation", "Rainfall", "Fertilizer", "Spray"])
            events.append({
                "date": date_str,
                "type": event_type,
                "desc": f"{event_type} applied",
                "week": w + 1
            })
            
    predicted_yield = round(current_estimate, 1)
    area_acres = f.area_hectares * 2.47105
    revenue = int(predicted_yield * area_acres * mandi_price)
    
    data = {
        "predicted_yield": predicted_yield,
        "confidence": round(rng.uniform(92.0, 98.0), 1),
        "yoy_change": round(((predicted_yield / last_season) - 1) * 100, 1),
        "vs_district": round(((predicted_yield / district_avg) - 1) * 100, 1),
        "harvest_window": f"{(start_date + timedelta(weeks=weeks)).strftime('%d %b')} - {(start_date + timedelta(weeks=weeks+2)).strftime('%d %b')}",
        "revenue_rs": revenue,
        "mandi_price": mandi_price,
        "timeline": timeline,
        "events": events
    }
    
    return envelope(data, source="simulated")

@app.get("/api/fields/{field_id}/plan")
def get_field_plan(field_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = get_farm_if_authorized(field_id, current_user, db)
    import datetime
    today = datetime.date.today()
    
    # We will just return 7 mock days for the plan
    mock_plan = []
    for i in range(7):
        day_date = today + datetime.timedelta(days=i)
        
        # Make the plan different per field
        irrigation_mm = 0
        if f.crop_type == "Cotton": irrigation_mm = 12 if i % 3 == 0 else 0
        elif f.crop_type == "Paddy": irrigation_mm = 20
        elif f.crop_type == "Mustard": irrigation_mm = 8 if i == 2 else 0
        
        task_text = f"Apply {irrigation_mm}mm water" if irrigation_mm > 0 else "Field scouting"
        
        mock_plan.append({
            "id": int(f"{field_id}0{i}"),
            "day_name": day_date.strftime('%A'),
            "formatted_date": day_date.strftime('%d %b %Y'),
            "weather": {"condition": "Sunny" if i % 2 == 0 else "Cloud", "temp_max": 32 - i, "temp_min": 20 - i},
            "status": "Pending",
            "priority_reason": f"Expected weather conditions favor {f.crop_type} growth.",
            "tasks": [{"id": i, "text": task_text, "time": "08:00 AM", "cost": 150}],
            "do_list": [{"text": "Inspect canopy", "reason": "Check for pests"}],
            "dont_list": [{"text": "Avoid heavy machinery", "reason": "Soil is moist"}],
            "irrigation": {"mm": irrigation_mm, "litres_acre": irrigation_mm * 4000, "best_hour": "06:00 AM"} if irrigation_mm > 0 else None,
            "spray": {"product": "Neem Oil", "dose": "2ml/L", "water": "150L/Acre", "nozzle": "Flat Fan", "re_entry": "12 Hrs"} if i == 1 else None,
            "scouting": ["Check lower leaves", "Monitor soil moisture"] if i % 2 == 0 else [],
            "risk_alerts": [],
            "expected_outcome": "Optimal growth trajectory maintained.",
            "daily_cost": 150 if irrigation_mm > 0 else 0
        })
    return envelope(mock_plan, source="simulated")

@app.post("/api/farms/{field_id}/plan/{plan_id}/toggle")
def toggle_plan_task(field_id: int, plan_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"status": "success", "plan_id": plan_id}


@app.post("/log_error")
async def log_error(request: dict = Body(...)):
    print("FRONTEND ERROR:", request)
    return {"status": "logged"}
