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
            "status": "healthy",  # plus de notion de modèle
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "models_loaded": False,  # ML désactivée
            "atms_count": len(atm_service.existing_atms),
        }

        respond_json(self, 200, payload)

    def log_message(self, format, *args):
        return
