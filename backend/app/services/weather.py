import requests
from datetime import date, timedelta
from typing import List, Dict, Any

def sync_open_meteo(farm_id: int, lat: float, lon: float, db) -> None:
    """
    Fetches past 2 days and 7 day forecast from Open-Meteo.
    Parses and updates the WeatherRecord in DB.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "wind_speed_10m_max", "weather_code"],
        "timezone": "auto",
        "past_days": 2,
        "forecast_days": 7
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        daily = data.get("daily", {})
        times = daily.get("time", [])
        
        from app.models import WeatherRecord
        from datetime import datetime
        
        for i, date_str in enumerate(times):
            record_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            is_forecast = record_date > date.today()
            
            # Map weather code to condition string roughly (WMO codes)
            code = daily.get("weather_code", [])[i]
            condition = "Clear"
            if code in [1, 2, 3]: condition = "Partly Cloudy"
            elif code in [45, 48]: condition = "Fog"
            elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]: condition = "Rain"
            elif code in [71, 73, 75, 85, 86]: condition = "Snow"
            elif code >= 95: condition = "Thunderstorm"
            
            # Check if record exists
            existing = db.query(WeatherRecord).filter(
                WeatherRecord.farm_id == farm_id,
                WeatherRecord.date == record_date
            ).first()
            
            if existing:
                existing.is_forecast = is_forecast
                existing.min_temp = daily.get("temperature_2m_min", [])[i]
                existing.max_temp = daily.get("temperature_2m_max", [])[i]
                existing.precipitation = daily.get("precipitation_sum", [])[i]
                existing.wind_speed = daily.get("wind_speed_10m_max", [])[i]
                existing.conditions = condition
            else:
                new_record = WeatherRecord(
                    farm_id=farm_id,
                    date=record_date,
                    is_forecast=is_forecast,
                    min_temp=daily.get("temperature_2m_min", [])[i],
                    max_temp=daily.get("temperature_2m_max", [])[i],
                    precipitation=daily.get("precipitation_sum", [])[i],
                    wind_speed=daily.get("wind_speed_10m_max", [])[i],
                    conditions=condition
                )
                db.add(new_record)
        
        db.commit()
    except Exception as e:
        print(f"Error syncing weather data: {e}")
