from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

from backend.services import get_population
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

            if None in [s, n, w, e]:
                respond_error(self, 400, "Missing required BBOX params: s, n, w, e")
                return

            population = get_population(s=s, n=n, w=w, e=e)

        except Exception as exc:
            respond_error(self, 500, "Unable to load population data", [str(exc)])
            return

        respond_json(self, 200, population.dict())

    def log_message(self, format, *args):
        return
