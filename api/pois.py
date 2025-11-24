from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

from backend.services import get_pois
from ._utils import handle_options, respond_error, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            query = urlparse(self.path).query
            params = parse_qs(query)

            # ===== Récupération paramètres BBOX =====
            s = params.get("s", [None])[0]
            n = params.get("n", [None])[0]
            w = params.get("w", [None])[0]
            e = params.get("e", [None])[0]
            limit = params.get("limit", [200])[0]

            if None in [s, n, w, e]:
                respond_error(self, 400, "Missing required BBOX params: s, n, w, e")
                return

            # Conversion
            s, n, w, e = float(s), float(n), float(w), float(e)
            limit = int(limit)

            # ===== Appel backend service =====
            pois = get_pois(s=s, n=n, w=w, e=e, limit=limit)

        except Exception as exc:
            respond_error(self, 500, "Unable to load POIs", [str(exc)])
            return

        respond_json(self, 200, pois.dict())

    def log_message(self, format, *args):
        return
