// hooks/use-population.ts
"use client"

import { useEffect, useState, useCallback } from "react"
import type { PopulationPoint, PopulationListResponse } from "@/types"
import type { BBox } from "./use-pois"

function limitForZoom(z: number | undefined) {
  if (!z) return 20
  if (z >= 13) return 1200
  if (z >= 11) return 600
  if (z >= 9)  return 300
  if (z >= 7)  return 120
  return 20
}

export function usePopulation(enabled: boolean, bbox?: BBox, zoomLevel?: number) {
  const [data, setData] = useState<PopulationPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setData([])
    setError(null)
  }, [])

  useEffect(() => {
    if (!enabled || !bbox) {
      setData([])
      setError(null)
      return
    }
    setData([])
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
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
        const url = new URL(`${base}/population`)
        url.searchParams.set("s", String(bbox.s))
        url.searchParams.set("w", String(bbox.w))
        url.searchParams.set("n", String(bbox.n))
        url.searchParams.set("e", String(bbox.e))
        url.searchParams.set("limit", String(limitForZoom(zoomLevel)))

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { accept: "application/json" },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: PopulationListResponse = await res.json()
        if (aborted) return

        setData(json?.population ?? [])
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Erreur chargement Population")
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

  return { data, loading, error, reset }
}
