"""
Saham Bank Geomarketing AI - API Server
FastAPI backend for the geomarketing solution
"""

import asyncio
from datetime import datetime
import logging
import time
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, Depends
from services import get_competitors # ajoute 

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from services import clear_data_caches 
from fastapi import Query


# Import the service layer which manages state and business logic
from config import settings
from logging_config import setup_logging
from schemas import (ATMData, ATMListResponse, DashboardResponse,
                     DashboardSummary, LocationData, OpportunityZone,
                     PerformanceTrend, PredictionResponse, RegionalAnalysis)
from services import ATMService, atm_service

from schemas import (CompetitorData, CompetitorListResponse) #ajoute
from services import get_population    #ajoute
from schemas import PopulationListResponse   #ajoute
from schemas import POIListResponse  #ajoutee
from services import get_pois #ajoutte 

# Setup structured logging
setup_logging()
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Saham Bank Geomarketing AI",
    description="API pour l'optimisation d'implantation d'automates bancaires",
    version="1.0.0"
)

# --- Configuration ---
allowed_origins = settings.ALLOWED_ORIGINS.split(",")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Logging Middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log HTTP requests and add a unique request ID."""
    request_id = str(uuid.uuid4())
    
    # Create a logger adapter to inject the request_id into all log messages
    adapter = logging.LoggerAdapter(logger, {'request_id': request_id})
    
    start_time = time.time()
    adapter.info(f"Request started: {request.method} {request.url.path}")

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000
    formatted_process_time = f'{process_time:.2f}ms'
    adapter.info(f"Request finished: {response.status_code} in {formatted_process_time}")

    return response


# --- Dependency Injection ---
def get_atm_service() -> ATMService:
    """Dependency to get the singleton ATM service instance."""
    return atm_service


@app.on_event("startup")
async def startup_event():
    """Initialisation au démarrage"""
    logger.info("Starting Saham Bank Geomarketing API")
    await atm_service.initialize()

    # Lancement de la tâche de fond pour la mise à jour des données
    asyncio.create_task(periodic_update_task())

    logger.info("API ready!")


async def periodic_update_task():
    """Tâche de fond qui exécute la mise à jour périodiquement."""
    while True:
        await asyncio.sleep(1800) # 30 minutes
        await atm_service.simulate_external_updates()

@app.get("/", tags=["Monitoring"])
async def root():
    """Point d'entrée de l'API"""
    return {
        "message": "Saham Bank Geomarketing AI API",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "predict": "/predict",
            "existing_atms": "/atms",
            "health": "/health",
            "dashboard": "/analytics/dashboard"
        }
    }

@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict_location(
    location: LocationData,
    service: ATMService = Depends(get_atm_service)
):
    """Prédit le potentiel d'un emplacement ATM"""
    try:
        # Prédiction ML
        prediction = service.predictor.predict_location(location)
        
        # Analyse de cannibalisation
        canibalization = service.canibalization_analyzer.calculate_canibalization(location)
        
        # Ajustement du score en fonction de la cannibalisation
        adjusted_score = prediction['global_score'] * (1 - canibalization['canibalization_risk'] / 200)

        response = PredictionResponse(
            predicted_volume=prediction['predicted_volume'],
            roi_probability=prediction['roi_probability'],
            roi_prediction=prediction['roi_prediction'],
            global_score=round(max(0, adjusted_score), 2),
            reason_codes=prediction['reason_codes'],
            recommendation=prediction['recommendation'],
            canibalization_analysis=canibalization
        )
        
        return response

    except ValueError as e:
        # Handle specific, known errors like model input issues
        raise HTTPException(status_code=400, detail=f"Invalid input for prediction: {str(e)}")
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error("Error during prediction", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred during prediction.")

@app.get("/atms", response_model=ATMListResponse, tags=["ATM Management"])
async def get_existing_atms(service: ATMService = Depends(get_atm_service)):
    """Retourne la liste des ATMs existants"""
    return ATMListResponse(
        atms=service.existing_atms,
        total_count=len(service.existing_atms)
    )

        

@app.post("/atms", response_model=ATMData, tags=["ATM Management"])
async def add_atm(atm: ATMData, service: ATMService = Depends(get_atm_service)):
    """Ajoute un nouvel ATM à la base"""
    new_atm = await service.add_new_atm(atm)
    return new_atm

@app.get("/analytics/dashboard", response_model=DashboardResponse, tags=["Analytics"])
async def get_dashboard_data(service: ATMService = Depends(get_atm_service)):
    """Données pour le tableau de bord avec analyse régionale"""
    atms = service.existing_atms
    # Calcul des métriques globales
    total_atms = len(atms)
    total_volume = sum(atm.monthly_volume for atm in atms if atm.monthly_volume is not None)
    avg_volume = total_volume / total_atms if total_atms > 0 else 0
    
    # Analyse par région
    regional_analysis_data = {}
    for atm in atms:
        region = atm.region or 'Unknown'
        if region not in regional_analysis_data:
            regional_analysis_data[region] = {'count': 0, 'volume': 0, 'cities': set()}
        regional_analysis_data[region]['count'] += 1
        regional_analysis_data[region]['volume'] += atm.monthly_volume or 0
        regional_analysis_data[region]['cities'].add(atm.city or 'Unknown')
    
    # Conversion des sets en listes pour JSON
    for region_data in regional_analysis_data.values():
        region_data['cities'] = list(region_data['cities'])
        region_data['avg_volume'] = region_data['volume'] / region_data['count']
    
    # Simulation de données de performance étendues
    performance_data = [
        {"month": "Jan", "volume": 45000, "roi": 12.5, "new_atms": 2},
        {"month": "Fév", "volume": 48000, "roi": 13.2, "new_atms": 1},
        {"month": "Mar", "volume": 52000, "roi": 14.1, "new_atms": 3},
        {"month": "Avr", "volume": 49000, "roi": 13.8, "new_atms": 2},
        {"month": "Mai", "volume": 55000, "roi": 15.2, "new_atms": 4},
        {"month": "Jun", "volume": 58000, "roi": 16.1, "new_atms": 2},
    ]
    
    # Zones d'opportunité étendues
    opportunity_zones = [
        {
            "zone": "Casablanca - Maarif Extension",
            "score": 85,
            "potential_volume": 1800,
            "competition_level": "Faible",
            "priority": "Haute",
            "region": "Casablanca-Settat"
        },
        {
            "zone": "Rabat - Hay Riad",
            "score": 78,
            "potential_volume": 1500,
            "competition_level": "Moyenne",
            "priority": "Haute",
            "region": "Rabat-Salé-Kénitra"
        },
        {
            "zone": "Marrakech - Hivernage",
            "score": 82,
            "potential_volume": 1600,
            "competition_level": "Faible",
            "priority": "Haute",
            "region": "Marrakech-Safi"
        },
        {
            "zone": "Tanger - Zone Franche",
            "score": 76,
            "potential_volume": 1300,
            "competition_level": "Moyenne",
            "priority": "Moyenne",
            "region": "Tanger-Tétouan-Al Hoceïma"
        },
        {
            "zone": "Agadir - Zone Touristique",
            "score": 74,
            "potential_volume": 1200,
            "competition_level": "Élevée",
            "priority": "Moyenne",
            "region": "Souss-Massa"
        },
        {
            "zone": "Fès - Campus Universitaire",
            "score": 71,
            "potential_volume": 1000,
            "competition_level": "Moyenne",
            "priority": "Faible",
            "region": "Fès-Meknès"
        }
    ]
    
    return DashboardResponse(
        summary=DashboardSummary(
            total_atms=total_atms,
            total_monthly_volume=total_volume,
            average_volume_per_atm=round(avg_volume, 0),
            network_roi=14.2,  # Simulated
            coverage_rate=78.5,  # Simulated
            cities_covered=len(set(atm.city for atm in atms if atm.city)),
            regions_covered=len(regional_analysis_data)
        ),
        regional_analysis={k: RegionalAnalysis(**v) for k, v in regional_analysis_data.items()},
        performance_trend=[PerformanceTrend(**p) for p in performance_data],
        opportunity_zones=[OpportunityZone(**o) for o in opportunity_zones],
        last_updated=datetime.now().isoformat()
    )

@app.get("/health", tags=["Monitoring"])
async def health_check(service: ATMService = Depends(get_atm_service)):
    """Vérification de l'état de l'API"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": service.predictor.is_trained,
        "atms_count": len(service.existing_atms)
    }

#endpoint ajoute competitoirs

@app.get("/competitors", response_model=CompetitorListResponse, tags=["ATM Management"])
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

    

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Saham Bank Geomarketing API")
    await atm_service.initialize()

    # clear file-based caches so we don't reuse a bad parse after code changes
    clear_data_caches()

    asyncio.create_task(periodic_update_task())
    logger.info("API ready!")