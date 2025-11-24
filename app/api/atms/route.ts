import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL

  // 1️⃣ Si la variable d'environnement est absente → erreur directe
  if (!backendUrl) {
    console.error("[api/atms] ❌ NEXT_PUBLIC_API_URL is NOT defined")
    return NextResponse.json(
      {
        type: "config_error",
        message: "Backend URL not configured (NEXT_PUBLIC_API_URL missing)",
      },
      { status: 500 }
    )
  }

  const target = `${backendUrl}/atms`

  console.log("[api/atms] → Calling backend:", target)

  try {
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    })

    const text = await response.text()

    console.log("[api/atms] ← Backend status:", response.status)

    // 2️⃣ Si le backend répond mais renvoie une erreur
    if (!response.ok) {
      console.error("[api/atms] Backend error:", text)

      return NextResponse.json(
        {
          type: "backend_error",
          backend_status: response.status,
          backend_body: text,
        },
        { status: response.status }
      )
    }

    // 3️⃣ Backend OK → on renvoie ses données directement
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": "application/json",
      },
    })

  } catch (error: any) {
    console.error("[api/atms] ❌ Backend unreachable:", error)

    // 4️⃣ Si backend mort → erreur explicite (pas de fallback)
    return NextResponse.json(
      {
        type: "network_error",
        message: "Backend unreachable. Tailscale or backend is offline.",
        details: error?.message,
      },
      { status: 502 }
    )
  }
}
