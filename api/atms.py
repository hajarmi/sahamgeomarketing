from http.server import BaseHTTPRequestHandler
from typing import Any, Dict

from pydantic import ValidationError

from backend.schemas import ATMData
from backend.services import atm_service

from ._utils import ensure_service, handle_options, read_json_body, respond_error, respond_json, run_async


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        ensure_service()
        payload = {
            "atms": [atm.dict() for atm in atm_service.existing_atms],
            "total_count": len(atm_service.existing_atms),
        }
        respond_json(self, 200, payload)

    def do_POST(self):
        ensure_service()
        try:
            body: Dict[str, Any] = read_json_body(self)
        except ValueError as exc:
            respond_error(self, 400, str(exc))
            return

        try:
            new_atm = ATMData(**body)
        except ValidationError as exc:
            respond_error(self, 400, "Invalid ATM payload", exc.errors())
            return

        try:
            persisted = run_async(atm_service.add_new_atm(new_atm))
        except ValueError as exc:
            respond_error(self, 409, str(exc))
            return
        except Exception as exc:
            respond_error(self, 500, "Failed to store ATM", [str(exc)])
            return

        respond_json(self, 201, persisted.dict())

    def log_message(self, format, *args):
        return

