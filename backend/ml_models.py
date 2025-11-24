"""
Saham Bank Geomarketing AI - Lightweight Models (Vercel friendly)
Version sans scikit-learn, basée sur des règles métier simples.
"""

import math
from datetime import datetime
from typing import List

import numpy as np

# Import Pydantic schemas
from schemas import ATMData, LocationData


class ATMLocationPredictor:
    """
    Modèle "light" pour prédire le potentiel d'un emplacement ATM.
    Ici on n'utilise PAS de modèles ML lourds, seulement des formules
    métier dérivées de tes données synthétiques.
    """

    def __init__(self):
        # Pas de vrais modèles entraînés ici
        self.is_trained = True

    def train(self, data=None):
        """
        Gardée pour compatibilité, mais ne fait rien de lourd.
        """
        self.is_trained = True
        return {
            "volume_rmse": 0.0,
            "roi_accuracy": 0.0,
            "training_date": datetime.now().isoformat(),
            "n_samples": 0,
        }

    def predict_location(self, location: LocationData) -> dict:
        """
        Prédit le potentiel d'un emplacement avec des règles simples.
        """

        # Volume estimé : on reprend l'esprit de ta logique métier
        volume_pred = (
            location.population_density * 0.01
            + location.commercial_poi_count * 50
            + location.foot_traffic_score * 10
            + location.income_level * 0.001
            + location.accessibility_score * 100
            + (location.parking_availability or 0) * 500
            + (location.public_transport_nearby or 0) * 300
            + (location.business_district or 0) * 800
        )

        # Score de ROI (simple, inspiré de ton code)
        roi_score = (
            volume_pred * 0.002
            - location.competitor_atms_500m * 0.1
            + location.accessibility_score * 0.05
        )

        # On convertit en "probabilité" avec une sigmoïde
        try:
            roi_prob = 1.0 / (1.0 + math.exp(-roi_score))
        except OverflowError:
            roi_prob = 1.0 if roi_score > 0 else 0.0

        roi_pred = roi_prob > 0.5

        # Score global 0–100
        global_score = min(100.0, max(0.0, (volume_pred / 50.0 + roi_prob * 100.0) / 2.0))

        # Codes d’explication
        reason_codes = self._generate_reason_codes(location, volume_pred, roi_prob)

        return {
            "predicted_volume": float(volume_pred),
            "roi_probability": float(roi_prob),
            "roi_prediction": bool(roi_pred),
            "global_score": float(global_score),
            "reason_codes": reason_codes,
            "recommendation": (
                "RECOMMANDÉ"
                if global_score > 70
                else "À ÉTUDIER"
                if global_score > 40
                else "NON RECOMMANDÉ"
            ),
        }

    def _generate_reason_codes(
        self, location: LocationData, volume_pred: float, roi_prob: float
    ) -> List[str]:
        """Génère les codes de raison pour l'explicabilité (reprend ton code)."""
        codes = []

        # Densité
        density = location.population_density
        if density > 2000:
            codes.append("RC-101: Densité de population élevée")
        elif density < 500:
            codes.append("RC-102: Densité de population faible")

        # Concurrence
        competitors = location.competitor_atms_500m
        if competitors > 3:
            codes.append("RC-201: Forte concurrence locale")
        elif competitors == 0:
            codes.append("RC-202: Zone sans concurrence directe")

        # Accessibilité
        accessibility = location.accessibility_score
        if accessibility > 8:
            codes.append("RC-301: Excellente accessibilité")
        elif accessibility < 5:
            codes.append("RC-302: Accessibilité limitée")

        # POI
        poi_count = location.commercial_poi_count
        if poi_count > 20:
            codes.append("RC-401: Zone commerciale très active")
        elif poi_count < 5:
            codes.append("RC-402: Peu d'activité commerciale")

        return codes[:3]

    def save_models(self, path_prefix: str = "models/atm_predictor"):
        """
        Gardée pour compatibilité, mais ne sauvegarde rien
        (sur Vercel, pas de persistance disque fiable).
        """
        return None


class CanibalizationAnalyzer:
    """Analyseur de cannibalisation entre ATMs (inchangé, juste numpy)."""

    def __init__(self):
        self.existing_atms: List[ATMData] = []

    def add_existing_atm(self, atm: ATMData):
        self.existing_atms.append(atm)

    def calculate_canibalization(self, new_location: LocationData) -> dict:
        if not self.existing_atms:
            return {"canibalization_risk": 0, "affected_atms": []}

        new_lat = new_location.latitude
        new_lon = new_location.longitude

        affected_atms = []
        total_impact = 0.0

        for atm in self.existing_atms:
            distance = (
                np.sqrt((new_lat - atm.latitude) ** 2 + (new_lon - atm.longitude) ** 2)
                * 111.0
            )  # km approx

            if distance < 2.0:
                impact = max(0.0, (2.0 - distance) / 2.0 * 100.0)
                affected_atms.append(
                    {
                        "atm_id": atm.id,
                        "distance_km": round(distance, 2),
                        "impact_percent": round(impact, 1),
                    }
                )
                total_impact += impact

        return {
            "canibalization_risk": min(100.0, total_impact),
            "affected_atms": affected_atms,
        }


if __name__ == "__main__":
    print("🏦 Saham Bank - Geomarketing AI Models (lightweight)")
    predictor = ATMLocationPredictor()
    print("✅ Modèle light initialisé.")
