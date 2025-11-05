from http.server import BaseHTTPRequestHandler
from typing import Any, Dict

from pydantic import ValidationError

from backend.schemas import LocationData
from backend.services import atm_service

from ._utils import ensure_service, handle_options, read_json_body, respond_error, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_POST(self):
        ensure_service()
        try:
            payload: Dict[str, Any] = read_json_body(self)
        except ValueError as exc:
            respond_error(self, 400, str(exc))
            return

        try:
            location = LocationData(**payload)
        except ValidationError as exc:
            respond_error(self, 400, "Invalid payload", exc.errors())
            return

        try:
            prediction = atm_service.predictor.predict_location(location)
            canibalization = atm_service.canibalization_analyzer.calculate_canibalization(location)
            adjusted_score = prediction["global_score"] * (1 - canibalization["canibalization_risk"] / 200)
        except Exception as exc:
            respond_error(self, 500, "Failed to generate prediction", [str(exc)])
            return

        response = {
            "predicted_volume": prediction["predicted_volume"],
            "roi_probability": prediction["roi_probability"],
            "roi_prediction": prediction["roi_prediction"],
            "global_score": round(max(0, adjusted_score), 2),
            "reason_codes": prediction["reason_codes"],
            "recommendation": prediction["recommendation"],
            "canibalization_analysis": canibalization,
        }
        respond_json(self, 200, response)

    def log_message(self, format, *args):
        return

