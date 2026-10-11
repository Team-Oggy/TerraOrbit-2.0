import requests
from typing import Dict, Any

def fetch_soilgrids(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches SoilGrids REST API data.
    """
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query"
    params = {
        "lon": lon,
        "lat": lat,
        "property": ["phh2o", "soc", "nitrogen"],
        "depth": ["0-5cm"],
        "value": ["mean"]
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching SoilGrids data: {e}")
        return {}

def sync_soil_data(farm_id: int, lat: float, lon: float, db) -> None:
    """
    Syncs SoilGrids data as an estimated SoilTest if none exist for today.
    """
    print(f"Attempting to sync live soil data for farm {farm_id}...")
    data = fetch_soilgrids(lat, lon)
    if not data:
        return
        
    properties = data.get("properties", {}).get("layers", [])
    
    ph = 7.0
    soc = 1.0
    nitrogen = 0.0
    
    for layer in properties:
        name = layer.get("name")
        depths = layer.get("depths", [])
        if not depths: continue
        val = depths[0].get("values", {}).get("mean")
        if not val: continue
        
        if name == "phh2o":
            ph = val / 10.0 # SoilGrids pH is scaled by 10
        elif name == "soc":
            soc = val / 10.0 # cg/kg to %
        elif name == "nitrogen":
            nitrogen = val
            
    from app.models import SoilTest
    from datetime import date
    
    # Check if we already synced today
    today = date.today()
    existing = db.query(SoilTest).filter(
        SoilTest.farm_id == farm_id,
        SoilTest.date == today,
        SoilTest.is_estimate == True
    ).first()
    
    if not existing:
        new_test = SoilTest(
            farm_id=farm_id,
            date=today,
            ph=ph,
            organic_carbon=soc,
            nitrogen=nitrogen,
            moisture=15.0, # Placeholder
            phosphorus=20.0, # Placeholder
            potassium=150.0, # Placeholder
            is_estimate=True,
            source_metadata="SoilGrids v2.0 REST API"
        )
        db.add(new_test)
        db.commit()
