from http.server import BaseHTTPRequestHandler

from backend.services import get_competitors

from ._utils import handle_options, respond_error, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            competitors = get_competitors()
        except FileNotFoundError as exc:
            respond_error(self, 404, str(exc))
            return
        except KeyError as exc:
            respond_error(self, 400, f"Invalid CSV structure: {exc}")
            return
        except Exception as exc:
            respond_error(self, 500, "Unable to load competitors", [str(exc)])
            return

        respond_json(self, 200, competitors.dict())

    def log_message(self, format, *args):
        return

