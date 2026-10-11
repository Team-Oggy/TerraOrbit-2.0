from datetime import date
from sqlalchemy.orm import Session

def generate_action_plan(farm_id: int, db: Session) -> None:
    """
    Rule-based engine for generating 7-day action plans based on weather, soil, and satellite data.
    """
    from app.models import Farm, WeatherRecord, SatelliteObservation, FieldZone, ActionPlan
    
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm: return
    
    today = date.today()
    
    # Check if a plan was already generated today to avoid duplicates
    existing_plan = db.query(ActionPlan).filter(ActionPlan.farm_id == farm_id, ActionPlan.date == today).first()
    if existing_plan:
        return
        
    print(f"Generating action plan for farm {farm_id}...")
        
    # Get latest data
    zones = db.query(FieldZone).filter(FieldZone.farm_id == farm_id).all()
    forecasts = db.query(WeatherRecord).filter(WeatherRecord.farm_id == farm_id, WeatherRecord.date >= today).order_by(WeatherRecord.date).all()
    
    # Rule 1: Field Zone Anomalies
    for zone in zones:
        if "stress" in zone.status.lower() or "anomaly" in zone.status.lower() or "change" in zone.status.lower():
            if zone.status != "No immediate anomaly detected":
                plan = ActionPlan(
                    farm_id=farm_id,
                    date=today,
                    task=f"Inspect {zone.name}",
                    reason=f"Zone status: {zone.status}. {zone.notes}",
                    priority="High",
                    status="Pending"
                )
                db.add(plan)
                
    # Rule 2: Weather Alerts
    heavy_rain_forecast = False
    for f in forecasts:
        if f.precipitation and f.precipitation > 20:
            heavy_rain_forecast = True
            plan = ActionPlan(
                farm_id=farm_id,
                date=f.date,
                task="Prepare for heavy rain",
                reason=f"Forecast indicates {f.precipitation}mm of rain.",
                priority="High",
                status="Pending"
            )
            db.add(plan)
            
    # Rule 3: Routine if no issues
    if not heavy_rain_forecast and all(z.status == "No immediate anomaly detected" for z in zones):
        db.add(ActionPlan(
            farm_id=farm_id,
            date=today,
            task="Routine Field Walk",
            reason="Conditions are stable, perform standard checks.",
            priority="Low",
            status="Pending"
        ))
        
    db.commit()
