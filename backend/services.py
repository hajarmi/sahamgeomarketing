"""
Service layer for the Geomarketing AI API.
Handles data persistence, model interactions, and business logic.
"""

from __future__ import annotations

import asyncio
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

import aiofiles
import pandas as pd
from pydantic import ValidationError, parse_obj_as

<<<<<<< HEAD
from .ml_models import ATMLocationPredictor, CanibalizationAnalyzer
from .schemas import ATMData, CompetitorData, CompetitorListResponse
from .schemas import PopulationPoint, PopulationListResponse
=======
>>>>>>> cc602676c326901616ad1a6a127f59c8016cd484


from ml_models import ATMLocationPredictor, CanibalizationAnalyzer
from schemas import (
    ATMData,
    CompetitorData,
    CompetitorListResponse,
    PopulationPoint,
    PopulationListResponse,
    POI,
    POIListResponse,
)

logger = logging.getLogger(__name__)

# ---------- Chemins ----------
DATA_DIR = Path(__file__).parent / "data"
DATA_FILE = Path(__file__).parent / "data.json"
COMPETITORS_FILE = DATA_DIR / "nb_atm_normalise_with_coords.csv"
POP_FILE = DATA_DIR / "master_indicateurs_normalise.csv"
POI_FILE = DATA_DIR / "poi_maroc.csv"

# ---------- Colonnes attendues pour compétiteurs ----------
REQUIRED_COLS = {
    "commune": "commune",
    "societe": "societe",
    "nb_atm": "nb_atm",
    "commune_norm": "commune_norm",
    "latitude": "latitude",
    "longitude": "longitude",
}

# ---------- ATMs de démo (merge avec data.json si présent) ----------
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
    },
]


# =====================================================================
# ATM service
# =====================================================================

class ATMService:
    """Manages ATM data and related ML models."""

    def __init__(self):
        self.predictor = ATMLocationPredictor()
        self.canibalization_analyzer = CanibalizationAnalyzer()
        self.existing_atms: List[ATMData] = []
        self.lock = asyncio.Lock()

    async def _load_and_merge_atms(self) -> List[ATMData]:
        raw_atms: List[ATMData] = []
        if DATA_FILE.exists():
            try:
                async with aiofiles.open(DATA_FILE, "r", encoding="utf-8") as f:
                    content = await f.read()
                    if content:
                        raw_data = json.loads(content)
                        raw_atms = parse_obj_as(List[ATMData], raw_data)
            except (IOError, json.JSONDecodeError, ValidationError) as e:
                logger.error(f"Could not load or parse data from file: {e}")

        normalized_atms: List[ATMData] = []
        for atm in raw_atms:
            atm_dict = atm.dict()
            atm_id = atm_dict.get("id") or atm_dict.get("idatm")
            if not atm_id:
                continue

            detailed = next((d for d in DETAILED_ATMS if d["id"] == atm_id), None)
            if detailed:
                merged_atm = {**detailed, **atm_dict}
                merged_atm["id"] = atm_id
                normalized_atms.append(ATMData(**merged_atm))
            else:
                atm_dict["id"] = atm_id
                atm_dict["name"] = atm_id
                normalized_atms.append(ATMData(**atm_dict))

        combined_atms = {atm.id: atm for atm in normalized_atms}
        for atm_data in DETAILED_ATMS:
            if atm_data["id"] not in combined_atms:
                combined_atms[atm_data["id"]] = ATMData(**atm_data)

        return list(combined_atms.values())

    async def initialize(self):
        logger.info("Training ML models (temporarily disabled)...")
        try:
            # self.predictor.train()
            self.predictor.is_trained = True
            logger.info("Skipping model training, using dummy predictor.")
        except Exception as e:
            logger.error(f"Error initializing predictor: {e}", exc_info=True)

        logger.info("Loading ATM data...")
        await self.reload_data()

    async def reload_data(self):
        self.existing_atms = await self._load_and_merge_atms()
        self.canibalization_analyzer = CanibalizationAnalyzer()
        for atm in self.existing_atms:
            self.canibalization_analyzer.add_existing_atm(atm)
        logger.info("%d ATMs loaded and analyzer updated.", len(self.existing_atms))

<<<<<<< HEAD
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

=======

atm_service = ATMService()


# =====================================================================
# Compétiteurs
# =====================================================================

>>>>>>> cc602676c326901616ad1a6a127f59c8016cd484
@lru_cache(maxsize=1)
def _load_competitors_df() -> pd.DataFrame:
    if not COMPETITORS_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {COMPETITORS_FILE}")

    df = pd.read_csv(COMPETITORS_FILE, encoding="utf-8-sig")

    lower_map = {c.lower().strip(): c for c in df.columns}
    rename_map = {}
    for expected in REQUIRED_COLS.values():
        if expected in df.columns:
            rename_map[expected] = expected
        elif expected.lower() in lower_map:
            rename_map[lower_map[expected.lower()]] = expected
        else:
            raise KeyError(f"Colonne manquante dans le CSV: '{expected}'")

    df = df.rename(columns=rename_map)

    df["nb_atm"] = pd.to_numeric(df["nb_atm"], errors="coerce").fillna(1).astype(int)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    before = len(df)
    df = df.dropna(subset=["latitude", "longitude"])
    if len(df) < before:
        logger.warning("Compétiteurs: lignes supprimées (coords NaN): %d", before - len(df))

    for col in ["commune", "commune_norm", "societe"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    return df


def get_competitors() -> CompetitorListResponse:
    df = _load_competitors_df()

    items: List[CompetitorData] = []
    for i, row in df.iterrows():
        try:
            items.append(
                CompetitorData(
                    id=f"CMP-{i+1}",
                    bank_name=row.get("societe") or "Inconnue",
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    commune=row.get("commune") or "",
                    commune_norm=row.get("commune_norm") or "",
                    nb_atm=int(row.get("nb_atm") or 1),
                )
            )
        except (ValueError, TypeError, ValidationError) as e:
            logger.error("Ligne ignorée (%s): %s", e.__class__.__name__, e)

    return CompetitorListResponse(competitors=items, total_count=len(items))


# =====================================================================
# Population
# =====================================================================

def _detect_sep(sample: str) -> str:
    if "\t" in sample:
        return "\t"
    elif ";" in sample:
        return ";"
    else:
        return ","


@lru_cache(maxsize=1)
def _load_population_df() -> pd.DataFrame:
    if not POP_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {POP_FILE}")

    with open(POP_FILE, "rb") as f:
        head = f.read(4096)
    try:
        head_txt = head.decode("utf-8-sig", errors="ignore")
    except Exception:
        head_txt = head.decode("latin-1", errors="ignore")
    sep = _detect_sep(head_txt)

    tried = []
    df: Optional[pd.DataFrame] = None
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(POP_FILE, encoding=enc, sep=sep, engine="python")
            break
        except Exception as e:
            tried.append(f"{enc} ({e.__class__.__name__})")
            df = None
    if df is None:
        raise UnicodeDecodeError("csv", b"", 0, 1, f"Echec encodage. Tentatives: {', '.join(tried)}")

    rename_map = {}
    cols_lower = {c.lower(): c for c in df.columns}

    def has(name: str) -> bool:
        return name in df.columns or name.lower() in cols_lower

    def col(name: str) -> str:
        return name if name in df.columns else cols_lower[name.lower()]

    if has("commune_norm"):
        rename_map[col("commune_norm")] = "commune_norm"
    if has("commune_x"):
        rename_map[col("commune_x")] = "commune"
    elif has("commune_y"):
        rename_map[col("commune_y")] = "commune"

    if has("latitude"):
        rename_map[col("latitude")] = "latitude"
    if has("longitude"):
        rename_map[col("longitude")] = "longitude"
    if has("densite_norm"):
        rename_map[col("densite_norm")] = "densite_norm"

    df = df.rename(columns=rename_map)

    required = ["commune_norm", "latitude", "longitude", "densite_norm"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise KeyError(f"Colonnes manquantes dans le CSV: {missing}. Colonnes trouvées: {list(df.columns)}")

    for c in ("latitude", "longitude", "densite_norm"):
        df[c] = pd.to_numeric(df[c], errors="coerce")

    before = len(df)
    df = df.dropna(subset=["latitude", "longitude", "densite_norm"])
    if len(df) < before:
        logger.warning("Population: lignes supprimées (NaN): %d", before - len(df))

    for c in ("commune", "commune_norm"):
        if c in df.columns:
            df[c] = df[c].astype(str).str.strip()

    return df


def get_population(*, s: float, n: float, w: float, e: float, limit: int = 20, page: int = 1) -> PopulationListResponse:
    df = _load_population_df()

    # Filtre BBOX (gère le cas anti-méridien si w > e)
    if w <= e:
        mask = (df["latitude"].between(s, n)) & (df["longitude"].between(w, e))
    else:
        mask = (df["latitude"].between(s, n)) & ((df["longitude"] >= w) | (df["longitude"] <= e))

    dfv = df.loc[mask].copy()

    total = int(len(dfv))
    start = (page - 1) * limit
    end = start + limit
    page_df = dfv.iloc[start:end]

    population_points: list[PopulationPoint] = []
    for i, row in page_df.iterrows():
        try:
            population_points.append(
                PopulationPoint(
                    id=f"POP-{i+1}",
                    commune=row.get("commune") or "",
                    commune_norm=row["commune_norm"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    densite_norm=float(row["densite_norm"]),
                    densite=(float(row["densite"]) if pd.notna(row.get("densite")) else None),
                )
            )
        except Exception as e:
            logger.error("Ligne ignorée (Population): %s", e)
            continue

    return PopulationListResponse(population=population_points, total_count=total)

# =====================================================================
# POI (avec mapping robuste)
# =====================================================================

@lru_cache(maxsize=1)
def _load_poi_df() -> pd.DataFrame:
    if not POI_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {POI_FILE}")

    # Détecter séparateur
    with open(POI_FILE, "rb") as f:
        head = f.read(4096)
    try:
        head_txt = head.decode("utf-8-sig", errors="ignore")
    except Exception:
        head_txt = head.decode("latin-1", errors="ignore")
    sep = "\t" if "\t" in head_txt else (";" if ";" in head_txt else ",")

    # Essais encodage
    df: Optional[pd.DataFrame] = None
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(POI_FILE, sep=sep, encoding=enc, engine="python")
            break
        except Exception:
            df = None
    if df is None:
        raise RuntimeError("Impossible de lire poi_maroc.csv (encodage/séparateur).")

    cols = list(df.columns)
    low = {c.lower().strip(): c for c in cols}

    def pick(*names):
        # retourne la 1ère colonne existante par nom (insensible casse)
        for n in names:
            if n in df.columns:
                return n
            ln = n.lower()
            if ln in low:
                return low[ln]
        return None

    # Renommages cibles
    rename = {}
    c_key       = pick("key")
    c_value     = pick("value")
    c_type      = pick("type", "amenity", "shop", "tourism", "leisure", "highway", "value")
    c_name      = pick("name")
    c_brand     = pick("brand")
    c_operator  = pick("operator")
    c_addr      = pick("addr_full", "address", "addr:full")
    c_commune   = pick("commune", "commune_x", "commune_nom")
    c_province  = pick("province")
    c_region    = pick("region")
    c_code      = pick("COMMUNE_PCODE", "code", "code_commune")
    c_tags      = pick("tags_json", "tags")
    c_lat       = pick("lat", "latitude")
    c_lon       = pick("lon", "lng", "longitude")

    if c_key:      rename[c_key] = "key"
    if c_value:    rename[c_value] = "value"
    if c_type:     rename[c_type] = "type"
    if c_name:     rename[c_name] = "name"
    if c_brand:    rename[c_brand] = "brand"
    if c_operator: rename[c_operator] = "operator"
    if c_addr:     rename[c_addr] = "address"
    if c_commune:  rename[c_commune] = "commune"
    if c_province: rename[c_province] = "province"
    if c_region:   rename[c_region] = "region"
    if c_code:     rename[c_code] = "code"
    if c_tags:     rename[c_tags] = "tags_json"
    if c_lat:      rename[c_lat] = "latitude"
    if c_lon:      rename[c_lon] = "longitude"

    df = df.rename(columns=rename)

    # Colonnes minimales
    required = ["latitude", "longitude"]
    miss = [c for c in required if c not in df.columns]
    if miss:
        raise KeyError(f"POI CSV: colonnes manquantes {miss}. Colonnes={list(df.columns)}")

    # Casts + nettoyage
    df["latitude"]  = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    for c in ["type","key","value","name","brand","operator","address","commune","province","region","code"]:
        if c in df.columns:
            df[c] = df[c].astype(str).str.strip()

    # Si 'type' absent, construire depuis key/value
    if "type" not in df.columns:
        df["type"] = None
    df["type"] = df["type"].where(df["type"].notna() & (df["type"] != ""), df.get("value"))

    return df

def get_pois(*, s: float, n: float, w: float, e: float, limit: int = 300, page: int = 1) -> POIListResponse:
    df = _load_poi_df()

    # Filtre BBOX (gère aussi le cas anti-méridien si w > e)
    if w <= e:
        mask = (df["latitude"].between(s, n)) & (df["longitude"].between(w, e))
    else:
        mask = (df["latitude"].between(s, n)) & ((df["longitude"] >= w) | (df["longitude"] <= e))

    dfv = df.loc[mask].copy()

    total = int(len(dfv))
    start = (page - 1) * limit
    end = start + limit
    page_df = dfv.iloc[start:end]

    items = []
    for i, r in page_df.iterrows():
        tags = None
        if "tags_json" in page_df.columns and pd.notna(r.get("tags_json")):
            try:
                tags = json.loads(r["tags_json"])
            except Exception:
                tags = None

        items.append(POI(
            id=f"POI-{i+1}",
            latitude=float(r["latitude"]),
            longitude=float(r["longitude"]),
            type=(r.get("type") or None),
            key=(r.get("key") or None),
            value=(r.get("value") or None),
            name=(r.get("name") or None),
            brand=(r.get("brand") or None),
            operator=(r.get("operator") or None),
            address=(r.get("address") or None),
            commune=(r.get("commune") or None),
            province=(r.get("province") or None),
            region=(r.get("region") or None),
            code=(r.get("code") or None),
            tags=tags,
        ))

    return POIListResponse(pois=items, total_count=total)


# =====================================================================
# Utilitaire
# =====================================================================

def clear_data_caches():
    try:
        _load_population_df.cache_clear()
    except Exception:
        pass
    try:
        _load_competitors_df.cache_clear()
    except Exception:
        pass
<<<<<<< HEAD
=======
    try:
        _load_poi_df.cache_clear()
    except Exception:
        pass
>>>>>>> cc602676c326901616ad1a6a127f59c8016cd484
