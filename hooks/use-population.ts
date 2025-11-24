"use client"

import { useEffect, useState, useCallback } from "react"
import type { PopulationPoint, PopulationListResponse } from "@/types"
import type { BBox } from "./use-pois"   // même type que pour les POIs

export function usePopulation(enabled: boolean, bbox?: BBox) {
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
        })

        // 👉 IMPORTANT : on appelle l’API interne Next, pas NEXT_PUBLIC_API_URL
        const res = await fetch(`/api/population?${params.toString()}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: PopulationListResponse = await res.json()
        if (aborted) return

        setData(json.population ?? [])
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Failed to fetch population")
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    run()

    return () => {
      aborted = true
      controller.abort()
    }
  }, [enabled, bbox?.s, bbox?.w, bbox?.n, bbox?.e])

  // 👉 On garde la même forme que avant pour ne pas casser leaflet-map-client.tsx
  return { data, loading, error, reset }
}
