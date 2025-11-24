"use client"

import { useEffect, useState } from "react"
import type { PopulationPoint, PopulationListResponse } from "@/types"
import type { BBox } from "./use-pois"   // même type que pour les POIs

export function usePopulation(enabled: boolean, bbox?: BBox) {
  const [data, setData] = useState<PopulationPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        // 👉 IMPORTANT : on appelle UNIQUEMENT l’API interne Next
        // pas de NEXT_PUBLIC_API_URL ici
        const res = await fetch(`/api/population?${params.toString()}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: PopulationListResponse = await res.json()
        if (aborted) return

        setData(json.population ?? [])
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Failed to fetch")
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

  return { population: data, loading, error }
}
