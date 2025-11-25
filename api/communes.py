import json
import os
from http.server import BaseHTTPRequestHandler

from ._utils import handle_options, respond_error, respond_json


# ⚠️ Adapte ce chemin au nom réel de ton fichier communes
COMMUNES_FILE = os.path.join("backend", "data", "communes_maroc.geojson")


def _load_communes_geojson():
  if not os.path.exists(COMMUNES_FILE):
    raise FileNotFoundError(f"Communes file not found: {COMMUNES_FILE}")

  with open(COMMUNES_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

  # On accepte soit un FeatureCollection, soit déjà une liste
  if isinstance(data, dict) and "features" in data:
    features = data["features"]
  elif isinstance(data, list):
    features = data
  else:
    raise ValueError("Invalid communes GeoJSON structure")

  return features


class handler(BaseHTTPRequestHandler):
  def do_OPTIONS(self):
    handle_options(self)

  def do_GET(self):
    try:
      features = _load_communes_geojson()

      # 🔁 Format compatible avec ton hook : json.communes || json.features
      payload = {
        "communes": features,
        "total_count": len(features),
        "metadata": {
          "source": "local_geojson",
        },
      }

      respond_json(self, 200, payload)

    except FileNotFoundError as exc:
      respond_error(self, 404, str(exc))
    except Exception as exc:
      respond_error(self, 500, "Unable to load communes data", [str(exc)])

  def log_message(self, format, *args):
    return
