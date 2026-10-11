import os
import json
from google import genai
from typing import List, Dict, Any

def generate_actionable_calendar(weather_data: Dict[str, Any], agro_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Uses Google Gemini 1.5 Flash to analyze weather and soil data
    and output a 7-day actionable calendar as strict JSON.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Mock fallback if no API key
    mock_calendar = [
        {"date": "MON, AUG 12", "event_type": "satellite_pass", "title": "Sentinel-2A Pass", "description": "Cloud-free capture expected."},
        {"date": "TUE, AUG 13", "event_type": "weather_alert", "title": "0.2\" Rain Recorded", "description": "Light precipitation in the morning."},
        {"date": "TODAY, AUG 14", "event_type": "action_req", "title": "Action Req: Irrig.", "description": "Root-zone moisture critical. Quick 4h Drip recommended.", "is_alert": True},
        {"date": "THU, AUG 15", "event_type": "weather_alert", "title": "Extreme Heat Warn.", "description": "Temperatures expected to exceed 100°F."},
        {"date": "FRI, AUG 16", "event_type": "satellite_pass", "title": "Landsat-9 Pass", "description": "Thermal IR capture scheduled."}
    ]

    if not api_key or api_key == "your_gemini_api_key_here":
        print("Using mock Gemini calendar (API key not configured)")
        return mock_calendar

    try:
        # Initialize the modern genai client
        client = genai.Client(api_key=api_key)

        prompt = f"""
        Analyze the following agricultural data for a farm.
        
        Agromonitoring Data (NDVI, Soil Moisture):
        {json.dumps(agro_data)}
        
        Open-Meteo Data (7-day forecast):
        {json.dumps(weather_data)[:1000]} ... (truncated for brevity)
        
        Generate a daily actionable calendar for the next 7 days based on this data.
        Return the response STRICTLY as a JSON array of objects with the following keys:
        - date (e.g., 'MON, AUG 12' or 'TODAY, AUG 14')
        - event_type (string, e.g., 'satellite_pass', 'weather_alert', 'action_req')
        - title (string, short title, e.g., 'Action Req: Irrig.')
        - description (string, brief explanation)
        - is_alert (boolean, optional, true if it requires immediate attention like irrigation)
        
        Do not include markdown formatting, backticks, or extra text. Output ONLY valid JSON.
        """

        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
        )
        
        # Clean response string (remove potential markdown code blocks)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        calendar_data = json.loads(text.strip())
        return calendar_data
    except Exception as e:
        print(f"Error generating calendar with LLM: {e}")
        return mock_calendar
