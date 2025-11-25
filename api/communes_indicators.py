# api/communes_indicators.py
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

from backend.services import (
    get_commune_indicators,
    get_commune_indicators_by_name_or_code,
)
from ._utils import ensure_service, handle_options, respond_error, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        # initialise atm_service au besoin (comme pour /analytics)
        ensure_service()

        try:
            # --- lecture des query params ---
            query = urlparse(self.path).query
            params = parse_qs(query)

            lat = params.get("lat", [None])[0]
            lng = params.get("lng", [None])[0]
            commune = params.get("commune", [None])[0]
            code = params.get("code", [None])[0]

            # 1) Cas lat/lng -> commune la plus proche
            if lat is not None and lng is not None:
                lat_f = float(lat)
                lng_f = float(lng)
                result = get_commune_indicators(lat=lat_f, lng=lng_f)

            # 2) Cas commune ou code explicite
            else:
                key = commune or code
                if not key:
                    respond_error(
                        self,
                        422,
                        "Provide (lat,lng) or (commune / code) in query string.",
                    )
                    return
                result = get_commune_indicators_by_name_or_code(key)

        except FileNotFoundError as exc:
            respond_error(self, 404, str(exc))
            return
        except KeyError as exc:
            # commune pas trouvée dans le CSV
            respond_error(self, 404, str(exc))
            return
        except ValueError as exc:
            respond_error(self, 400, f"Bad parameters: {exc}")
            return
        except Exception as exc:
            # erreur générale
            respond_error(
                self,
                500,
                "Unable to compute commune indicators",
                [str(exc)],
            )
            return

        # OK ✅
        respond_json(self, 200, result)

    def log_message(self, format, *args):
        # silence les logs par défaut
        return
