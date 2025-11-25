# api/geocode.py
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import json
import requests

from ._utils import handle_options, respond_error, respond_json

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Mets ton vrai mail ici, Nominatim l’exige dans le User-Agent
USER_AGENT = "saham-geomarketing/1.0 (contact@example.com)"


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            # --- Récupération des query params ---
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            q = (params.get("q") or [None])[0]
            countrycodes = (params.get("countrycodes") or [None])[0]
            limit_raw = (params.get("limit") or [None])[0]

            # q est obligatoire
            if not q:
                respond_error(self, 400, "Missing 'q' query parameter")
                return

            # limit optionnel → int, défaut = 5
            try:
                limit = int(limit_raw) if limit_raw is not None else 5
            except ValueError:
                limit = 5

            # --- Appel Nominatim ---
            query_params = {
                "q": q,
                "format": "json",
                "addressdetails": 1,
                "limit": limit,
            }
            if countrycodes:
                query_params["countrycodes"] = countrycodes

            resp = requests.get(
                NOMINATIM_URL,
                params=query_params,
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )

            if resp.status_code != 200:
                # Erreur côté Nominatim
                respond_error(
                    self,
                    502,
                    "Upstream geocoding error",
                    [f"status={resp.status_code}", resp.text[:200]],
                )
                return

            try:
                results = resp.json()
            except Exception as exc:
                respond_error(self, 502, "Invalid JSON from geocoding service", [str(exc)])
                return

            if not results:
                respond_error(self, 404, "No result for this query", [q])
                return

            # On prend le meilleur résultat (le premier)
            best = results[0]

            payload = {
                "query": q,
                "lat": float(best.get("lat")),
                "lng": float(best.get("lon")),
                "display_name": best.get("display_name"),
                "raw": results,
            }

            respond_json(self, 200, payload)

        except Exception as exc:
            # Vraie erreur interne Python
            respond_error(self, 500, "Internal error in /api/geocode", [str(exc)])

    def log_message(self, format, *args):
        # Pas de spam dans les logs
        return
