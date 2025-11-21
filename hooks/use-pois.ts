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

// retire le slash de fin si présent
function trimSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s
}

// base API: .env (tunnel) ou localhost (dev)
function getApiBase() {
  // Tunnel: NEXT_PUBLIC_API_URL = "https://...ts.net/api"
  // Local dev: fallback sans /api
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  return trimSlash(fromEnv || "http://127.0.0.1:8000")
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
        const base = getApiBase() // ← unifie /api vs pas /api
        const url = new URL(`${base}/pois`)
        url.searchParams.set("s", String(bbox!.s))
        url.searchParams.set("w", String(bbox!.w))
        url.searchParams.set("n", String(bbox!.n))
        url.searchParams.set("e", String(bbox!.e))
        url.searchParams.set("limit", String(limitForZoom(zoomLevel)))

        const res = await fetch(url.toString(), {
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
