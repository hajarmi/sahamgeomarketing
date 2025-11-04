"""
Service layer for the Geomarketing AI API.
Handles data persistence, model interactions, and business logic.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import List
from functools import lru_cache

import io

import pandas as pd
import aiofiles
from pydantic import ValidationError, parse_obj_as

from .ml_models import ATMLocationPredictor, CanibalizationAnalyzer
from .schemas import ATMData, CompetitorData, CompetitorListResponse
from .schemas import PopulationPoint, PopulationListResponse


logger = logging.getLogger(__name__)

# Chemins
DATA_DIR = Path(__file__).parent / "data"
DATA_FILE = Path(__file__).parent / "data.json"
COMPETITORS_FILE = DATA_DIR / "nb_atm_normalise_with_coords.csv"  #ajoute
POP_FILE = DATA_DIR / "master_indicateurs_normalise.csv"    #ajoute 


# Colonnes attendues (module-level)
REQUIRED_COLS = {
    "commune": "commune",
    "societe": "societe",
    "nb_atm": "nb_atm",
    "commune_norm": "commune_norm",
    "latitude": "latitude",
    "longitude": "longitude",
}
 


logger = logging.getLogger(__name__)

DETAILED_ATMS = [
    {
      "id": "ATM001",
      "name": "Attijariwafa Bank - Maarif",
      "latitude": 33.5731,
      "longitude": -7.5898,
      "monthly_volume": 1200,
      "status": "active",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "bank_name": "Attijariwafa Bank",
      "installation_type": "fixed",
      "branch_location": "Agence Maarif",
      "services": ["retrait", "depot", "consultation", "virement"],
    },
    {
      "id": "ATM002",
      "name": "Banque Populaire - Anfa",
      "latitude": 33.5891,
      "longitude": -7.6031,
      "monthly_volume": 950,
      "status": "active",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "bank_name": "Banque Populaire",
      "installation_type": "fixed",
      "branch_location": "Agence Anfa",
      "services": ["retrait", "depot", "consultation"],
    },
    {
      "id": "ATM003",
      "name": "BMCE Bank - CFC",
      "latitude": 33.5642,
      "longitude": -7.5756,
      "monthly_volume": 1400,
      "status": "active",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "bank_name": "BMCE Bank",
      "installation_type": "fixed",
      "branch_location": "Centre Financier",
      "services": ["retrait", "depot", "consultation", "virement", "change"],
    },
    {
      "id": "ATM004",
      "name": "Crédit du Maroc - Gauthier",
      "latitude": 33.5923,
      "longitude": -7.6156,
      "monthly_volume": 800,
      "status": "active",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "bank_name": "Crédit du Maroc",
      "installation_type": "portable",
      "branch_location": "Centre Commercial Gauthier",
      "services": ["retrait", "consultation"],
    },
    {
      "id": "ATM005",
      "name": "CIH Bank - Ain Diab",
      "latitude": 33.5534,
      "longitude": -7.5634,
      "monthly_volume": 1100,
      "status": "active",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "bank_name": "CIH Bank",
      "installation_type": "fixed",
      "branch_location": "Corniche Ain Diab",
      "services": ["retrait", "depot", "consultation"],
    },
    {
      "id": "ATM006",
      "name": "BMCI - Twin Center",
      "latitude": 33.5831,
      "longitude": -7.5998,
      "monthly_volume": 1350,
      "status": "active",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "bank_name": "BMCI",
      "installation_type": "fixed",
      "branch_location": "Twin Center",
      "services": ["retrait", "depot", "consultation", "virement"],
    }
]

class ATMService:
    """Manages ATM data and related ML models."""

    def __init__(self):
        self.predictor = ATMLocationPredictor()
        self.canibalization_analyzer = CanibalizationAnalyzer()
        self.existing_atms: List[ATMData] = []
        self.lock = asyncio.Lock()

    async def _load_and_merge_atms(self) -> List[ATMData]:
        raw_atms = []
        if DATA_FILE.exists():
            try:
                async with aiofiles.open(DATA_FILE, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    if content:
                        raw_data = json.loads(content)
                        raw_atms = parse_obj_as(List[ATMData], raw_data)
            except (IOError, json.JSONDecodeError, ValidationError) as e:
                logger.error(f"Could not load or parse data from file: {e}")

        normalized_atms = []
        for atm in raw_atms:
            atm_dict = atm.dict()
            atm_id = atm_dict.get('id') or atm_dict.get('idatm')
            if not atm_id:
                continue

            detailed = next((d for d in DETAILED_ATMS if d["id"] == atm_id), None)
            if detailed:
                merged_atm = {**detailed, **atm_dict}
                merged_atm['id'] = atm_id
                normalized_atms.append(ATMData(**merged_atm))
            else:
                atm_dict['id'] = atm_id
                atm_dict['name'] = atm_id
                normalized_atms.append(ATMData(**atm_dict))

        combined_atms = {atm.id: atm for atm in normalized_atms}
        for atm_data in DETAILED_ATMS:
            if atm_data["id"] not in combined_atms:
                combined_atms[atm_data["id"]] = ATMData(**atm_data)

        return list(combined_atms.values())

    async def initialize(self):
       logger.info("Training ML models (temporarily disabled)...")
       try:
        # self.predictor.train()  # désactivé
           self.predictor.is_trained = True
           logger.info("Skipping model training, using dummy predictor.")
       except Exception as e:
         logger.error(f"Error initializing predictor: {e}", exc_info=True)

    # Toujours DANS la méthode:
       logger.info("Loading ATM data...")
       await self.reload_data()
  

    async def reload_data(self):
        self.existing_atms = await self._load_and_merge_atms()
        self.canibalization_analyzer = CanibalizationAnalyzer()
        for atm in self.existing_atms:
            self.canibalization_analyzer.add_existing_atm(atm)
        logger.info(f"{len(self.existing_atms)} ATMs loaded and analyzer updated.")

    async def _persist_data(self):
        """
        Persist the current ATM dataset to disk.
        In the Vercel serverless environment this is ephemeral, but it keeps
        local development behavior consistent.
        """
        try:
            async with aiofiles.open(DATA_FILE, "w", encoding="utf-8") as f:
                payload = [atm.dict() for atm in self.existing_atms]
                await f.write(json.dumps(payload, ensure_ascii=False, indent=2))
        except Exception as exc:
            logger.error("Failed to persist ATM data: %s", exc, exc_info=True)

    async def add_new_atm(self, atm: ATMData) -> ATMData:
        """
        Register a new ATM in memory and update auxiliary structures.
        """
        async with self.lock:
            if any(existing.id == atm.id for existing in self.existing_atms):
                raise ValueError(f"An ATM with id '{atm.id}' already exists.")

            self.existing_atms.append(atm)
            self.canibalization_analyzer.add_existing_atm(atm)

            await self._persist_data()

        return atm

    async def simulate_external_updates(self):
        """
        Placeholder used by the former background task to refresh cached data.
        """
        await self.reload_data()

    # ... (the rest of the class remains the same)

atm_service = ATMService()

@lru_cache(maxsize=1)
def _load_competitors_df() -> pd.DataFrame:
    # 1) lire le CSV (utf-8-sig tolère BOM Excel)
    if not COMPETITORS_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {COMPETITORS_FILE}")

    df = pd.read_csv(COMPETITORS_FILE, encoding="utf-8-sig")

    # 2) vérifier / renommer les colonnes attendues
    lower_map = {c.lower().strip(): c for c in df.columns}
    rename_map = {}
    for logical, expected in REQUIRED_COLS.items():
        # match insensible à la casse
        if expected in df.columns:
            rename_map[expected] = expected
        elif expected.lower() in lower_map:
            rename_map[lower_map[expected.lower()]] = expected
        else:
            raise KeyError(f"Colonne manquante dans le CSV: '{expected}'")

    df = df.rename(columns=rename_map)

    # 3) caster types + nettoyer
    df["nb_atm"] = pd.to_numeric(df["nb_atm"], errors="coerce").fillna(1).astype(int)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    # drop lignes sans coordonnées
    before = len(df)
    df = df.dropna(subset=["latitude", "longitude"])
    if len(df) < before:
        logger.warning("Lignes supprimées (coords NaN): %d", before - len(df))

    # normaliser les chaînes
    for col in ["commune", "commune_norm", "societe"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    return df

def get_competitors() -> CompetitorListResponse:
    df = _load_competitors_df()

    items: List[CompetitorData] = []
    for i, row in df.iterrows():
        try:
            item = CompetitorData(
                id=f"CMP-{i+1}",
                bank_name=row.get("societe") or "Inconnue",
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                commune=row.get("commune") or "",
                commune_norm=row.get("commune_norm") or "",
                nb_atm=int(row.get("nb_atm") or 1),
            )
            items.append(item)
        except (ValueError, TypeError, ValidationError) as e:
            logger.error("Ligne ignorée (%s): %s", e.__class__.__name__, e)

    return CompetitorListResponse(competitors=items, total_count=len(items))


def _detect_sep(sample: str) -> str:
    """
    Détecte le séparateur probable : tabulation, point-virgule ou virgule
    """
    if "\t" in sample:
        return "\t"
    elif ";" in sample:
        return ";"
    else:
        return ","


@lru_cache(maxsize=1)
def _load_population_df() -> pd.DataFrame:
    """
    Charge le CSV de densité de population de façon tolérante:
    - essaie plusieurs encodages: utf-8-sig, cp1252 (ANSI), latin-1
    - détecte ; vs ,
    - normalise les noms de colonnes vers: commune, commune_norm, latitude, longitude, densite_norm
    """
    if not POP_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {POP_FILE}")

    # 1) lire quelques octets pour détecter le séparateur
    with open(POP_FILE, "rb") as f:
        head = f.read(4096)
    try:
        head_txt = head.decode("utf-8-sig", errors="ignore")
    except Exception:
        head_txt = head.decode("latin-1", errors="ignore")
    sep = _detect_sep(head_txt)

    # 2) tenter plusieurs encodages
    tried = []
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(POP_FILE, encoding=enc, sep=sep, engine="python")
            break
        except Exception as e:
            tried.append(f"{enc} ({e.__class__.__name__})")
            df = None
    if df is None:
        raise UnicodeDecodeError("csv", b"", 0, 1, f"Echec encodage. Tentatives: {', '.join(tried)}")

    # 3) harmoniser les noms de colonnes selon ta liste fournie
    # Colonnes observées :
    # ['commune_norm','commune_x','taux_jeunesse','taux_vieillesse','INIV','nb_atm','IEDU',
    #  'Indice_accessibilite_x','Indice_accessibilite_y','Indice_transport','indice_densite_routiere',
    #  'Indice_POI','densite_norm','Indice_POI_norm','indice_densite_routiere_norm',
    #  'indice_transport_norm_x','indice_transport_norm_y','commune_key','commune_y',
    #  'latitude','longitude']
    rename_map = {}
    cols_lower = {c.lower(): c for c in df.columns}

    def has(name: str) -> bool:
        return name in df.columns or name.lower() in cols_lower

    def col(name: str) -> str:
        return name if name in df.columns else cols_lower[name.lower()]

    if has("commune_norm"): rename_map[col("commune_norm")] = "commune_norm"
    # préfère 'commune_x' sinon 'commune_y'
    if has("commune_x"):
        rename_map[col("commune_x")] = "commune"
    elif has("commune_y"):
        rename_map[col("commune_y")] = "commune"

    if has("latitude"):  rename_map[col("latitude")]  = "latitude"
    if has("longitude"): rename_map[col("longitude")] = "longitude"

    # la métrique que tu veux afficher sur la couche: densite_norm
    if has("densite_norm"): rename_map[col("densite_norm")] = "densite_norm"

    df = df.rename(columns=rename_map)

    # 4) validations minimales
    required = ["commune_norm", "latitude", "longitude", "densite_norm"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise KeyError(f"Colonnes manquantes dans le CSV: {missing}. Colonnes trouvées: {list(df.columns)}")

    # 5) cast numériques
    for c in ("latitude", "longitude", "densite_norm"):
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # 6) nettoyer
    before = len(df)
    df = df.dropna(subset=["latitude", "longitude", "densite_norm"])
    if len(df) < before:
        logger.warning("Population: lignes supprimées (NaN): %d", before - len(df))

    # 7) normaliser les chaînes
    for c in ("commune", "commune_norm"):
        if c in df.columns:
            df[c] = df[c].astype(str).str.strip()

    return df


def get_population() -> PopulationListResponse:
    """
    Charge les données de densité de population et les renvoie
    sous forme de PopulationListResponse (pour /population)
    """
    df = _load_population_df()

    population_points: list[PopulationPoint] = []
    for i, row in df.iterrows():
        try:
            population_points.append(
                PopulationPoint(
                    id=f"POP-{i+1}",
                    commune=row.get("commune") or "",
                    commune_norm=row["commune_norm"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    densite_norm=float(row["densite_norm"]),
                    densite=(float(row["densite"]) if pd.notna(row.get("densite")) else None),  # ← nouveau

                )
            )
        except Exception as e:
            print(f"Ligne ignorée (Population): {e}")
            continue

    return PopulationListResponse(
        population=population_points,
        total_count=len(population_points)
    )


def clear_data_caches():
    try:
        _load_population_df.cache_clear()
    except Exception:
        pass
    try:
        _load_competitors_df.cache_clear()
    except Exception:
        pass
