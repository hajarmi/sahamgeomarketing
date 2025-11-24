"use client"

import { useEffect, useState } from "react"

export type CommuneFeature = {
  name: string
  code?: string | number
  lat: number
  lng: number
  properties?: any
}

type CommuneListResponse = {
  communes: CommuneFeature[]
}

export default function useCommunes(enabled: boolean = true) {
  const [data, setData] = useState<CommuneFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // ❗ ICI : comme pour les POIs, on appelle UNIQUEMENT l'API Next interne
    // Pas de NEXT_PUBLIC_API_URL côté client
    fetch("/api/communes", {
      headers: { accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: CommuneListResponse | any) => {
        if (cancelled) return

        const raw = json.communes || json.features || []

        const communes: CommuneFeature[] = raw.map((f: any) => {
          const coords = f.geometry?.coordinates
          let lng = 0
          let lat = 0

          // Cas Point [lng, lat]
          if (Array.isArray(coords)) {
            ;[lng, lat] = coords
          }
          // Cas Polygon/MultiPolygon -> on prend le premier point
          else if (
            Array.isArray(coords?.[0]) &&
            Array.isArray(coords[0][0])
          ) {
            ;[lng, lat] = coords[0][0]
          }

          const name =
            f.properties?.commune_norm ||
            f.properties?.nom ||
            f.properties?.nom_commune ||
            "Commune inconnue"

          const code =
            f.properties?.code_commune ||
            f.properties?.code ||
            f.properties?.id

          return {
            name,
            code,
            lat,
            lng,
            properties: f.properties,
          }
        })

        setData(communes)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { data, loading, error }
}
