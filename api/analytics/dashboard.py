from datetime import datetime
from http.server import BaseHTTPRequestHandler

from backend.services import atm_service

from .._utils import ensure_service, handle_options, respond_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        ensure_service()

        atms = atm_service.existing_atms
        total_atms = len(atms)
        total_volume = sum(atm.monthly_volume or 0 for atm in atms)
        avg_volume = total_volume / total_atms if total_atms else 0

        regional = {}
        for atm in atms:
            region = atm.region or "Unknown"
            group = regional.setdefault(
                region,
                {"count": 0, "volume": 0, "cities": set()},
            )
            group["count"] += 1
            group["volume"] += atm.monthly_volume or 0
            if atm.city:
                group["cities"].add(atm.city)

        regional_analysis = {
            region: {
                "count": stats["count"],
                "volume": stats["volume"],
                "cities": sorted(stats["cities"]),
                "avg_volume": stats["volume"] / stats["count"] if stats["count"] else 0,
            }
            for region, stats in regional.items()
        }

        performance_trend = [
            {"month": "Jan", "volume": 45000, "roi": 12.5, "new_atms": 2},
            {"month": "Fév", "volume": 48000, "roi": 13.2, "new_atms": 1},
            {"month": "Mar", "volume": 52000, "roi": 14.1, "new_atms": 3},
            {"month": "Avr", "volume": 49000, "roi": 13.8, "new_atms": 2},
            {"month": "Mai", "volume": 55000, "roi": 15.2, "new_atms": 4},
            {"month": "Jun", "volume": 58000, "roi": 16.1, "new_atms": 2},
        ]

        opportunity_zones = [
            {
                "zone": "Casablanca - Maarif Extension",
                "score": 85,
                "potential_volume": 1800,
                "competition_level": "Faible",
                "priority": "Haute",
                "region": "Casablanca-Settat",
            },
            {
                "zone": "Rabat - Hay Riad",
                "score": 78,
                "potential_volume": 1500,
                "competition_level": "Moyenne",
                "priority": "Haute",
                "region": "Rabat-Salé-Kénitra",
            },
            {
                "zone": "Marrakech - Hivernage",
                "score": 82,
                "potential_volume": 1600,
                "competition_level": "Faible",
                "priority": "Haute",
                "region": "Marrakech-Safi",
            },
            {
                "zone": "Tanger - Zone Franche",
                "score": 76,
                "potential_volume": 1300,
                "competition_level": "Moyenne",
                "priority": "Moyenne",
                "region": "Tanger-Tétouan-Al Hoceïma",
            },
            {
                "zone": "Agadir - Zone Touristique",
                "score": 74,
                "potential_volume": 1200,
                "competition_level": "Élevée",
                "priority": "Moyenne",
                "region": "Souss-Massa",
            },
            {
                "zone": "Fès - Campus Universitaire",
                "score": 71,
                "potential_volume": 1000,
                "competition_level": "Moyenne",
                "priority": "Faible",
                "region": "Fès-Meknès",
            },
        ]

        payload = {
            "summary": {
                "total_atms": total_atms,
                "total_monthly_volume": total_volume,
                "average_volume_per_atm": round(avg_volume, 0),
                "network_roi": 14.2,
                "coverage_rate": 78.5,
                "cities_covered": len({atm.city for atm in atms if atm.city}),
                "regions_covered": len(regional_analysis),
            },
            "regional_analysis": regional_analysis,
            "performance_trend": performance_trend,
            "opportunity_zones": opportunity_zones,
            "last_updated": datetime.utcnow().isoformat() + "Z",
        }

        respond_json(self, 200, payload)

    def log_message(self, format, *args):
        return

