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

/**
 * Charge les points de transport (train/tram/bus/taxi) dans la BBOX courante.
 * Appelle l’API Next `/api/transport`, qui elle-même proxie vers FastAPI `/transport`.
 */
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

    // annule la requête précédente si on rebouge
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = `/api/transport?s=${bbox.s}&n=${bbox.n}&w=${bbox.w}&e=${bbox.e}&limit=${limit}&page=1`
        const res = await fetch(url, { signal: ac.signal })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `HTTP ${res.status}`)
        }
        const json: TransportListResponse = await res.json()
        setData(json.transports || [])
      } catch (e: any) {
        if (e?.name === "AbortError") return
        setError(e?.message ?? "Erreur chargement transport")
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => ac.abort()
  }, [enabled, bbox?.s, bbox?.n, bbox?.w, bbox?.e, limit])

  return { data, loading, error, reset }
}
