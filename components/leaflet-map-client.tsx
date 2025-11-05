// components/leaflet-map-client.tsx
"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { usePOIs, type BBox } from "@/hooks/use-pois"
import { useCompetitors } from "@/hooks/use-competitors"
import { usePopulation } from "@/hooks/use-population"
import type { ATM, HoverData } from "@/types"
import ATMHoverCard from "./atm-hover-card"
import MapLegend from "./map-legend"

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

  // --- BBOX & ZOOM depuis la carte ---
  const [bbox, setBBox] = useState<BBox>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(6)

  const handleLocationSelect = (location: { lng: number; lat: number }) => {
    setSimulationPoint(location)
    onLocationSelect(location)
  }

  const MapEvents = () => {
    useMapEvents({
      moveend: (e) => {
        const map = e.target
        const b = map.getBounds()
        setBBox({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() })
      },
      zoomend: (e) => {
        const map = e.target
        const b = map.getBounds()
        setBBox({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() })
        setZoomLevel(map.getZoom())
      },
      click: (e) => {
        if (simulationMode && e?.latlng) handleLocationSelect(e.latlng)
      },
    })
    return null
  }

  // --- Hooks data ---
  const {
    data: competitors,
    loading: competitorsLoading,
    error: competitorsError,
  } = useCompetitors(!!activeLayers.competitors)

  // Population & POIs: auto-limit par zoom (pas de pagination)
  const {
    data: population,
    loading: populationLoading,
    error: populationError,
    reset: resetPopulation,
  } = usePopulation(!!activeLayers.population, bbox, zoomLevel)

  const {
    pois,
    loading: poisLoading,
    error: poisError,
    reset: resetPois,
  } = usePOIs(!!activeLayers.pois, bbox, zoomLevel)

  // reset quand on coupe les couches
  useEffect(() => {
    if (!activeLayers.pois) resetPois()
    if (!activeLayers.population) resetPopulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.pois, activeLayers.population])

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

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ minHeight: "500px" }}>
      {(poisError || competitorsError || populationError) && (
        <div className="absolute z-[5000] top-2 left-2 bg-white/90 text-red-600 px-2 py-1 rounded shadow">
          {poisError && <>Erreur POI: {poisError} </>}
          {competitorsError && <>| Concurrents: {competitorsError} </>}
          {populationError && <>| Population: {populationError}</>}
        </div>
      )}

      <MapContainer
        center={[31.7917, -7.0926]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
        whenCreated={(map) => {
          const b = map.getBounds()
          setBBox({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() })
          setZoomLevel(map.getZoom())
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        <MapEvents />

        {/* ATMs */}
        {atms.map((atm) => {
          const performanceScore = Math.round(Math.min(100, (atm.monthly_volume / 1500) * 100))
          const safePerformance = Number.isFinite(performanceScore) ? performanceScore : 0

          return (
            <CircleMarker
              key={`atm-${atm.id}`}
              center={[atm.latitude, atm.longitude]}
              radius={Math.max(8, safePerformance / 10)}
              pathOptions={{
                fillColor: selectedATM?.id === atm.id ? "#fde047" : getPerformanceColor(safePerformance),
                color: selectedATM?.id === atm.id ? "#facc15" : "#ffffff",
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.8,
              }}
              eventHandlers={{
                click: () => onATMSelect?.(atm),
                mouseover: (e) => {
                  const map = (e as any).target._map
                  if (map && (e as any).originalEvent) {
                    const pt = map.mouseEventToContainerPoint((e as any).originalEvent)
                    const rect = map.getContainer().getBoundingClientRect()
                    setHoverPosition({ x: rect.left + pt.x + window.scrollX, y: rect.top + pt.y + window.scrollY })
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
                  ;(e as any).target.setStyle({ fillOpacity: 1, color: "#000000" })
                },
                mouseout: (e) => {
                  setHoveredATM(null)
                  ;(e as any).target.setStyle({
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

        {/* Concurrents */}
        {activeLayers.competitors &&
          !competitorsLoading &&
          competitors.map((p) => (
            <CircleMarker
              key={`comp-${p.id}`}
              center={[p.latitude, p.longitude]}
              radius={10}
              pathOptions={{
                fillColor: "#ef4444",
                color: "#ffffff",
                weight: 2,
                opacity: 0.7,
                fillOpacity: 0.7,
              }}
              eventHandlers={{
                mouseover: (e) => {
                  const map = (e as any).target._map
                  if (map && (e as any).originalEvent) {
                    const pt = map.mouseEventToContainerPoint((e as any).originalEvent)
                    const rect = map.getContainer().getBoundingClientRect()
                    setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y })
                    setHoveredATM({
                      id: p.id as any,
                      name: p.bank_name ?? "Inconnue",
                      type: "competitor",
                      latitude: p.latitude,
                      longitude: p.longitude,
                      bank_name: p.bank_name ?? "Inconnue",
                      monthly_volume: p.nb_atm,
                    })
                  }
                  ;(e as any).target.setStyle({ fillOpacity: 1, color: "#000000" })
                },
                mouseout: (e) => {
                  setHoveredATM(null)
                  ;(e as any).target.setStyle({ fillOpacity: 0.7, color: "#ffffff" })
                },
              }}
            >
              <Popup>
                <strong>{p.bank_name ?? "Inconnue"}</strong>
                <br />
                {p.commune ?? "-"} <br />
                ATMs : {p.nb_atm}
              </Popup>
            </CircleMarker>
          ))}

        {/* Population (auto par zoom) */}
        {activeLayers.population &&
          !populationLoading &&
          population.map((p) => {
            const getColor = (v: number) => {
              if (v > 0.8) return "#800026"
              if (v > 0.6) return "#BD0026"
              if (v > 0.4) return "#E31A1C"
              if (v > 0.2) return "#FD8D3C"
              return "#FED976"
            }
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
                    const map = (e as any).target._map
                    if (map && (e as any).originalEvent) {
                      const pt = map.mouseEventToContainerPoint((e as any).originalEvent)
                      const rect = map.getContainer().getBoundingClientRect()
                      setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y })
                      setHoveredATM({
                        id: p.id,
                        name: p.commune || p.commune_norm,
                        type: "population",
                        latitude: p.latitude,
                        longitude: p.longitude,
                        densite_norm: p.densite_norm,
                        densite: p.densite ?? null,
                      })
                    }
                    ;(e as any).target.setStyle({ fillOpacity: 1, color: "#000000" })
                  },
                  mouseout: (e) => {
                    setHoveredATM(null)
                    ;(e as any).target.setStyle({ fillOpacity: 0.7, color: "#ffffff" })
                  },
                }}
              >
                <Popup>
                  <strong>{p.commune || p.commune_norm}</strong>
                  <br />
                  Densité : {p.densite_norm.toFixed(3)}
                </Popup>
              </CircleMarker>
            )
          })}

        {/* POIs (auto par zoom) */}
        {activeLayers.pois &&
          !poisLoading &&
          pois.map((poi) => {
            const cat = (poi.value || poi.type || poi.key || "").toLowerCase()
            const color = getTypeColor(cat)
            return (
              <CircleMarker
                key={`poi-${poi.id}`}
                center={[poi.latitude, poi.longitude]}
                radius={8}
                pathOptions={{
                  fillColor: color,
                  color: "#ffffff",
                  weight: 1,
                  opacity: 0.8,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{
                  mouseover: (e) => {
                    const map = (e as any).target._map
                    if (map && (e as any).originalEvent) {
                      const pt = map.mouseEventToContainerPoint((e as any).originalEvent)
                      const rect = map.getContainer().getBoundingClientRect()
                      setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y })
                      setHoveredATM({
                        id: poi.id,
                        type: "poi",
                        name: poi.name ?? `${poi.value ?? poi.type ?? "POI"}`,
                        latitude: poi.latitude,
                        longitude: poi.longitude,
                        key: poi.key ?? null,
                        value: poi.value ?? null,
                        brand: poi.brand ?? null,
                        operator: poi.operator ?? null,
                        address: poi.address ?? null,
                        commune: poi.commune ?? null,
                        province: poi.province ?? null,
                        region: poi.region ?? null,
                      })
                    }
                    ;(e as any).target.setStyle({ fillOpacity: 1, color: "#000000" })
                  },
                  mouseout: (e) => {
                    setHoveredATM(null)
                    ;(e as any).target.setStyle({ fillOpacity: 0.85, color: "#ffffff" })
                  },
                }}
              >
                <Popup>
                  <strong>{poi.name || (poi.value ?? poi.type) || "POI"}</strong>
                  <br />
                  {poi.brand ? `${poi.brand} · ` : ""}
                  {(poi.value ?? poi.type ?? poi.key) || "-"}
                  <br />
                  {poi.commune || poi.region || poi.province || ""}
                </Popup>
              </CircleMarker>
            )
          })}
      </MapContainer>

      <MapLegend />
      <ATMHoverCard atm={hoveredATM} position={hoverPosition} visible={!!hoveredATM && !selectedATM} />
    </div>
  )
}
