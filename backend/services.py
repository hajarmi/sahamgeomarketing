"""
Service layer for the Geomarketing AI API.
Unifie les noms de colonnes (CSV) et normalise les indicateurs en [0..1].
"""

from __future__ import annotations

import asyncio
import itertools
import json
import logging
import math
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import aiofiles
import pandas as pd
from pydantic import ValidationError, parse_obj_as

from ml_models import ATMLocationPredictor, CanibalizationAnalyzer

from schemas import (
    ATMData,
    CompetitorData,
    CompetitorListResponse,
    PopulationPoint,
    PopulationListResponse,
    POI,
    POIListResponse,
    TransportPoint,
    TransportListResponse,
)


logger = logging.getLogger(__name__)

# ---------- Chemins ----------
DATA_DIR = Path(__file__).parent / "data"
COMPETITORS_FILE = DATA_DIR / "nb_atm_normalise_with_coords.csv"
POP_FILE = DATA_DIR / "master_indicateurs_normalise.csv"  # master d’indicateurs (par commune)
POI_FILE = DATA_DIR / "poi_maroc.csv"
COMMUNES_GEOJSON = DATA_DIR / "communes.geojson"
ATM_FILE = DATA_DIR / "atms_maroc_clean.csv"
COMPETITORS_FILE = DATA_DIR / "atms_competitors.csv"
TRANSPORT_FILE = DATA_DIR / "transport_maroc.csv"  

# ---------- Colonnes attendues pour compétiteurs ----------
REQUIRED_COLS = {
    "commune": "commune",
    "societe": "societe",
    "nb_atm": "nb_atm",
    "commune_norm": "commune_norm",
    "latitude": "latitude",
    "longitude": "longitude",
}

# =====================================================================
# Chargement des vrais ATMs depuis atm_maroc.csv
# =====================================================================
def infer_installation_type(amenity: str | None) -> str:
    """
    Détermine le type d'installation à partir de la colonne amenity.
    - amenity == 'atm'  -> 'atm'
    - sinon             -> 'agency'
    """
    a = (amenity or "").strip().lower()
    if a == "atm":
        return "atm"
    return "agency"

def _load_atm_csv() -> List[ATMData]:
    """
    Charge les ATMs depuis atms_maroc_with_city.csv

    Colonnes attendues :
      name, operator, amenity, lat, lon, city_name
    """

    if not ATM_FILE.exists():
        logger.warning("Fichier ATMs introuvable: %s. Aucun ATM chargé.", ATM_FILE)
        return []

    # lecture simple
    df = pd.read_csv(ATM_FILE, encoding="utf-8-sig")

    # on s'assure que les colonnes existent
    for col in ["name", "operator", "amenity", "lat", "lon", "city_name"]:
        if col not in df.columns:
            df[col] = None

    # lat/lon numériques
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df = df.dropna(subset=["lat", "lon"])

    # nettoyage chaînes
    for col in ["name", "operator", "amenity", "city_name"]:
        df[col] = df[col].astype(str).str.strip()

    # garder uniquement les lignes où name OU operator n'est pas vide
    

    atms: List[ATMData] = []

    for i, row in df.iterrows():
        try:
            # nom de la banque : d'abord operator, sinon name
            bank_name = row["operator"] if row["operator"] not in ("", "nan", "None") else row["name"]

            # ville
            city = row["city_name"] if row["city_name"] not in ("", "nan", "None") else None

            # type d’installation à partir de amenity
            installation_type = infer_installation_type(row.get("amenity"))

            # id stable
            atm_id = row["name"] if row["name"] not in ("", "nan", "None") else row["operator"]
            if not atm_id:
                atm_id = f"ATM-{i+1}"

            atms.append(
                ATMData(
                    id=atm_id,
                    latitude=float(row["lat"]),
                    longitude=float(row["lon"]),
                    bank_name=bank_name or "Inconnue",
                    status="active",
                    installation_type=installation_type,  # 'atm' ou 'agency'
                    city=city or "Unknown",
                    region="Unknown",               # à mapper plus tard
                    branch_location=city or None,   # on n’a que la ville
                    name=row["name"] if row["name"] not in ("", "nan", "None") else bank_name,
                    services=None,
                )
            )
        except Exception as e:
            logger.error("Ligne ignorée dans ATMs CSV: %s", e, exc_info=True)

    logger.info("Chargé %d ATMs depuis %s", len(atms), ATM_FILE)
    return atms





# =====================================================================
# ATM service
# =====================================================================

class ATMService:
    def __init__(self):
        self.predictor = ATMLocationPredictor()
        self.canibalization_analyzer = CanibalizationAnalyzer()
        self.existing_atms: List[ATMData] = []
        self.lock = asyncio.Lock()

    async def _load_and_merge_atms(self) -> List[ATMData]:
     csv_atms: List[ATMData] = _load_atm_csv()
     return csv_atms


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

    
    async def add_new_atm(self, atm: ATMData) -> ATMData:
        async with self.lock:
            if any(existing.id == atm.id for existing in self.existing_atms):
                raise ValueError(f"An ATM with id '{atm.id}' already exists.")
            self.existing_atms.append(atm)
            self.canibalization_analyzer.add_existing_atm(atm)
            
        return atm

    async def simulate_external_updates(self):
        await self.reload_data()


atm_service = ATMService()


# =====================================================================
# Utilitaires géo
# =====================================================================

def _geom_centroid_latlng(geometry: Dict[str, Any]) -> Tuple[float, float]:
    """Centroid naïf (moyenne des sommets). Suffisant pour centrer la carte."""
    if not geometry or "type" not in geometry or "coordinates" not in geometry:
        raise ValueError("geometry invalide")

    coords = []
    if geometry["type"] == "Polygon":
        rings = geometry["coordinates"]
        coords = list(itertools.chain.from_iterable(rings))
    elif geometry["type"] == "MultiPolygon":
        polys = geometry["coordinates"]
        rings = list(itertools.chain.from_iterable(polys))
        coords = list(itertools.chain.from_iterable(rings))
    else:
        raise ValueError(f"Type géométrie non supporté: {geometry['type']}")

    if not coords:
        raise ValueError("Pas de sommets pour centroid")
    lats = [c[1] for c in coords]
    lngs = [c[0] for c in coords]
    return (sum(lats) / len(lats), sum(lngs) / len(lngs))


@lru_cache(maxsize=1)
def _load_communes_geojson() -> Dict[str, Any]:
    if not COMMUNES_GEOJSON.exists():
        raise FileNotFoundError(f"Fichier manquant: {COMMUNES_GEOJSON}")
    with open(COMMUNES_GEOJSON, "r", encoding="utf-8") as f:
        gj = json.load(f)

    for feat in gj.get("features", []):
        props = feat.setdefault("properties", {})
        if "commune_norm" not in props:
            if "commune" in props:
                props["commune_norm"] = str(props["commune"]).strip().lower()
            else:
                props["commune_norm"] = ""
        else:
            props["commune_norm"] = str(props["commune_norm"]).strip().lower()

        try:
            lat, lng = _geom_centroid_latlng(feat.get("geometry", {}))
            props["centroid_lat"] = lat
            props["centroid_lng"] = lng
        except Exception:
            props["centroid_lat"] = None
            props["centroid_lng"] = None

    return gj


def get_commune_feature(commune_or_code: str) -> Optional[Dict[str, Any]]:
    if not commune_or_code:
        return None
    key = str(commune_or_code).strip().lower()
    gj = _load_communes_geojson()
    for feat in gj.get("features", []):
        p = feat.get("properties", {})
        if p.get("commune_norm") == key:
            return feat
        if str(p.get("code", "")).strip().lower() == key:
            return feat
    return None


# =====================================================================
# Compétiteurs
# =====================================================================

@lru_cache(maxsize=1)
def _load_competitors_df() -> pd.DataFrame:
    """
    Charge les concurrents depuis un CSV de points réels.

    Colonnes attendues (minimales) :
      name, operator, lat, lon, city_name

    Si certaines colonnes manquent, elles sont créées vides.
    """
    if not COMPETITORS_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {COMPETITORS_FILE}")

    df = pd.read_csv(COMPETITORS_FILE, encoding="utf-8-sig")

    # S'assurer que les colonnes existent
    for col in ["name", "operator", "lat", "lon", "city_name"]:
        if col not in df.columns:
            df[col] = None

    # lat/lon numériques
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    before = len(df)
    df = df.dropna(subset=["lat", "lon"])
    if len(df) < before:
        logger.warning("Concurrents: lignes supprimées (coords NaN): %d", before - len(df))

    # Nettoyage des chaînes
    for col in ["name", "operator", "city_name"]:
        df[col] = df[col].astype(str).str.strip()

    # On utilise city_name comme commune par défaut
    if "commune" not in df.columns:
        df["commune"] = df["city_name"]

    # commune_norm = commune en minuscule
    df["commune_norm"] = (
        df["commune"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.lower()
    )

    return df



def get_competitors() -> CompetitorListResponse:
    """
    Retourne les concurrents à partir du CSV de points réels.
    1 ligne CSV = 1 ATM concurrent (nb_atm = 1).
    """
    df = _load_competitors_df()
    items: List[CompetitorData] = []

    for i, row in df.iterrows():
        try:
            # Nom de la banque : operator puis name
            bank_name = row["operator"] if row["operator"] not in ("", "nan", "None") else row["name"]

            # Commune / commune_norm
            commune = row.get("commune") or row.get("city_name") or ""
            commune_norm = (
                str(commune).strip().lower()
                if commune not in ("", "nan", "None")
                else ""
            )

            # id = name, sinon operator, sinon fallback CMP-i
            comp_id = row["name"] if row["name"] not in ("", "nan", "None") else row["operator"]
            if not comp_id:
                comp_id = f"CMP-{i+1}"

            items.append(
                CompetitorData(
                    id=comp_id,
                    bank_name=bank_name or "Inconnue",
                    latitude=float(row["lat"]),
                    longitude=float(row["lon"]),
                    commune=commune,
                    commune_norm=commune_norm,
                    nb_atm=1,  # 1 point = 1 ATM concurrent
                )
            )
        except (ValueError, TypeError, ValidationError) as e:
            logger.error("Ligne concurrents ignorée (%s): %s", e.__class__.__name__, e)

    return CompetitorListResponse(competitors=items, total_count=len(items))



# =====================================================================
# Helpers CSV/valeurs
# =====================================================================

def _detect_sep(sample: str) -> str:
    if "\t" in sample:
        return "\t"
    elif ";" in sample:
        return ";"
    else:
        return ","


def _to01(v: Any) -> float:
    """Force une valeur vers [0..1] (si >1, interprétée comme 0..100)."""
    try:
        x = float(v)
    except Exception:
        return 0.0
    if x < 0:
        return 0.0
    return x / 100.0 if x > 1.0 else (x if x <= 1.0 else 1.0)


# =====================================================================
# Population (master indicateurs)
# =====================================================================

@lru_cache(maxsize=1)
def _load_population_df() -> pd.DataFrame:
    """Charge master_indicateurs_normalise.csv, renomme vers des colonnes canoniques et normalise en [0..1]."""
    if not POP_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {POP_FILE}")

    with open(POP_FILE, "rb") as f:
        head = f.read(4096)
    try:
        head_txt = head.decode("utf-8-sig", errors="ignore")
    except Exception:
        head_txt = head.decode("latin-1", errors="ignore")
    sep = _detect_sep(head_txt)

    # encodage
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

    # ---- Harmonisation spécifique à ton CSV ----
    ren: Dict[str, str] = {}

    # Commune
    if "commune_x" in df.columns:
        ren["commune_x"] = "commune"
    elif "commune_y" in df.columns:
        ren["commune_y"] = "commune"

    # Accessibilité
    if "Indice_accessibilite_x" in df.columns:
        ren["Indice_accessibilite_x"] = "Indice_acces"

    # Transport
    if "Indice_transport" in df.columns:
        ren["Indice_transport"] = "Indice_trans"
    if "indice_transport_norm_x" in df.columns:
        ren["indice_transport_norm_x"] = "indice_trans_norm"
    if "indice_transport_norm_y" in df.columns:
        ren["indice_transport_norm_y"] = "indice_trans_norm2"

    # Densité routière
    if "indice_densite_routiere" in df.columns:
        ren["indice_densite_routiere"] = "indice_densite"
    if "indice_densite_routiere_norm" in df.columns:
        ren["indice_densite_routiere_norm"] = "indice_densite_norm"

    # POI normalisé
    if "Indice_POI_norm" in df.columns:
        ren["Indice_POI_norm"] = "Indice_POI_r"

    df = df.rename(columns=ren)

    # Noms de base attendus
    required = ["commune_norm", "latitude", "longitude", "densite_norm"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise KeyError(f"Colonnes manquantes dans le CSV: {missing}. Colonnes trouvées: {list(df.columns)}")

    # Nettoyage types
    for c in ("latitude", "longitude", "densite_norm"):
        df[c] = pd.to_numeric(df[c], errors="coerce")

    before = len(df)
    df = df.dropna(subset=["latitude", "longitude", "densite_norm"])
    if len(df) < before:
        logger.warning("Population: lignes supprimées (NaN): %d", before - len(df))

    for c in ("commune", "commune_norm"):
        if c in df.columns:
            df[c] = df[c].astype(str).str.strip()

    # ---- Normalisation 0..1 sur toutes les métriques utiles ----
    for col in [
        "Indice_acces", "Indice_trans", "indice_densite", "Indice_POI",
        "IEDU", "INIV",
        "taux_jeunesse", "taux_vieillesse",
        "indice_trans_norm", "indice_trans_norm2",
        "indice_densite_norm",
        "densite",
        "nb_atm",
    ]:
        if col in df.columns and col not in ("densite", "nb_atm"):  # densite (absolue), nb_atm = exceptions
            df[col] = df[col].apply(_to01)

    # Alias supplémentaires pour compat front
    if "taux_jeuness" not in df.columns and "taux_jeunesse" in df.columns:
        df["taux_jeuness"] = df["taux_jeunesse"].apply(_to01)
    if "taux_vieilless" not in df.columns and "taux_vieillesse" in df.columns:
        df["taux_vieilless"] = df["taux_vieillesse"].apply(_to01)

    # Si le CSV n'a pas les formes minuscules attendues, crée-les
    if "indice_acces" not in df.columns and "Indice_acces" in df.columns:
        df["indice_acces"] = df["Indice_acces"]
    if "indice_trans" not in df.columns and "Indice_trans" in df.columns:
        df["indice_trans"] = df["Indice_trans"]
    if "indice_densi" not in df.columns and "indice_densite" in df.columns:
        df["indice_densi"] = df["indice_densite"]

    # nb_atm numérique
    if "nb_atm" in df.columns:
        df["nb_atm"] = pd.to_numeric(df["nb_atm"], errors="coerce").fillna(0).astype(float)

    return df


def get_population(*, s: float, n: float, w: float, e: float, limit: int = 20, page: int = 1) -> PopulationListResponse:
    df = _load_population_df()

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
                    densite_norm=float(_to01(row["densite_norm"])),
                    densite=(float(row["densite"]) if pd.notna(row.get("densite")) else None),
                )
            )
        except Exception as e:
            logger.error("Ligne ignorée (Population): %s", e)
            continue

    return PopulationListResponse(population=population_points, total_count=total)


# =====================================================================
# POI
# =====================================================================

@lru_cache(maxsize=1)
def _load_poi_df() -> pd.DataFrame:
    if not POI_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {POI_FILE}")

    with open(POI_FILE, "rb") as f:
        head = f.read(4096)
    try:
        head_txt = head.decode("utf-8-sig", errors="ignore")
    except Exception:
        head_txt = head.decode("latin-1", errors="ignore")
    sep = "\t" if "\t" in head_txt else (";" if ";" in head_txt else ",")

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
        for n in names:
            if n in df.columns:
                return n
            ln = n.lower()
            if ln in low:
                return low[ln]
        return None

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

    required = ["latitude", "longitude"]
    miss = [c for c in required if c not in df.columns]
    if miss:
        raise KeyError(f"POI CSV: colonnes manquantes {miss}. Colonnes={list(df.columns)}")

    df["latitude"]  = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    for c in ["type","key","value","name","brand","operator","address","commune","province","region","code"]:
        if c in df.columns:
            df[c] = df[c].astype(str).str.strip()

    if "type" not in df.columns:
        df["type"] = None
    df["type"] = df["type"].where(df["type"].notna() & (df["type"] != ""), df.get("value"))

    return df


def get_pois(*, s: float, n: float, w: float, e: float, limit: int = 300, page: int = 1) -> POIListResponse:
    df = _load_poi_df()

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
        if "tags_json" in df.columns and pd.notna(r.get("tags_json")):
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

def get_transport(
    *,
    s: float,
    n: float,
    w: float,
    e: float,
    limit: int = 300,
    page: int = 1,
) -> TransportListResponse:
    """
    Retourne les points de transport dans une bbox (s, n, w, e),
    avec pagination.
    """
    df = _load_transport_df()

    # Même logique que pour get_pois : gestion du meridien 180°
    if w <= e:
        mask = (df["lat"].between(s, n)) & (df["lon"].between(w, e))
    else:
        mask = (df["lat"].between(s, n)) & ((df["lon"] >= w) | (df["lon"] <= e))

    dfv = df.loc[mask].copy()

    total = int(len(dfv))
    start = (page - 1) * limit
    end = start + limit
    page_df = dfv.iloc[start:end]

    items: list[TransportPoint] = []
    for i, r in page_df.iterrows():
        items.append(
            TransportPoint(
                id=f"TP-{i+1}",
                latitude=float(r["lat"]),
                longitude=float(r["lon"]),
                transport_mode=(r.get("transport_mode") or None),
                name=(r.get("name") or None),
                operator=(r.get("operator") or None),
                network=(r.get("network") or None),
                osmid=(r.get("osmid") or None),
                osm_type=(r.get("osm_type") or None),
                railway=(r.get("railway") or None),
                highway=(r.get("highway") or None),
                amenity=(r.get("amenity") or None),
                tram=(r.get("tram") or None),
                bus=(r.get("bus") or None),
                route=(r.get("route") or None),
            )
        )

    return TransportListResponse(transports=items, total_count=total)


@lru_cache(maxsize=1)
def _load_transport_df() -> pd.DataFrame:
    """
    Charge les données de transport (train / tram / bus / taxi...) depuis TRANSPORT_FILE.

    Colonnes attendues :
      osmid, osm_type, name, transport_mode, lat, lon,
      operator, network, railway, highway, amenity, tram, bus, route
    """
    if not TRANSPORT_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {TRANSPORT_FILE}")

    df = pd.read_csv(TRANSPORT_FILE, encoding="utf-8-sig")

    # S'assurer que les colonnes existent
    for col in [
        "osmid", "osm_type", "name", "transport_mode",
        "lat", "lon",
        "operator", "network",
        "railway", "highway", "amenity",
        "tram", "bus", "route",
    ]:
        if col not in df.columns:
            df[col] = None

    # lat / lon numériques
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df = df.dropna(subset=["lat", "lon"])

    # Nettoyage des chaînes
    for c in [
        "osmid", "osm_type", "name", "transport_mode",
        "operator", "network",
        "railway", "highway", "amenity",
        "tram", "bus", "route",
    ]:
        df[c] = df[c].astype(str).str.strip()

    return df
# =====================================================================
# Scoring (communes)
# =====================================================================

def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = (math.sin(dphi/2)**2 +
         math.cos(p1)*math.cos(p2)*math.sin(dlmb/2)**2)
    return 2*R*math.asin(math.sqrt(a))

# Pondérations (somme ≈ 1)
DEFAULT_WEIGHTS = {
    "population":       0.20,  # densite_norm
    "competitors":      0.10,  # nb_atm (moins = mieux)
    "vieillissement":   0.05,  # taux_vieilless (moins = mieux)
    "niveau_vie":       0.10,  # INIV
    "fecondite":        0.05,  # indice_fecondite
    "accessibilite":    0.15,  # Indice_acces / indice_acces
    "jeunesse":         0.05,  # taux_jeuness
    "education":        0.10,  # IEDU
    "transport":        0.10,  # Indice_trans / indice_trans
    "densite_routiere": 0.10,  # indice_densite / indice_densi
}

def _norm_pct(x: Any) -> float:
    try:
        if x is None:
            return 0.0
        v = float(x)
    except Exception:
        return 0.0
    return v/100.0 if v > 1.0 else max(0.0, min(1.0, v))

def compute_site_score(row: Dict[str, Any], weights: Dict[str, float] | None = None) -> Dict[str, Any]:
    w = (weights or DEFAULT_WEIGHTS).copy()

    densite_norm    = _to01(row.get("densite_norm", 0))
    nb_atm          = float(row.get("nb_atm") or 0)

    taux_vieilless  = _to01(row.get("taux_vieilless", row.get("taux_vieillesse", 0)))
    iniv            = _to01(row.get("INIV", 0))
    i_fecond        = _to01(row.get("indice_fecondite", 0))
    i_acces         = _to01(row.get("Indice_acces", row.get("indice_acces", 0)))
    taux_jeuness    = _to01(row.get("taux_jeuness", row.get("taux_jeunesse", 0)))
    i_edu           = _to01(row.get("IEDU", 0))
    i_trans         = _to01(row.get("Indice_trans", row.get("indice_trans", 0)))
    i_dens_rout     = _to01(row.get("indice_densite", row.get("indice_densi", 0)))

    comp_norm   = 1.0 / (1.0 + max(nb_atm, 0.0))
    vieill_inv  = 1.0 - taux_vieilless

    parts01 = {
        "population":       densite_norm,
        "competitors":      comp_norm,
        "vieillissement":   vieill_inv,
        "niveau_vie":       iniv,
        "fecondite":        i_fecond,
        "accessibilite":    i_acces,
        "jeunesse":         taux_jeuness,
        "education":        i_edu,
        "transport":        i_trans,
        "densite_routiere": i_dens_rout,
    }

    avail = {k: v for k, v in parts01.items() if v is not None}
    sumw  = sum(w.get(k, 0.0) for k in avail)
    sumw  = sumw if sumw > 0 else 1.0

    total01 = 0.0
    contributions: Dict[str, float] = {}
    for k, v in avail.items():
        wk = w.get(k, 0.0) / sumw
        contrib = wk * float(v)
        contributions[k] = round(100.0 * contrib, 2)
        total01 += contrib

    score = round(100.0 * total01, 2)

    return {
        "score": score,
        "normalized": {k: round(100.0 * float(v), 2) for k, v in avail.items()},
        "weights":    {k: round(100.0 * (w.get(k, 0.0) / sumw), 2) for k in avail},
        "contribs":   contributions,
    }


def get_commune_indicators_by_name_or_code(commune_or_code: str) -> Dict[str, Any]:
    """Trouve la ligne du master (population/indicateurs) pour une commune donnée."""
    df = _load_population_df()
    key = str(commune_or_code).strip().lower()

    mask = df["commune_norm"].astype(str).str.strip().str.lower() == key
    if not mask.any():
        if "commune" in df.columns:
            mask = df["commune"].astype(str).str.strip().str.lower() == key

    if not mask.any():
        raise KeyError(f"Commune introuvable dans le master: '{commune_or_code}'")

    row = df.loc[mask].iloc[0].to_dict()

    indicators_keys = [
        "densite_norm", "Indice_POI", "Indice_POI_r",
        "indice_densite", "indice_densi",
        "Indice_acces", "indice_acces",
        "Indice_trans", "indice_trans",
        "IEDU", "INIV", "taux_jeuness", "taux_vieilless",
        "nb_atm", "densite"
    ]
    indicators = {k: row[k] for k in indicators_keys if k in row}
    score_obj = compute_site_score(row)

    return {
        "commune": row.get("commune_norm") or row.get("commune") or "",
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "indicators": indicators,
        "score": score_obj["score"],
    }


def get_commune_indicators(lat: float, lng: float) -> Dict[str, Any]:
    """Retourne la commune (centroïde le + proche) et ses indicateurs + score détaillé."""
    df = _load_population_df()

    d2 = (df["latitude"] - lat) ** 2 + (df["longitude"] - lng) ** 2
    idx = int(d2.idxmin())
    row = df.loc[idx].to_dict()

    raw_keys = [
        "densite_norm", "Indice_POI", "Indice_POI_r",
        "indice_densite", "indice_densi",
        "Indice_acces", "indice_acces",
        "Indice_trans", "indice_trans",
        "IEDU", "INIV", "taux_jeuness", "taux_vieilless",
        "nb_atm", "densite",
        "commune", "commune_norm", "latitude", "longitude"
    ]
    indicators = {k: row[k] for k in raw_keys if k in row}
    score_obj = compute_site_score(row)

    return {
        "commune": row.get("commune_norm") or row.get("commune") or "",
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "distance_km": _haversine_km(lat, lng, float(row["latitude"]), float(row["longitude"])),
        "indicators": indicators,
        "normalized": score_obj["normalized"],
        "weights": score_obj["weights"],
        "contribs": score_obj["contribs"],
        "score": score_obj["score"],
    }


# =====================================================================
# Clear caches (hot reload)
# =====================================================================

async def clear_data_caches():
    # Population
    try:
        _load_population_df.cache_clear()
    except Exception:
        pass

    # Concurrents
    try:
        _load_competitors_df.cache_clear()
    except Exception:
        pass

    # POI
    try:
        _load_poi_df.cache_clear()
    except Exception:
        pass

    # 🔁 Recharger les ATMs depuis atms_maroc_clean.csv
    try:
        await atm_service.reload_data()
        logger.info("Caches vidés et ATMs rechargés depuis le CSV.")
    except Exception as e:
        logger.error("Erreur lors du rechargement des ATMs: %s", e, exc_info=True)