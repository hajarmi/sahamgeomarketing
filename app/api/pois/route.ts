import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL

  // 1) Erreur de configuration : variable d'env manquante
  if (!backendUrl) {
    console.error("[api/pois] ❌ NEXT_PUBLIC_API_URL is NOT defined")
    return NextResponse.json(
      {
        type: "config_error",
        message: "NEXT_PUBLIC_API_URL is not defined on server",
      },
      { status: 500 }
    )
  }

  const { search } = new URL(req.url)         // ?s=&w=&n=&e=&limit=
  const target = `${backendUrl}/pois${search}`

  console.log("[api/pois] → calling backend:", target)

  try {
    const res = await fetch(target, {
      headers: { accept: "application/json" },
      cache: "no-store",
    })

    const text = await res.text()
    console.log("[api/pois] ← backend status:", res.status)

    // 2) Le backend a répondu, mais avec une erreur (404, 422, 500…)
    if (!res.ok) {
      console.warn("[api/pois] Backend error body:", text)
      return NextResponse.json(
        {
          type: "backend_error",
          backend_status: res.status,
          backend_body: safeJson(text),
        },
        { status: res.status } // 👉 on renvoie le VRAI code du backend
      )
    }

    // 3) Tout va bien : on renvoie ce que le backend a renvoyé
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") ?? "application/json",
      },
    })
  } catch (e: any) {
    // 4) Erreur réseau (DNS, timeout, tunnel down…)
    console.error("[api/pois] ❌ Network error when calling backend:", e)

    return NextResponse.json(
      {
        type: "network_error",
        message: e?.message ?? "Unknown network error",
        name: e?.name ?? "Error",
      },
      { status: 502 } // 502 = Bad Gateway → backend injoignable
    )
  }
}

/**
 * Essaie de parser la réponse texte en JSON, sinon renvoie le texte brut.
 */
function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}