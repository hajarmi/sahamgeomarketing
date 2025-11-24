"""
Saham Bank Geomarketing AI - Machine Learning Models
ML Pipeline for optimal ATM placement.
"""

import json
import warnings
from datetime import datetime
from typing import List
from sklearn.dummy import DummyClassifier #ajoute
import numpy as np #ajooute 
from sklearn.dummy import DummyClassifier, DummyRegressor  #ajoute


import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, classification_report
warnings.filterwarnings('ignore')

# Import Pydantic schemas to enforce data contracts
from schemas import ATMData, LocationData

class ATMLocationPredictor:
    """Modèle de prédiction des volumes et ROI pour les emplacements ATM"""
    
    def __init__(self):
        self.volume_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.roi_model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def generate_synthetic_data(self, n_samples=1000):
        """Génère des données synthétiques pour l'entraînement"""
        np.random.seed(42)
        
        # Features géographiques et démographiques
        data = {
            'population_density': np.random.lognormal(6, 1, n_samples),
            'commercial_poi_count': np.random.poisson(15, n_samples),
            'competitor_atms_500m': np.random.poisson(3, n_samples),
            'foot_traffic_score': np.random.beta(2, 5, n_samples) * 100,
            'income_level': np.random.normal(50000, 15000, n_samples),
            'accessibility_score': np.random.beta(3, 2, n_samples) * 10,
            'parking_availability': np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
            'public_transport_nearby': np.random.choice([0, 1], n_samples, p=[0.4, 0.6]),
            'business_district': np.random.choice([0, 1], n_samples, p=[0.7, 0.3]),
            'residential_area': np.random.choice([0, 1], n_samples, p=[0.5, 0.5])
        }
        
        df = pd.DataFrame(data)
        
        # Calcul des volumes basé sur les features (logique métier)
        df['monthly_withdrawals'] = (
            df['population_density'] * 0.01 +
            df['commercial_poi_count'] * 50 +
            df['foot_traffic_score'] * 10 +
            df['income_level'] * 0.001 +
            df['accessibility_score'] * 100 +
            df['parking_availability'] * 500 +
            df['public_transport_nearby'] * 300 +
            df['business_district'] * 800 +
            np.random.normal(0, 200, n_samples)
        ).clip(0, None)
        
        # Calcul du ROI (binaire: profitable ou non)
        roi_score = (
            df['monthly_withdrawals'] * 0.002 -
            df['competitor_atms_500m'] * 0.1 +
            df['accessibility_score'] * 0.05 +
            np.random.normal(0, 0.1, n_samples)
        )
        df['roi_positive'] = (roi_score > 0.5).astype(int)
        
        # Ajout de coordonnées géographiques (Maroc - région Casablanca)
        df['latitude'] = np.random.uniform(33.4, 33.7, n_samples)
        df['longitude'] = np.random.uniform(-7.8, -7.4, n_samples)
        
        return df
    
    def train(self, data=None):
        """Entraîne les modèles ML"""
        if data is None:
            data = self.generate_synthetic_data()
        
        # Préparation des features
        feature_cols = [
            'population_density', 'commercial_poi_count', 'competitor_atms_500m',
            'foot_traffic_score', 'income_level', 'accessibility_score',
            'parking_availability', 'public_transport_nearby', 
            'business_district', 'residential_area'
        ]
        
        X = data[feature_cols]
        y_volume = data['monthly_withdrawals']
        y_roi = data['roi_positive']
        
        # Normalisation des features
        X_scaled = self.scaler.fit_transform(X)
        
        # Division train/test
        X_train, X_test, y_vol_train, y_vol_test, y_roi_train, y_roi_test = train_test_split(
            X_scaled, y_volume, y_roi, test_size=0.2, random_state=42
        )
        
        # Entraînement modèle de volume
        self.volume_model.fit(X_train, y_vol_train)
        vol_pred = self.volume_model.predict(X_test)
        vol_rmse = np.sqrt(mean_squared_error(y_vol_test, vol_pred))
        
        # Entraînement modèle ROI
        self.roi_model.fit(X_train, y_roi_train)
        roi_pred = self.roi_model.predict(X_test)
        
        self.is_trained = True
        
        # Métriques de performance
        performance = {
            'volume_rmse': float(vol_rmse),
            'roi_accuracy': float(np.mean(roi_pred == y_roi_test)),
            'training_date': datetime.now().isoformat(),
            'n_samples': len(data)
        }
        
        print(f"✅ Modèles entraînés avec succès!")
        print(f"📊 Volume RMSE: {vol_rmse:.2f}")
        print(f"📊 ROI Accuracy: {performance['roi_accuracy']:.3f}")
        
        return performance
    
    def predict_location(self, location: LocationData) -> dict:
        """Prédit le potentiel d'un emplacement"""
        if not self.is_trained:
            print("⚠️ Modèle non entraîné, entraînement automatique...")
            self.train()
        
        # Préparation des données
        features = np.array([[
            location.population_density,
            location.commercial_poi_count,
            location.competitor_atms_500m,
            location.foot_traffic_score,
            location.income_level,
            location.accessibility_score,
            location.parking_availability,
            location.public_transport_nearby,
            location.business_district,
            location.residential_area
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        # Prédictions
        volume_pred = self.volume_model.predict(features_scaled)[0]
        roi_prob = self.roi_model.predict_proba(features_scaled)[0][1]
        roi_pred = self.roi_model.predict(features_scaled)[0]
        
        # Calcul du score global (0-100)
        global_score = min(100, max(0, (volume_pred / 50 + roi_prob * 100) / 2))
        
        # Reason codes (explicabilité)
        reason_codes = self._generate_reason_codes(location, volume_pred, roi_prob)
        
        return {
            'predicted_volume': float(volume_pred),
            'roi_probability': float(roi_prob),
            'roi_prediction': bool(roi_pred),
            'global_score': float(global_score),
            'reason_codes': reason_codes,
            'recommendation': 'RECOMMANDÉ' if global_score > 70 else 'À ÉTUDIER' if global_score > 40 else 'NON RECOMMANDÉ'
        }
    
    def _generate_reason_codes(self, location: LocationData, volume_pred: float, roi_prob: float) -> List[str]:
        """Génère les codes de raison pour l'explicabilité"""
        codes = []
        
        # Analyse de la densité
        density = location.population_density
        if density > 2000:
            codes.append("RC-101: Densité de population élevée")
        elif density < 500:
            codes.append("RC-102: Densité de population faible")
        
        # Analyse de la concurrence
        competitors = location.competitor_atms_500m
        if competitors > 3:
            codes.append("RC-201: Forte concurrence locale")
        elif competitors == 0:
            codes.append("RC-202: Zone sans concurrence directe")
        
        # Analyse de l'accessibilité
        accessibility = location.accessibility_score
        if accessibility > 8:
            codes.append("RC-301: Excellente accessibilité")
        elif accessibility < 5:
            codes.append("RC-302: Accessibilité limitée")
        
        # Analyse des POI
        poi_count = location.commercial_poi_count
        if poi_count > 20:
            codes.append("RC-401: Zone commerciale très active")
        elif poi_count < 5:
            codes.append("RC-402: Peu d'activité commerciale")
        
        return codes[:3]  # Limite à 3 codes principaux
    
    def save_models(self, path_prefix='models/atm_predictor'):
        """Sauvegarde les modèles entraînés"""
        if not self.is_trained:
            raise ValueError("Modèles non entraînés")
        
        joblib.dump(self.volume_model, f'{path_prefix}_volume.pkl')
        joblib.dump(self.roi_model, f'{path_prefix}_roi.pkl')
        joblib.dump(self.scaler, f'{path_prefix}_scaler.pkl')
        
        print(f"✅ Modèles sauvegardés: {path_prefix}_*.pkl")

class CanibalizationAnalyzer:
    """Analyseur de cannibalisation entre ATMs"""
    
    def __init__(self):
        self.existing_atms: List[ATMData] = []
    
    def add_existing_atm(self, atm: ATMData):
        """Ajoute un ATM existant à l'analyse"""
        self.existing_atms.append(atm)
    
    def calculate_canibalization(self, new_location: LocationData) -> dict:
        """Calcule l'impact de cannibalisation d'un nouvel ATM"""
        if not self.existing_atms:
            return {'canibalization_risk': 0, 'affected_atms': []}
        
        new_lat = new_location.latitude
        new_lon = new_location.longitude
        
        affected_atms = []
        total_impact = 0
        
        for atm in self.existing_atms:
            # Calcul de la distance (approximation)
            distance = np.sqrt(
                (new_lat - atm.latitude)**2 +
                (new_lon - atm.longitude)**2
            ) * 111  # Conversion en km approximative
            
            if distance < 2:  # Zone d'influence de 2km
                impact = max(0, (2 - distance) / 2 * 100)  # Impact en %
                affected_atms.append({
                    'atm_id': atm.id,
                    'distance_km': round(distance, 2),
                    'impact_percent': round(impact, 1)
                })
                total_impact += impact
        
        return {
            'canibalization_risk': min(100, total_impact),
            'affected_atms': affected_atms
        }

# Test et démonstration
if __name__ == "__main__":
    print("🏦 Saham Bank - Geomarketing AI Models")
    print("=" * 50)
    
    # Initialisation du prédicteur
    predictor = ATMLocationPredictor()
    
    # Entraînement
    performance = predictor.train()
    
    # Test de prédiction
    test_location = LocationData(
        latitude=33.5731,
        longitude=-7.5898,
        population_density=1500,
        commercial_poi_count=25,
        competitor_atms_500m=1,
        foot_traffic_score=75,
        income_level=55000,
        accessibility_score=8.5,
        parking_availability=1,
        public_transport_nearby=1,
        business_district=1,
        residential_area=0
    )
    
    prediction = predictor.predict_location(test_location)
    
    print("\n📍 Test de prédiction:")
    print(f"Volume prévu: {prediction['predicted_volume']:.0f} retraits/mois")
    print(f"Probabilité ROI+: {prediction['roi_probability']:.1%}")
    print(f"Score global: {prediction['global_score']:.1f}/100")
    print(f"Recommandation: {prediction['recommendation']}")
    print("\n🔍 Codes de raison:")
    for code in prediction['reason_codes']:
        print(f"  • {code}")
    
    print("\n✅ Modèles ML initialisés avec succès!")
