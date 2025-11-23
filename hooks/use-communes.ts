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

    // 👉 On lit UNIQUEMENT l'URL depuis la variable d'environnement
    const base = process.env.NEXT_PUBLIC_API_URL as string

    if (!base) {
      console.error("[useCommunes] NEXT_PUBLIC_API_URL is NOT defined")
      setError("API non configurée")
      setLoading(false)
      return
    }

    fetch(`${base}/communes`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: CommuneListResponse | any) => {
        if (cancelled) return

        const communes: CommuneFeature[] = (json.communes || json.features || []).map(
          (f: any) => {
            const coords = f.geometry?.coordinates
            const [lng, lat] = Array.isArray(coords) ? coords : [0, 0]

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
          }
        )

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
