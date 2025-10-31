"use client"

import { useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { MOCK_POIS } from "@/lib/mock-map-data"
import { useCompetitors } from "@/hooks/use-competitors"
import { ATM, HoverData } from "@/types"
import ATMHoverCard from "./atm-hover-card"
import MapLegend from "./map-legend"
import { usePopulation } from "@/hooks/use-population"

interface LeafletMapClientProps {
  activeLayers: { [key: string]: boolean }
  simulationMode: boolean
  onLocationSelect: (location: { lng: number; lat: number; address?: string }) => void
  atms: ATM[]
  selectedATM?: ATM | null
  onATMSelect?: (atm: ATM) => void
}

export default function LeafletMapClient({
  activeLayers,
  simulationMode,
  onLocationSelect,
  atms,
  selectedATM,
  onATMSelect,
}: LeafletMapClientProps) {
  const [simulationPoint, setSimulationPoint] = useState<{ lng: number; lat: number } | null>(null)
  const [hoveredATM, setHoveredATM] = useState<HoverData | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const { data: competitors, loading: competitorsLoading, error: competitorsError } =
  useCompetitors(!!activeLayers.competitors);
  const { data: population, loading: populationLoading, error: populationError } =
  usePopulation(!!activeLayers.population);

  const handleLocationSelect = (location: { lng: number; lat: number }) => {
    setSimulationPoint(location)
    onLocationSelect(location)
  }

  const getPerformanceColor = (val: number) =>
    val >= 90 ? "#10b981" : val >= 80 ? "#f59e0b" : "#ef4444"

  const getTypeColor = (type: string) =>
    ({
      bank: "#ef4444",
      insurance: "#f59e0b",
      microfinance: "#8b5cf6",
      shopping: "#10b981",
      education: "#3b82f6",
      transport: "#f59e0b",
      health: "#ef4444",
      tourism: "#6366f1",
    }[type] ?? "#6b7280")

  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        if (simulationMode && e?.latlng) handleLocationSelect(e.latlng)
      },
    })
    return null
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ minHeight: "500px" }}>
      <MapContainer
        center={[31.7917, -7.0926]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        <MapEvents />

        {/* ATMs */}
        {atms.map((atm) => {
          const performanceScore = Math.round(Math.min(100, (atm.monthly_volume / 1500) * 100));
          const safePerformance = Number.isFinite(performanceScore) ? performanceScore : 0

          return (
            <CircleMarker
              key={`atm-${atm.id}`}
              center={[atm.latitude, atm.longitude]}
              radius={Math.max(8, safePerformance / 10)}
              pathOptions={{
                fillColor:
                  selectedATM?.id === atm.id ? "#fde047" : getPerformanceColor(safePerformance),
                color: selectedATM?.id === atm.id ? "#facc15" : "#ffffff",
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.8,
              }}
              eventHandlers={{
                click: () => {
                  onATMSelect?.(atm)
                },
                mouseover: (e) => {
                  const map = e.target._map
                  if (map && e.originalEvent) {
                    const pt = map.mouseEventToContainerPoint(e.originalEvent)
                    const rect = map.getContainer().getBoundingClientRect()
                    setHoverPosition({
                      x: rect.left + pt.x + window.scrollX,
                      y: rect.top + pt.y + window.scrollY,
                    })
                    setHoveredATM({
                      id: atm.id,
                      name: atm.name,
                      type: atm.bank_name === "Saham Bank" ? "saham" : "competitor",
                      latitude: atm.latitude,
                      longitude: atm.longitude,
                      bank_name: atm.bank_name,
                      installation_type: atm.installation_type,
                      monthly_volume: atm.monthly_volume,
                      services: atm.services,
                      branch_location: atm.branch_location,
                    })
                  }
                  e.target.setStyle({ fillOpacity: 1, color: "#000000" })
                },
                mouseout: (e) => {
                  setHoveredATM(null)
                  e.target.setStyle({
                    fillOpacity: 0.8,
                    color: selectedATM?.id === atm.id ? "#facc15" : "#ffffff",
                  })
                },
              }}
            >
              <Popup>
                <strong>{atm.name || atm.id}</strong>
                <br />
                {atm.branch_location}
              </Popup>
            </CircleMarker>
          )
        })}

        {/* Competitors (données réelles API) */}
{activeLayers.competitors && (
  <>
    {competitorsError && (
      <div className="leaflet-top leaflet-left">
        <div className="leaflet-control text-red-500 bg-white/80 p-1 rounded">
          Err: {competitorsError}
        </div>
      </div>
    )}

    {competitorsLoading && (
      <div className="leaflet-top leaflet-left">
        <div className="leaflet-control bg-white/80 p-1 rounded">
          Chargement concurrents…
        </div>
      </div>
    )}

    {!competitorsLoading &&
      competitors.map((p) => (
        <CircleMarker
          key={`comp-${p.id}`}
          center={[p.latitude, p.longitude]}
          radius={10}
          pathOptions={{
            // rouge pour concurrents
            fillColor: "#ef4444",
            color: "#ffffff",
            weight: 2,
            opacity: 0.7,
            fillOpacity: 0.7,
          }}
          eventHandlers={{
            mouseover: (e) => {
              const map = (e as any).target._map;
              if (map && (e as any).originalEvent) {
                const pt = map.mouseEventToContainerPoint((e as any).originalEvent);
                const rect = map.getContainer().getBoundingClientRect();
                setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y });
                setHoveredATM({
                  id: p.id,
                  name: p.bank_name ?? "Inconnue",
                  type: "competitor",
                  latitude: p.latitude,
                  longitude: p.longitude,
                  bank_name: p.bank_name ?? "Inconnue",
                  monthly_volume: p.nb_atm, // on recycle pour afficher un chiffre
                });
              }
              (e as any).target.setStyle({ fillOpacity: 1, color: "#000000" });
            },
            mouseout: (e) => {
              setHoveredATM(null);
              (e as any).target.setStyle({ fillOpacity: 0.7, color: "#ffffff" });
            },
          }}
        >
          <Popup>
            <strong>{p.bank_name ?? "Inconnue"}</strong>
            <br />
            {p.commune ?? "-"}<br />
            ATMs : {p.nb_atm}
          </Popup>
        </CircleMarker>
      ))}
  </>
)}
        {/* POIs */}
        {activeLayers.pois &&
          MOCK_POIS.map((poi) => (
            <CircleMarker
              key={`poi-${poi.id}`}
              center={[poi.lat, poi.lng]}
              radius={8}
              pathOptions={{
                fillColor: getTypeColor(poi.type),
                color: "#ffffff",
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.8,
              }}
              eventHandlers={{
                mouseover: (e) => {
                  const map = e.target._map
                  if (map && e.originalEvent) {
                    const pt = map.mouseEventToContainerPoint(e.originalEvent)
                    const rect = map.getContainer().getBoundingClientRect()
                    setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y })
                    setHoveredATM({ 
                      id: poi.id,
                      name: poi.name,
                      type: "poi",
                      latitude: poi.lat,
                      longitude: poi.lng,
                      category: poi.category,
                      footTraffic: poi.footTraffic,
                    })
                  }
                  e.target.setStyle({ fillOpacity: 1, color: "#000000" })
                },
                mouseout: (e) => {
                  setHoveredATM(null)
                  e.target.setStyle({ fillOpacity: 0.8, color: "#ffffff" })
                },
              }}
            >
              <Popup>
                <strong>{poi.name}</strong>
                <br />
                {poi.category}
              </Popup>
            </CircleMarker>
          ))}
        {/* Population (densité) */}
{activeLayers.population && (
  <>
    {populationError && (
      <div className="leaflet-top leaflet-left">
        <div className="leaflet-control text-red-500 bg-white/80 p-1 rounded">
          Err: {populationError}
        </div>
      </div>
    )}

    {populationLoading && (
      <div className="leaflet-top leaflet-left">
        <div className="leaflet-control bg-white/80 p-1 rounded">
          Chargement population…
        </div>
      </div>
    )}

    {!populationLoading &&
      population.map((p) => {
        const getColor = (v: number) => {
          if (v > 0.8) return "#800026";
          if (v > 0.6) return "#BD0026";
          if (v > 0.4) return "#E31A1C";
          if (v > 0.2) return "#FD8D3C";
          return "#FED976";
        };

        return (
          <CircleMarker
            key={`pop-${p.id}`}
            center={[p.latitude, p.longitude]}
            radius={8}
            pathOptions={{
              fillColor: getColor(p.densite_norm),
              color: "#ffffff",
              weight: 2,
              opacity: 0.7,
              fillOpacity: 0.7,
            }}
            eventHandlers={{
              mouseover: (e) => {
                const map = (e as any).target._map;
                if (map && (e as any).originalEvent) {
                  const pt = map.mouseEventToContainerPoint((e as any).originalEvent);
                  const rect = map.getContainer().getBoundingClientRect();
                  setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y });
                  setHoveredATM({
                    id: p.id,
                    name: p.commune || p.commune_norm,
                    type: "population",
                    latitude: p.latitude,
                    longitude: p.longitude,
                    densite_norm: p.densite_norm,
                    densite: p.densite ?? null,
                  });
                }
                (e as any).target.setStyle({ fillOpacity: 1, color: "#000000" });
              },
              mouseout: (e) => {
                setHoveredATM(null);
                (e as any).target.setStyle({ fillOpacity: 0.7, color: "#ffffff" });
              },
            }}
          >
            <Popup>
              <strong>{p.commune || p.commune_norm}</strong>
              <br />
              Densité : {p.densite_norm.toFixed(3)}
            </Popup>
          </CircleMarker>
        );
      })}
  </>
)}

        {/* Simulation */}
        {simulationMode && simulationPoint && (
          <CircleMarker
            key={`${simulationPoint.lat},${simulationPoint.lng}`}
            center={[simulationPoint.lat, simulationPoint.lng]}
            radius={12}
            pathOptions={{
              fillColor: "#6366f1",
              color: "#ffffff",
              weight: 3,
              opacity: 1,
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <strong>Point de simulation</strong>
              <br />
              Lat: {simulationPoint.lat.toFixed(4)}, Lng: {simulationPoint.lng.toFixed(4)}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      <MapLegend />
      <ATMHoverCard atm={hoveredATM} position={hoverPosition} visible={!!hoveredATM && !selectedATM} />
    </div>
  )
}
