import os

def sync_satellite_data(farm_id: int, boundary_geojson: str, db) -> None:
    """
    Adapter for Sentinel Hub or Google Earth Engine.
    Currently a stub because credentials are not provided.
    """
    print(f"Attempting to sync live satellite data for farm {farm_id}...")
    
    # Check for credentials
    gee_key = os.getenv("GEE_API_KEY")
    sentinel_key = os.getenv("SENTINEL_HUB_CLIENT_ID")
    
    if not gee_key and not sentinel_key:
        print("SATELLITE SYNC SKIPPED: Missing GEE_API_KEY or SENTINEL_HUB_CLIENT_ID in environment.")
        return
        
    print("Connecting to satellite provider...")
    # TODO: Implement GEE or Sentinel Hub data fetch using boundary_geojson.
    # Calculate NDVI, NDMI, Cloud Cover.
    # Insert new SatelliteObservation records into the DB.
