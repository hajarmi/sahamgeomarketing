// components/leaflet-map-client.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
  GeoJSON,
} from "react-leaflet"
import type { GeoJSON as GeoJSONType } from "geojson"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { usePOIs, type BBox } from "@/hooks/use-pois"
import { useCompetitors } from "@/hooks/use-competitors"
import { usePopulation } from "@/hooks/use-population"
import { useTransport } from "@/hooks/use-transport"
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
  isScoring?: boolean // true = carte de scoring (communes uniquement)
}

export default function LeafletMapClient({
  activeLayers,
  simulationMode,
  onLocationSelect,
  atms,
  selectedATM,
  onATMSelect,
  isScoring = false,
}: LeafletMapClientProps) {
  const [simulationPoint, setSimulationPoint] = useState<{ lng: number; lat: number } | null>(null)
  const [hoveredATM, setHoveredATM] = useState<HoverData | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  // BBOX & ZOOM depuis la carte
  const [bbox, setBBox] = useState<BBox>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(6)

  // --- Communes GeoJSON ---
  const [communes, setCommunes] = useState<GeoJSONType | null>(null)
  const [loadingCommunes, setLoadingCommunes] = useState(false)
  const [communesError, setCommunesError] = useState<string | null>(null)

  const showCommunes = activeLayers?.communes ?? true

  useEffect(() => {
    if (!showCommunes) return
    let abort = false
    const run = async () => {
      try {
        setLoadingCommunes(true)
        setCommunesError(null)
        const res = await fetch("/api/communes/geojson", { cache: "force-cache" })
        if (!res.ok) throw new Error(await res.text())
        const gj = (await res.json()) as GeoJSONType
        if (!abort) setCommunes(gj)
      } catch (e: any) {
        if (!abort) setCommunesError(e?.message ?? "Erreur chargement communes")
      } finally {
        if (!abort) setLoadingCommunes(false)
      }
    }
    run()
    return () => {
      abort = true
    }
  }, [showCommunes])

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

  const {
    data: transports,
    loading: transportLoading,
    error: transportError,
    reset: resetTransport,
  } = useTransport(!!activeLayers.transport, bbox, zoomLevel)

  // reset quand on coupe les couches
  useEffect(() => {
    if (!activeLayers.pois) resetPois()
    if (!activeLayers.population) resetPopulation()
    if (!activeLayers.transport) resetTransport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.pois, activeLayers.population, activeLayers.transport])

  const getTransportColor = (mode?: string | null) => {
    const m = (mode || "").toLowerCase()
    if (m.includes("train") || m.includes("rail")) return "#3b82f6" // bleu
    if (m.includes("tram")) return "#a855f7" // violet
    if (m.includes("bus")) return "#f97316" // orange
    if (m.includes("taxi")) return "#22c55e" // vert
    return "#e5e7eb" // gris
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

  // --- Styles communes ---
  const communeStyle = useMemo((): L.PathOptions => {
    return {
      color: "#ffffff",
      weight: 1,
      opacity: 0.5,
      fillColor: "#ffffff",
      fillOpacity: 0.05,
    }
  }, [])

  const communeHighlightStyle: L.PathOptions = {
    color: "#22c55e",
    weight: 2,
    opacity: 0.9,
    fillColor: "#22c55e",
    fillOpacity: 0.12,
  }

  const onEachCommune = (feature: any, layer: L.Layer) => {
    const l = layer as L.Path
    const p = feature?.properties ?? {}

    const name =
      p.commune_name ??
      p.commune ??
      p.nom ??
      p.NOM ??
      p.name ??
      p.city_name ??
      p.commune_norm ??
      p.COMMUNE ??
      p.code ??
      "?"

    // CAS 1 : carte "normale" (onglet Carte) => pas de tooltip
    if (!isScoring) {
      // clic sur commune => sélectionner centre pour scoring si besoin
      layer.on("click", (e: any) => {
        L.DomEvent.stop(e)
        const center = (layer as any).getBounds().getCenter()
        handleLocationSelect({ lat: center.lat, lng: center.lng })
      })

      // empêcher le drag de démarrer sur le polygone
      layer.on("mousedown", (e: any) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
      })

      return
    }

    // CAS 2 : carte de scoring => tooltip + highlight
    ;(layer as any).bindTooltip(String(name), {
      permanent: false,
      direction: "center",
      className: "commune-tooltip",
      opacity: 0.95,
      sticky: false,
      interactive: false,
    })

    const openHover = () => {
      ;(layer as any).openTooltip()
      l.setStyle(communeHighlightStyle)
    }

    const closeHover = () => {
      ;(layer as any).closeTooltip()
      l.setStyle({
        color: "#ffffff",
        weight: 1,
        opacity: 0.5,
        fillColor: "#ffffff",
        fillOpacity: 0.05,
      } as L.PathOptions)
    }

    layer.on("mouseover", openHover)
    layer.on("mouseout", closeHover)

    layer.on("add", () => {
      const map = (layer as any)._map as L.Map | undefined
      if (!map) return
      map.on("movestart zoomstart", closeHover)
      layer.on("remove", () => {
        map.off("movestart zoomstart", closeHover)
        closeHover()
      })
    })

    layer.on("mousedown", (e: any) => {
      L.DomEvent.stopPropagation(e)
      L.DomEvent.preventDefault(e)
    })

    layer.on("click", (e: any) => {
      L.DomEvent.stop(e)
      const center = (layer as any).getBounds().getCenter()
      handleLocationSelect({ lat: center.lat, lng: center.lng })
    })
  }

  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden relative"
      style={{ minHeight: "500px" }}
    >
      {(poisError ||
        competitorsError ||
        populationError ||
        communesError ||
        transportError) && (
        <div className="absolute z-[5000] top-2 left-2 bg-white/90 text-red-600 px-2 py-1 rounded shadow">
          {communesError && <>Communes: {communesError} </>}
          {poisError && <>| POI: {poisError} </>}
          {competitorsError && <>| Concurrents: {competitorsError} </>}
          {populationError && <>| Population: {populationError}</>}
          {transportError && <>| Transport: {transportError}</>}
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

        {/* === Communes (polygones) === */}
        {showCommunes && communes && (
          <GeoJSON
            key="communes"
            data={communes}
            style={() => communeStyle}
            onEachFeature={onEachCommune}
          />
        )}

        {/* ATMs – uniquement sur la carte principale */}
        {!isScoring &&
          activeLayers.atms &&
          atms.map((atm) => {
            const performanceScore = Math.round(
              Math.min(100, (atm.monthly_volume / 1500) * 100)
            )
            const safePerformance = Number.isFinite(performanceScore) ? performanceScore : 0

            return (
              <CircleMarker
                key={`atm-${atm.id}`}
                center={[atm.latitude, atm.longitude]}
                radius={Math.max(8, safePerformance / 10)}
                pathOptions={{
                  fillColor:
                    selectedATM?.id === atm.id
                      ? "#fde047"
                      : getPerformanceColor(safePerformance),
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
        {!isScoring &&
          activeLayers.competitors &&
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

        {/* Population (points) */}
        {!isScoring &&
          activeLayers.population &&
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

        {/* POIs */}
        {!isScoring &&
          activeLayers.pois &&
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

      {/* Transport */}
{!isScoring &&
  activeLayers.transport &&
  !transportLoading &&
  transports.map((t) => (
    <CircleMarker
      key={`transport-${t.id}`}
      center={[t.latitude, t.longitude]}
      radius={8}
      pathOptions={{
        fillColor: getTransportColor(t.transport_mode),
        color: "#ffffff",
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.9,
      }}
      eventHandlers={{
        mouseover: (e) => {
          const map = (e as any).target._map
          if (map && (e as any).originalEvent) {
            const pt = map.mouseEventToContainerPoint((e as any).originalEvent)
            const rect = map.getContainer().getBoundingClientRect()
            setHoverPosition({ x: rect.left + pt.x, y: rect.top + pt.y })
            setHoveredATM({
              id: t.id,
              type: "transport",
              name: t.name ?? "Point de transport",
              latitude: t.latitude,
              longitude: t.longitude,
              transport_mode: t.transport_mode ?? "-",
              // ❌ on n’envoie plus operator/network/etc. au hover
            })
          }
          ;(e as any).target.setStyle({ fillOpacity: 1, color: "#000000" })
        },
        mouseout: (e) => {
          setHoveredATM(null)
          ;(e as any).target.setStyle({ fillOpacity: 0.9, color: "#ffffff" })
        },
      }}
    >
      {/* ✅ Popup minimal : uniquement name + transport_mode */}
      <Popup>
        <strong>{t.name || "Point de transport"}</strong>
        <br />
        {t.transport_mode || "-"}
      </Popup>
    </CircleMarker>
))} 


      </MapContainer>

      {/* Légende + hover uniquement pour la carte principale */}
      {!isScoring && <MapLegend />}
      {!isScoring && (
        <ATMHoverCard
          atm={hoveredATM}
          position={hoverPosition}
          visible={!!hoveredATM && !selectedATM}
        />
      )}
    </div>
  )
}
