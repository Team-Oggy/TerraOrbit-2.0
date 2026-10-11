from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Date, Text
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime, date

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    phone_number = Column(String, unique=True, index=True)
    farms = relationship("Farm", back_populates="owner")

class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    lat = Column(Float)
    lon = Column(Float)
    boundary_geojson = Column(Text) # Storing GeoJSON as text
    crop_type = Column(String)
    variety = Column(String)
    sowing_date = Column(Date)
    soil_type = Column(String)
    irrigation_type = Column(String)
    season = Column(String)
    area_hectares = Column(Float)

    owner = relationship("User", back_populates="farms")
    weather_records = relationship("WeatherRecord", back_populates="farm")
    satellite_observations = relationship("SatelliteObservation", back_populates="farm")
    soil_tests = relationship("SoilTest", back_populates="farm")
    field_zones = relationship("FieldZone", back_populates="farm")
    crop_predictions = relationship("CropPrediction", back_populates="farm")
    action_plans = relationship("ActionPlan", back_populates="farm")

class WeatherRecord(Base):
    __tablename__ = "weather_records"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    date = Column(Date, index=True)
    is_forecast = Column(Boolean, default=False)
    min_temp = Column(Float)
    max_temp = Column(Float)
    precipitation = Column(Float)
    wind_speed = Column(Float)
    conditions = Column(String)
    
    farm = relationship("Farm", back_populates="weather_records")

class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    date = Column(Date, index=True)
    ndvi_avg = Column(Float)
    ndmi_avg = Column(Float)
    cloud_cover = Column(Float)
    source_metadata = Column(Text) # JSON string

    farm = relationship("Farm", back_populates="satellite_observations")

class SoilTest(Base):
    __tablename__ = "soil_tests"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    date = Column(Date, index=True)
    ph = Column(Float)
    organic_carbon = Column(Float)
    nitrogen = Column(Float)
    phosphorus = Column(Float)
    potassium = Column(Float)
    moisture = Column(Float)
    is_estimate = Column(Boolean, default=False)
    source_metadata = Column(Text)

    farm = relationship("Farm", back_populates="soil_tests")

class FieldZone(Base):
    __tablename__ = "field_zones"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    name = Column(String)
    status = Column(String) # "Possible water stress", "No immediate anomaly detected"
    notes = Column(Text)

    farm = relationship("Farm", back_populates="field_zones")

class CropPrediction(Base):
    __tablename__ = "crop_predictions"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    prediction_date = Column(Date, index=True)
    estimated_yield = Column(Float) # e.g. tons per hectare
    confidence = Column(String) # "High", "Medium", "Low"
    assumptions = Column(Text)

    farm = relationship("Farm", back_populates="crop_predictions")

class ActionPlan(Base):
    __tablename__ = "action_plans"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    date = Column(Date, index=True)
    task = Column(String)
    reason = Column(Text)
    priority = Column(String) # "High", "Medium", "Low"
    status = Column(String) # "Pending", "Completed"

    farm = relationship("Farm", back_populates="action_plans")
