"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { BBox, TransportListResponse, TransportPoint } from "@/types"

function limitForZoom(z?: number) {
  if (!z) return 300
  if (z >= 12) return 1200
  if (z >= 10) return 800
  if (z >= 8) return 500
  return 300
}

export function useTransport(
  enabled: boolean,
  bbox: BBox,
  zoom?: number
) {
  const [data, setData] = useState<TransportPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const limit = useMemo(() => limitForZoom(zoom), [zoom])

  const reset = () => {
    abortRef.current?.abort()
    setData([])
    setError(null)
    setLoading(false)
  }

  useEffect(() => {
    if (!enabled || !bbox) return

    abortRef.current?.abort()

    const ac = new AbortController()
    abortRef.current = ac

    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          s: String(bbox.s),
          n: String(bbox.n),
          w: String(bbox.w),
          e: String(bbox.e),
          limit: String(limit),
          page: "1",
        })

        const res = await fetch(`/api/transport?${params.toString()}`, {
          signal: ac.signal,
          headers: { accept: "application/json" },
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: TransportListResponse = await res.json()
        setData(json.transports || [])

      } catch (e: any) {
        if (e?.name === "AbortError") return
        setError(e?.message ?? "Erreur transport")
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => ac.abort()
  }, [enabled, bbox?.s, bbox?.n, bbox?.w, bbox?.e, limit])

  return { data, loading, error, reset }
}
