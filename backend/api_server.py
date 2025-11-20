"""
Saham Bank Geomarketing AI - API Server
FastAPI backend for the geomarketing solution
"""

import asyncio
from datetime import datetime
import logging
import time
import uuid
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from logging_config import setup_logging
from schemas import (
    ATMData, ATMListResponse, DashboardResponse, DashboardSummary,
    LocationData, OpportunityZone, PerformanceTrend, PredictionResponse, RegionalAnalysis,
    CompetitorListResponse, PopulationListResponse, POIListResponse,
    TransportListResponse,
)
from services import (
    ATMService, atm_service, clear_data_caches, get_competitors,
    get_population, get_pois, get_transport,
    get_commune_indicators,
    get_commune_feature, get_commune_indicators_by_name_or_code, _load_communes_geojson,
)
# --------- Logging setup ----------
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Saham Bank Geomarketing AI",
    description="API pour l'optimisation d'implantation d'automates bancaires",
    version="1.0.0",
)

# --------- CORS ----------
allowed_origins = settings.ALLOWED_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------- Logging middleware ----------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    adapter = logging.LoggerAdapter(logger, {"request_id": request_id})
    start_time = time.time()
    adapter.info(f"Request started: {request.method} {request.url.path}")
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    adapter.info(f"Request finished: {response.status_code} in {process_time:.2f}ms")
    return response

# --------- DI ----------
def get_atm_service() -> ATMService:
    return atm_service

# --------- Startup ----------
@app.on_event("startup")
async def startup_event():
    logger.info("Starting Saham Bank Geomarketing API")
    await atm_service.initialize()
    clear_data_caches()
    asyncio.create_task(periodic_update_task())
    logger.info("API ready!")

async def periodic_update_task():
    while True:
        await asyncio.sleep(1800)
        await atm_service.simulate_external_updates()

# --------- Endpoints ----------
@app.get("/", tags=["Monitoring"])
async def root():
    return {"message": "Saham Bank Geomarketing AI API", "version": "1.0.0", "status": "active"}

@app.get("/health", tags=["Monitoring"])
async def health_check(service: ATMService = Depends(get_atm_service)):
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": service.predictor.is_trained,
        "atms_count": len(service.existing_atms),
    }

# ---------- Predictions / ATMs ----------
@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict_location(location: LocationData, service: ATMService = Depends(get_atm_service)):
    try:
        prediction = service.predictor.predict_location(location)
        canib = service.canibalization_analyzer.calculate_canibalization(location)
        adjusted_score = prediction["global_score"] * (1 - canib["canibalization_risk"] / 200)
        return PredictionResponse(
            predicted_volume=prediction["predicted_volume"],
            roi_probability=prediction["roi_probability"],
            roi_prediction=prediction["roi_prediction"],
            global_score=round(max(0, adjusted_score), 2),
            reason_codes=prediction["reason_codes"],
            recommendation=prediction["recommendation"],
            canibalization_analysis=canib,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input for prediction: {e}")
    except Exception as e:
        logger.error("Error during prediction", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error during prediction.")

@app.get("/atms", response_model=ATMListResponse, tags=["ATM Management"])
async def get_existing_atms(service: ATMService = Depends(get_atm_service)):
    return ATMListResponse(atms=service.existing_atms, total_count=len(service.existing_atms))

@app.post("/atms", response_model=ATMData, tags=["ATM Management"])
async def add_atm(atm: ATMData, service: ATMService = Depends(get_atm_service)):
    return await service.add_new_atm(atm)

@app.get("/analytics/dashboard", response_model=DashboardResponse, tags=["Analytics"])
async def get_dashboard_data(service: ATMService = Depends(get_atm_service)):
    atms = service.existing_atms
    total_atms = len(atms)
    total_volume = sum(atm.monthly_volume for atm in atms if atm.monthly_volume is not None)
    avg_volume = total_volume / total_atms if total_atms > 0 else 0

    regional_analysis_data: dict[str, Any] = {}
    for atm in atms:
        region = atm.region or "Unknown"
        if region not in regional_analysis_data:
            regional_analysis_data[region] = {"count": 0, "volume": 0, "cities": set()}
        regional_analysis_data[region]["count"] += 1
        regional_analysis_data[region]["volume"] += atm.monthly_volume or 0
        regional_analysis_data[region]["cities"].add(atm.city or "Unknown")

    for region_data in regional_analysis_data.values():
        region_data["cities"] = list(region_data["cities"])
        region_data["avg_volume"] = region_data["volume"] / region_data["count"]

    performance_data = [
        {"month": "Jan", "volume": 45000, "roi": 12.5, "new_atms": 2},
        {"month": "Fév", "volume": 48000, "roi": 13.2, "new_atms": 1},
        {"month": "Mar", "volume": 52000, "roi": 14.1, "new_atms": 3},
        {"month": "Avr", "volume": 49000, "roi": 13.8, "new_atms": 2},
        {"month": "Mai", "volume": 55000, "roi": 15.2, "new_atms": 4},
        {"month": "Jun", "volume": 58000, "roi": 16.1, "new_atms": 2},
    ]

    opportunity_zones = [
        {"zone": "Casablanca - Maarif Extension", "score": 85, "potential_volume": 1800,
         "competition_level": "Faible", "priority": "Haute", "region": "Casablanca-Settat"},
        {"zone": "Rabat - Hay Riad", "score": 78, "potential_volume": 1500,
         "competition_level": "Moyenne", "priority": "Haute", "region": "Rabat-Salé-Kénitra"},
    ]

    return DashboardResponse(
        summary=DashboardSummary(
            total_atms=total_atms,
            total_monthly_volume=total_volume,
            average_volume_per_atm=round(avg_volume, 0),
            network_roi=14.2,
            coverage_rate=78.5,
            cities_covered=len(set(atm.city for atm in atms if atm.city)),
            regions_covered=len(regional_analysis_data),
        ),
        regional_analysis={k: RegionalAnalysis(**v) for k, v in regional_analysis_data.items()},
        performance_trend=[PerformanceTrend(**p) for p in performance_data],
        opportunity_zones=[OpportunityZone(**o) for o in opportunity_zones],
        last_updated=datetime.now().isoformat(),
    )

# ---------- Layers ----------
@app.get("/competitors", response_model=CompetitorListResponse, tags=["Layers"])
async def list_competitors():
    try:
        return get_competitors()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"CSV invalide: {e}")
    except Exception as e:
        logger.error("Erreur /competitors: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors du chargement des concurrents")

@app.get("/population", response_model=PopulationListResponse, tags=["Layers"])
async def list_population(
    s: float = Query(..., description="south"),
    n: float = Query(..., description="north"),
    w: float = Query(..., description="west"),
    e: float = Query(..., description="east"),
    limit: int = Query(20, ge=1, le=5000),
    page: int = Query(1, ge=1),
):
    try:
        return get_population(s=s, n=n, w=w, e=e, limit=limit, page=page)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"CSV invalide: {e}")
    except Exception as e:
        logger.error("Erreur /population: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors du chargement de la population")

@app.get("/pois", response_model=POIListResponse, tags=["Layers"])
async def list_pois(
    s: float = Query(..., description="south"),
    n: float = Query(..., description="north"),
    w: float = Query(..., description="west"),
    e: float = Query(..., description="east"),
    limit: int = Query(300, ge=1, le=5000),
    page: int = Query(1, ge=1),
):
    try:
        return get_pois(s=s, n=n, w=w, e=e, limit=limit, page=page)
    except FileNotFoundError as ex:
        raise HTTPException(status_code=404, detail=str(ex))
    except KeyError as ex:
        raise HTTPException(status_code=400, detail=f"CSV invalide: {ex}")
    except Exception as ex:
        logger.error("Erreur /pois: %s", ex, exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors du chargement des POI")



@app.get("/transport", response_model=TransportListResponse, tags=["Layers"])
async def list_transport(
    s: float = Query(..., description="south"),
    n: float = Query(..., description="north"),
    w: float = Query(..., description="west"),
    e: float = Query(..., description="east"),
    limit: int = Query(300, ge=1, le=5000),
    page: int = Query(1, ge=1),
):
    try:
        return get_transport(s=s, n=n, w=w, e=e, limit=limit, page=page)
    except FileNotFoundError as ex:
        raise HTTPException(status_code=404, detail=str(ex))
    except KeyError as ex:
        raise HTTPException(status_code=400, detail=f"CSV invalide: {ex}")
    except Exception as ex:
        logger.error("Erreur /transport: %s", ex, exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors du chargement des données de transport")

# ---------- Communes: GeoJSON ----------
@app.get("/communes/geojson", tags=["Communes"])
async def communes_geojson():
    try:
        gj = _load_communes_geojson()
        return gj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Communes: indicateurs (unique endpoint) ----------
@app.get("/communes/indicators", tags=["Scoring"])
async def communes_indicators(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    commune: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
) -> dict[str, Any]:
    """
    Utilisation:
      - /communes/indicators?lat=..&lng=..
      - /communes/indicators?commune=Dar%20Bouazza
      - /communes/indicators?code=<CODE_COMMUNE>
    """
    try:
        if lat is not None and lng is not None:
            return get_commune_indicators(lat=float(lat), lng=float(lng))

        key = commune or code
        if not key:
            raise HTTPException(status_code=422, detail="Fournir (lat,lng) ou (commune/code).")

        return get_commune_indicators_by_name_or_code(key)

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erreur /communes/indicators: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors du calcul des indicateurs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api_server:app", host="0.0.0.0", port=8000, reload=True)
