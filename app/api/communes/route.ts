import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL

  // 1️⃣ Vérification de config
  if (!backendUrl) {
    console.error("[api/communes] ❌ NEXT_PUBLIC_API_URL is NOT defined")
    return NextResponse.json(
      {
        type: "config_error",
        message: "NEXT_PUBLIC_API_URL is not defined on server",
      },
      { status: 500 }
    )
  }

  const { search } = new URL(req.url)

  // 👉 ton backend doit avoir /communes
  const target = `${backendUrl}/communes${search}`

  console.log("[api/communes] → calling backend:", target)

  try {
    const res = await fetch(target, {
      headers: { accept: "application/json" },
      cache: "no-store",
    })

    const text = await res.text()
    console.log("[api/communes] ← backend status:", res.status)

    // 2️⃣ Le backend répond mais avec erreur
    if (!res.ok) {
      console.warn("[api/communes] Backend error body:", text)
      return NextResponse.json(
        {
          type: "backend_error",
          backend_status: res.status,
          backend_body: safeJson(text),
        },
        { status: res.status }
      )
    }

    // 3️⃣ Tout est OK → on renvoie la réponse brute
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    })
  } catch (e: any) {
    // 4️⃣ Le backend est injoignable (Tailscale / DNS…)
    console.error("[api/communes] ❌ Network error:", e)

    return NextResponse.json(
      {
        type: "network_error",
        message: e?.message ?? "Unknown network error",
        name: e?.name ?? "Error",
      },
      { status: 502 }
    )
  }
}

// util safe JSON
function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
