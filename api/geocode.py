# api/geocode.py
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import json
import requests

from ._utils import handle_options, respond_error, respond_json


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "saham-geomarketing/1.0 (contact@example.com)"  # mets ton mail si tu veux


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            # --- query string ---
            query = urlparse(self.path).query
            params = parse_qs(query)

            q = params.get("q", [None])[0]
            countrycodes = params.get("countrycodes", [None])[0]
            limit = params.get("limit", [None])[0]

            if not q:
                respond_error(self, 400, "Missing query parameter 'q'")
                return

            if not countrycodes:
                countrycodes = "ma"

            try:
                limit_i = int(limit) if limit is not None else 5
            except ValueError:
                limit_i = 5

            # --- appel Nominatim ---
            r = requests.get(
                NOMINATIM_URL,
                params={
                    "q": q,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "limit": limit_i,
                    "countrycodes": countrycodes,
                },
                headers={"User-Agent": USER_AGENT},
                timeout=5,
            )
            if r.status_code != 200:
                respond_error(
                    self,
                    502,
                    "Upstream geocoding error",
                    [f"status={r.status_code}", r.text[:200]],
                )
                return

            data = r.json()

            # tu peux filtrer / simplifier la réponse ici si tu veux
            respond_json(self, 200, data)

        except Exception as exc:
            respond_error(
                self,
                500,
                "Internal geocoding error",
                [str(exc)],
            )

    def log_message(self, format, *args):
        return
