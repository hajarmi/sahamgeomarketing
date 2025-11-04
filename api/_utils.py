import asyncio
import json
import logging
import threading
from http import HTTPStatus
from typing import Any, Dict, Iterable, Optional

from backend.config import settings
from backend.services import atm_service

logger = logging.getLogger("serverless")

_service_ready = False
_service_lock = threading.Lock()

_raw_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
_allow_all = "*" in _raw_origins or not _raw_origins
_allowed_origins = {origin for origin in _raw_origins if origin != "*"}


def ensure_service() -> None:
    """
    Lazily initializes the ATM service so serverless invocations remain warm.
    """
    global _service_ready
    if _service_ready:
        return

    with _service_lock:
        if _service_ready:
            return

        logger.info("Initializing ATM service for serverless execution")
        asyncio.run(atm_service.initialize())
        _service_ready = True


def run_async(coro):
    """
    Execute an async coroutine from our sync serverless handler.
    """
    return asyncio.run(coro)


def _resolve_allowed_origin(request_origin: Optional[str]) -> str:
    if _allow_all:
        return "*"
    if request_origin and request_origin in _allowed_origins:
        return request_origin
    return next(iter(_allowed_origins), "*")


def respond_json(handler, status: int, payload: Dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", _resolve_allowed_origin(handler.headers.get("Origin")))
    handler.send_header("Access-Control-Allow-Credentials", "true")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def respond_error(handler, status: int, message: str, details: Optional[Iterable[Any]] = None) -> None:
    payload = {"error": message}
    if details:
        payload["details"] = list(details)
    respond_json(handler, status, payload)


def handle_options(handler) -> None:
    handler.send_response(HTTPStatus.NO_CONTENT)
    handler.send_header("Access-Control-Allow-Origin", _resolve_allowed_origin(handler.headers.get("Origin")))
    handler.send_header("Access-Control-Allow-Credentials", "true")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    handler.end_headers()


def read_json_body(handler) -> Dict[str, Any]:
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return {}
    data = handler.rfile.read(length)
    try:
        return json.loads(data.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON payload: {exc}") from exc

