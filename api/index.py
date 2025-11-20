# api/index.py

import os
import sys

# S'assurer que la racine du projet est dans le PYTHONPATH
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# Importer l'app FastAPI existante
from backend.api_server import app as fastapi_app  # <-- ton fichier que tu as collé avant

# Vercel cherche une variable "app" (ASGI : FastAPI, Starlette, etc.)
app = fastapi_app
