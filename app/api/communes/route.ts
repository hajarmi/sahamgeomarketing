import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

async function loadLocalCommunes(): Promise<string> {
  const filePath = path.join(process.cwd(), "backend", "data", "communes.geojson")
  const file = await fs.readFile(filePath, "utf8")
  return file
}

export async function GET(req: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL
  const { search } = new URL(req.url)

  // 1️⃣ On essaie d’appeler le backend Tailscale (comme avant)
  if (backendUrl) {
    const target = `${backendUrl}/communes${search}`
    console.log("[api/communes] → calling backend:", target)

    try {
      const res = await fetch(target, {
        headers: { accept: "application/json" },
        cache: "no-store",
      })

      const text = await res.text()
      console.log("[api/communes] ← backend status:", res.status)

      if (res.ok) {
        // tout va bien, on renvoie ce que le backend renvoie
        return new NextResponse(text, {
          status: res.status,
          headers: {
            "content-type": res.headers.get("content-type") ?? "application/json",
          },
        })
      }

      console.warn("[api/communes] Backend error, falling back to local file:", res.status)
    } catch (e: any) {
      console.error("[api/communes] Network error, falling back to local file:", e)
    }
  } else {
    console.error("[api/communes] NEXT_PUBLIC_API_URL missing, using local file")
  }

  // 2️⃣ Fallback local (comme buildLocalDataset pour les ATMs)
  try {
    const geojson = await loadLocalCommunes()
    return new NextResponse(geojson, {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (e: any) {
    console.error("[api/communes] ERROR loading local communes file:", e)
    return NextResponse.json(
      {
        type: "server_error",
        message: e?.message ?? "Failed to load local communes file",
      },
      { status: 500 }
    )
  }
}
