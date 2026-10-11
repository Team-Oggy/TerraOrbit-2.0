import requests
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("Running TerraOrbit Backend E2E Tests...")
    
    # 1. Test Demo Authentication
    print("Testing Authentication...")
    res = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone_number": "+1234567890", "full_name": "Test User"})
    assert res.status_code == 200, f"Send OTP failed: {res.text}"
    
    res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={"phone_number": "+1234567890", "otp": "123456", "full_name": "Test User"})
    assert res.status_code == 200, f"Verify OTP failed: {res.text}"
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Authentication Passed!")
    
    # 2. Test Farm Retrieval
    print("Testing Farm Data integrity...")
    res = requests.get(f"{BASE_URL}/api/farms", headers=headers)
    assert res.status_code == 200, "Get farms failed"
    farms = res.json()
    assert len(farms) == 6, f"Expected 6 demo farms, got {len(farms)}"
    print(f"Verified {len(farms)} farms exist.")
    
    # 3. Test Field Data specifics
    for farm in farms:
        f_id = farm['id']
        
        # Details
        farm_detail = requests.get(f"{BASE_URL}/api/farms/{f_id}", headers=headers).json()
        assert "boundary_geojson" in farm_detail
        
        # Weather
        weather = requests.get(f"{BASE_URL}/api/farms/{f_id}/weather", headers=headers).json()
        assert len(weather) > 0, f"No weather for farm {f_id}"
        
        # Satellite
        sat = requests.get(f"{BASE_URL}/api/farms/{f_id}/satellite", headers=headers).json()
        assert len(sat) > 0, f"No satellite data for farm {f_id}"
        
        # Soil
        soil = requests.get(f"{BASE_URL}/api/farms/{f_id}/soil", headers=headers).json()
        assert len(soil) > 0, f"No soil data for farm {f_id}"
        
        # Yield Predictions
        preds = requests.get(f"{BASE_URL}/api/farms/{f_id}/crop-prediction", headers=headers).json()
        assert len(preds) > 0, f"No crop predictions for farm {f_id}"
        
        # Plan
        plans = requests.get(f"{BASE_URL}/api/farms/{f_id}/plan", headers=headers).json()
        assert len(plans) == 7, f"Expected 7 day plan for farm {f_id}, got {len(plans)}"
        
        # Toggle Task
        first_plan_id = plans[0]['id']
        old_status = plans[0]['status']
        toggle_res = requests.post(f"{BASE_URL}/api/farms/{f_id}/plan/{first_plan_id}/toggle", headers=headers).json()
        assert toggle_res['new_status'] != old_status, "Toggle failed"
        
    print("All backend endpoints successfully verified and tested.")
    
if __name__ == "__main__":
    try:
        run_tests()
        sys.exit(0)
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
