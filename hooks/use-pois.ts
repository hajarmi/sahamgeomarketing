// hooks/use-pois.ts
"use client"

import { useEffect, useState, useCallback } from "react"
import type { POI, POIListResponse } from "@/types"

export type BBox = { s: number; w: number; n: number; e: number } | null

function limitForZoom(z?: number) {
  if (!z) return 20
  if (z >= 13) return 1500
  if (z >= 11) return 800
  if (z >= 9)  return 400
  if (z >= 7)  return 150
  return 20
}

export function usePOIs(enabled: boolean, bbox?: BBox, zoomLevel?: number) {
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setPois([])
    setError(null)
  }, [])

  // reset visuel quand bbox/zoom/enabled changent
  useEffect(() => {
    if (!enabled || !bbox) {
      setPois([])
      setError(null)
      return
    }
    setPois([])
    setError(null)
  }, [enabled, bbox?.s, bbox?.w, bbox?.n, bbox?.e, zoomLevel])

  useEffect(() => {
    if (!enabled || !bbox) return
    let aborted = false
    const controller = new AbortController()

    async function run() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          s: String(bbox!.s),
          w: String(bbox!.w),
          n: String(bbox!.n),
          e: String(bbox!.e),
          limit: String(limitForZoom(zoomLevel)),
        })

        // ❗ ICI : on appelle UNIQUEMENT l'API Next interne
        const res = await fetch(`/api/pois?${params.toString()}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: POIListResponse = await res.json()
        if (aborted) return
        setPois(json?.pois ?? [])
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Erreur chargement POI")
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    run()
    return () => {
      aborted = true
      controller.abort()
    }
  }, [enabled, bbox?.s, bbox?.w, bbox?.n, bbox?.e, zoomLevel])

  return { pois, loading, error, reset }
}
