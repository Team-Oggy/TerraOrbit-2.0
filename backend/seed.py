import os
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app import models
import json
from datetime import datetime, date, timedelta

# Drop and recreate tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    
    # Create Demo Farmer
    demo_user = models.User(
        full_name="Demo Farmer",
        phone_number="+91 99999 99999"
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    # Polygons near Gandhinagar, Gujarat (~23.30, 72.60)
    # Using approx coordinates. 1 degree lat is ~111km. 
    # 0.001 deg is ~111m.
    # We want 8 to 25 acres (3 to 10 hectares).
    # 1 hectare is 10,000 sq meters. (e.g. 100m x 100m).
    # So 3 hectares is ~ 100m x 300m (~0.001 x 0.003 degrees).
    
    # Field 1: Cotton (approx 10 acres ~ 4 ha)
    # let's say 200m x 200m
    f1_polygon = {
        "type": "Polygon",
        "coordinates": [[
            [72.601, 23.301],
            [72.603, 23.3015],
            [72.6035, 23.303],
            [72.601, 23.3035],
            [72.600, 23.302],
            [72.601, 23.301]
        ]]
    }
    
    # Field 2: Paddy (approx 12 acres ~ 5 ha)
    f2_polygon = {
        "type": "Polygon",
        "coordinates": [[
            [72.603, 23.3015],
            [72.606, 23.301],
            [72.6065, 23.303],
            [72.6035, 23.303],
            [72.603, 23.3015]
        ]]
    }

    # Field 3: Mustard (approx 15 acres ~ 6 ha)
    f3_polygon = {
        "type": "Polygon",
        "coordinates": [[
            [72.6035, 23.303],
            [72.6065, 23.303],
            [72.607, 23.305],
            [72.605, 23.306],
            [72.603, 23.305],
            [72.6035, 23.303]
        ]]
    }

    def calc_centroid(coords):
        pts = coords[0]
        x = sum(p[0] for p in pts[:-1]) / (len(pts)-1)
        y = sum(p[1] for p in pts[:-1]) / (len(pts)-1)
        return (y, x)

    f1_c = calc_centroid(f1_polygon["coordinates"])
    f2_c = calc_centroid(f2_polygon["coordinates"])
    f3_c = calc_centroid(f3_polygon["coordinates"])

    farm1 = models.Farm(
        user_id=demo_user.id,
        name="Field 1",
        lat=f1_c[0],
        lon=f1_c[1],
        boundary_geojson=json.dumps(f1_polygon),
        crop_type="Cotton",
        variety="Bt Cotton",
        sowing_date=date(2026, 6, 15),
        soil_type="Black Cotton Soil",
        irrigation_type="Drip",
        season="Kharif 2026",
        area_hectares=4.0
    )

    farm2 = models.Farm(
        user_id=demo_user.id,
        name="Field 2",
        lat=f2_c[0],
        lon=f2_c[1],
        boundary_geojson=json.dumps(f2_polygon),
        crop_type="Paddy",
        variety="Basmati",
        sowing_date=date(2026, 7, 10),
        soil_type="Clay Loam",
        irrigation_type="Flood",
        season="Kharif 2026",
        area_hectares=5.0
    )

    farm3 = models.Farm(
        user_id=demo_user.id,
        name="Field 3",
        lat=f3_c[0],
        lon=f3_c[1],
        boundary_geojson=json.dumps(f3_polygon),
        crop_type="Mustard",
        variety="Pusa Mustard",
        sowing_date=date(2026, 10, 5),
        soil_type="Sandy Loam",
        irrigation_type="Sprinkler",
        season="Rabi 2026",
        area_hectares=6.0
    )

    db.add(farm1)
    db.add(farm2)
    db.add(farm3)
    db.commit()
    print("Database seeded with 3 new farms.")

if __name__ == "__main__":
    seed_db()
