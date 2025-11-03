"""
Pydantic Schemas for the Geomarketing AI API.

These models define the data structures and validation rules for API requests and responses.
"""
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime   #ajoute
from pydantic import BaseModel, Field
from pydantic import BaseModel, Field


class LocationData(BaseModel):
    """Input data for predicting the potential of a new ATM location."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude of the location.", example=33.5731)
    longitude: float = Field(..., ge=-180, le=180, description="Longitude of the location.", example=-7.5898)
    population_density: Optional[float] = Field(1000, description="Population density in the area.", example=1500)
    commercial_poi_count: Optional[int] = Field(10, description="Number of commercial points of interest nearby.", example=25)
    competitor_atms_500m: Optional[int] = Field(2, description="Number of competitor ATMs within 500 meters.", example=1)
    foot_traffic_score: Optional[float] = Field(50, description="A score representing pedestrian traffic.", example=75)
    income_level: Optional[float] = Field(45000, description="Average income level in the area.", example=55000)
    accessibility_score: Optional[float] = Field(7, description="A score for location accessibility.", example=8.5)
    parking_availability: Optional[int] = Field(1, ge=0, le=1, description="1 if parking is available, 0 otherwise.", example=1)
    public_transport_nearby: Optional[int] = Field(1, ge=0, le=1, description="1 if public transport is nearby, 0 otherwise.", example=1)
    business_district: Optional[int] = Field(0, ge=0, le=1, description="1 if in a business district, 0 otherwise.", example=1)
    residential_area: Optional[int] = Field(1, ge=0, le=1, description="1 if in a residential area, 0 otherwise.", example=0)

    class Config:
        schema_extra = {
            "example": {
                "latitude": 33.59,
                "longitude": -7.61,
                "population_density": 2500,
                "commercial_poi_count": 30,
                "competitor_atms_500m": 1,
                "foot_traffic_score": 80,
                "income_level": 60000,
                "accessibility_score": 9,
                "parking_availability": 1,
                "public_transport_nearby": 1,
                "business_district": 1,
                "residential_area": 0
            }
        }


class ATMData(BaseModel):
    """Represents an ATM machine's data."""
    id: str = Field(..., description="Unique identifier for the ATM.", example="ATMCASA01")
    latitude: float = Field(..., ge=-90, le=90, example=33.5951)
    longitude: float = Field(..., ge=-180, le=180, example=-7.6185)
    monthly_volume: Optional[float] = Field(1000, description="Monthly transaction volume.", example=1300)
    bank_name: Optional[str] = Field("Saham Bank", description="The name of the bank owning the ATM.", example="Saham Bank")
    status: Optional[Literal['active', 'inactive', 'maintenance']] = Field("active", description="Current status of the ATM.")
    installation_type: Optional[Literal['agency', 'mobile']] = Field("agency", description="Type of ATM installation.")
    city: Optional[str] = Field("Unknown", example="Casablanca")
    region: Optional[str] = Field("Unknown", example="Casablanca-Settat")


class PredictionResponse(BaseModel):
    """The response from the location prediction endpoint."""
    predicted_volume: float = Field(..., description="The model's predicted monthly transaction volume.")
    roi_probability: float = Field(..., description="The probability of achieving a positive Return on Investment (ROI).")
    roi_prediction: bool = Field(..., description="The binary prediction for positive ROI (True/False).")
    global_score: float = Field(..., description="An overall score (0-100) for the location, adjusted for cannibalization.")
    reason_codes: List[str] = Field(..., description="Codes explaining the factors influencing the prediction.")
    recommendation: str = Field(..., description="A final recommendation (e.g., 'RECOMMANDÉ').")
    canibalization_analysis: Dict[str, Any] = Field(..., description="Analysis of the potential impact on nearby ATMs.")


class ATMListResponse(BaseModel):
    """Response model for a list of ATMs."""
    atms: List[ATMData]
    total_count: int


class DashboardSummary(BaseModel):
    """Summary statistics for the ATM network."""
    total_atms: int
    total_monthly_volume: float
    average_volume_per_atm: float
    network_roi: float
    coverage_rate: float
    cities_covered: int
    regions_covered: int


class RegionalAnalysis(BaseModel):
    """Analytics for a specific region."""
    count: int
    volume: float
    cities: List[str]
    avg_volume: float


class PerformanceTrend(BaseModel):
    """A single data point in a time-series performance trend."""
    month: str
    volume: int
    roi: float
    new_atms: int


class OpportunityZone(BaseModel):
    """A potential high-value zone for a new ATM."""
    zone: str
    score: int
    potential_volume: int
    competition_level: str
    priority: str
    region: str

class DashboardResponse(BaseModel):
    """The complete response for the analytics dashboard endpoint."""
    summary: DashboardSummary
    regional_analysis: Dict[str, RegionalAnalysis]
    performance_trend: List[PerformanceTrend]
    opportunity_zones: List[OpportunityZone]
    last_updated: datetime

 # --- Concurrents (nouveau) ---



class CompetitorData(BaseModel):
    id: str = Field(..., description="Identifiant unique du point concurrent")
    bank_name: str = Field("Inconnue", description="Nom de la banque concurrente")
    latitude: float
    longitude: float
    commune: Optional[str] = None
    commune_norm: Optional[str] = None
    nb_atm: int = Field(1, ge=0, description="Nombre d'ATMs de ce concurrent à cet endroit")

class CompetitorListResponse(BaseModel):
    competitors: List[CompetitorData]
    total_count: int    
   

class PopulationPoint(BaseModel):
    id: str
    commune: str | None = None
    commune_norm: str
    latitude: float
    longitude: float
    densite_norm: float
    densite: float | None = None   

class PopulationListResponse(BaseModel):
    population: list[PopulationPoint]
    total_count: int

class POI(BaseModel):
    id: str
    latitude: float
    longitude: float
    # Métadonnées principales à afficher
    type: Optional[str] = None
    key: Optional[str] = None
    value: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    operator: Optional[str] = None
    address: Optional[str] = None
    # Localisation
    commune: Optional[str] = None
    province: Optional[str] = None
    region: Optional[str] = None
    code: Optional[str] = None       # ex: COMMUNE_PCODE
    # tags bruts (si dispo)
    tags: Optional[Dict[str, Any]] = None

class POIListResponse(BaseModel):
    pois: List[POI]
    total_count: int    