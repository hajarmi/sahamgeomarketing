"use client"

import { GeoJSON, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import useCommunes, { CommuneFeature } from "@/hooks/use-communes"

type Props = {
  onPick: (payload: { name: string; code?: string | number; lat: number; lng: number }) => void
}

const baseStyle: L.PathOptions = {
  color: "#888888",
  weight: 1,
  opacity: 0.6,
  fillColor: "#3b82f6",
  fillOpacity: 0.12,
}

const hoverStyle: L.PathOptions = {
  weight: 2,
  color: "#ffffff",
  fillOpacity: 0.25,
}

export default function CommuneLayer({ onPick }: Props) {
  const map = useMap()
  const { data, loading } = useCommunes(true)


  if (loading || !data) return null

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const f = feature as CommuneFeature
    const p = f.properties || {}

    layer.on({
      mouseover: (e: any) => {
        const target = e.target as L.Path
        target.setStyle(hoverStyle)
        target.bringToFront()
      },
      mouseout: (e: any) => {
        const target = e.target as L.Path
        target.setStyle(baseStyle)
      },
      click: () => {
        const name = (p.commune_norm || p.commune || "").toString()
        const lat = Number(p.centroid_lat)
        const lng = Number(p.centroid_lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        onPick({ name, code: p.code, lat, lng })

        // centre un peu la carte sur la commune
        map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
      },
    })
    // Optionnel: petite info-bulle
    ;(layer as any).bindTooltip(p.commune_norm || p.commune || "", { sticky: true })
  }

  return (
    <GeoJSON
      key="communes"
      data={data as any}
      style={() => baseStyle}
      onEachFeature={onEachFeature}
    />
  )
}
