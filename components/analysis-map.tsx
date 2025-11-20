"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from "react-leaflet";
import L, { Layer } from "leaflet";
import "leaflet/dist/leaflet.css";

type CityFeature = GeoJSON.Feature<GeoJSON.Point, {
  name?: string; city_name?: string; province_name?: string; region_name?: string; city_code?: string;
}>;
type CommuneFeature = GeoJSON.Feature<GeoJSON.Polygon|GeoJSON.MultiPolygon, {
  name: string; province_name?: string; region_name?: string; code: string;
}>;

const CITY_ZOOM = 8;

export default function AnalysisMap({
  simulationMode,
  onLocationSelect,
}: {
  simulationMode: boolean;
  onLocationSelect?: (loc: {lat:number; lng:number}) => void;
}) {
  const [zoom, setZoom] = useState(6);
  const [cities, setCities] = useState<GeoJSON.FeatureCollection | null>(null);
  const [communes, setCommunes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityFeature | null>(null);
  const communesRef = useRef<L.GeoJSON>(null);

  useEffect(() => {
    fetch("/geo/cities.geojson").then(r=>r.json()).then(setCities).catch(()=>setCities(null));
    fetch("/geo/communes.geojson").then(r=>r.json()).then(setCommunes).catch(()=>setCommunes(null));
  }, []);

  function Events() {
    useMapEvents({
      zoomend(e) { setZoom(e.target.getZoom()); },
      click(e) { if (simulationMode) onLocationSelect?.({lat:e.latlng.lat, lng:e.latlng.lng}); }
    });
    return null;
  }

  const cityPointToLayer = (f: CityFeature, latlng: L.LatLng) =>
    L.circleMarker(latlng, { radius:6, color:"#fff", weight:1.5, fillColor:"#ff4d4f", fillOpacity:0.95 });

  const onEachCity = (f: CityFeature, layer: Layer) => {
    const label = f.properties?.city_name || f.properties?.name || "Ville";
    (layer as any).bindTooltip(label, {direction:"top", offset:L.point(0,-6)});
    layer.on("click", () => {
      setSelectedCity(f);
      setTimeout(() => {
        const g = communesRef.current;
        if (g && (g as any).getBounds) {
          const b = (g as any).getBounds() as L.LatLngBounds;
          const layerAny = g as any;
          if (b && b.isValid() && layerAny._map) {
            layerAny._map.fitBounds(b.pad(0.08));
}
        }
      }, 0);
    });
  };

  const filteredCommunes = useMemo(() => {
    if (!communes || !selectedCity) return { type:"FeatureCollection", features:[] } as GeoJSON.FeatureCollection;
    const prov = (selectedCity.properties as any)?.province_name;
    const reg  = (selectedCity.properties as any)?.region_name;
    const feats = (communes.features as CommuneFeature[]).filter(c =>
      prov ? c.properties?.province_name === prov : c.properties?.region_name === reg
    );
    return { type:"FeatureCollection", features:feats } as GeoJSON.FeatureCollection;
  }, [communes, selectedCity]);

  const showCities   = zoom < CITY_ZOOM || !selectedCity;
  const showCommunes = zoom >= CITY_ZOOM && !!selectedCity;

  return (
    <MapContainer
      center={[31.7917, -7.0926]}
      zoom={6}
      style={{height:"100%", width:"100%"}}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      <Events />

      {cities && showCities && (
        <GeoJSON data={cities as any} pointToLayer={cityPointToLayer as any} onEachFeature={onEachCity as any}/>
      )}

      {showCommunes && (filteredCommunes as any).features?.length > 0 && (
        <GeoJSON
          ref={communesRef}
          data={filteredCommunes as any}
          style={() => ({ color:"#ff7a45", weight:1, fillOpacity:0.15 })}
          onEachFeature={(f: any, layer) => (layer as any).bindTooltip(f.properties?.name || "Commune", {sticky:true})}
        />
      )}
    </MapContainer>
  );
}
