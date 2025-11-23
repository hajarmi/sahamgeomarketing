import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL

  if (!backendUrl) {
    console.error("[api/pois] NEXT_PUBLIC_API_URL is NOT defined")
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    )
  }

  const { search } = new URL(req.url) // garde ?s=&w=&n=&e=&limit=

  try {
    const res = await fetch(`${backendUrl}/pois${search}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      const txt = await res.text()
      console.warn("[api/pois] Backend error", res.status, txt)
      return NextResponse.json(
        { error: "Backend error", status: res.status },
        { status: 500 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    console.error("[api/pois] Backend unreachable:", e)
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 500 }
    )
  }
}
