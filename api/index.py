from datetime import datetime
from http.server import BaseHTTPRequestHandler

from backend.services import atm_service

from ._utils import ensure_service, handle_options, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        ensure_service()
        payload = {
            "message": "Saham Bank Geomarketing AI API",
            "version": "1.0.0",
            "status": "active",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metrics": {
                "models_loaded": atm_service.predictor.is_trained,
                "atms_cached": len(atm_service.existing_atms),
            },
            "endpoints": {
                "predict": "/api/predict",
                "existing_atms": "/api/atms",
                "health": "/api/health",
                "dashboard": "/api/analytics/dashboard",
                "competitors": "/api/competitors",
                "population": "/api/population",
            },
        }
        respond_json(self, 200, payload)

    def log_message(self, format, *args):
        return

