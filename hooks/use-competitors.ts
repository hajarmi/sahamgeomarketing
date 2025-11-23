"use client"

import { useEffect, useState } from "react"
import type { Competitor, CompetitorListResponse } from "@/types"

export function useCompetitors(enabled: boolean) {
  const [data, setData] = useState<Competitor[]>([])
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

    // ✅ On utilise uniquement la variable d'environnement
    const base = process.env.NEXT_PUBLIC_API_URL as string

    if (!base) {
      console.error("[useCompetitors] NEXT_PUBLIC_API_URL is NOT defined")
      setError("API non configurée")
      setLoading(false)
      return
    }

    fetch(`${base}/competitors`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json: CompetitorListResponse) => {
        if (!cancelled) setData(json.competitors || [])
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
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
