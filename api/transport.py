from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

from backend.services import get_transport
from ._utils import handle_options, respond_error, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            query = urlparse(self.path).query
            params = parse_qs(query)

            s = float(params.get("s", [None])[0])
            n = float(params.get("n", [None])[0])
            w = float(params.get("w", [None])[0])
            e = float(params.get("e", [None])[0])
            limit = int(params.get("limit", [300])[0])
            page = int(params.get("page", [1])[0])

            if None in [s, n, w, e]:
                respond_error(self, 400, "Missing required BBOX params: s, n, w, e")
                return

            transport = get_transport(s=s, n=n, w=w, e=e,
                                     limit=limit, page=page)

            respond_json(self, 200, transport.dict())

        except Exception as exc:
            respond_error(self, 500, "Unable to load transport data", [str(exc)])

    def log_message(self, format, *args):
        return
