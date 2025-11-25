from http.server import BaseHTTPRequestHandler

from backend.services import get_communes
from ._utils import handle_options, respond_error, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            # Appel du service backend
            result = get_communes()

        except Exception as exc:
            respond_error(self, 500, "Unable to load communes", [str(exc)])
            return

        respond_json(self, 200, result)

    def log_message(self, format, *args):
        return
