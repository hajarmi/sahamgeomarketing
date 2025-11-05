import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

type RawATM = {
  id?: string
  idatm?: string
  latitude: number
  longitude: number
  monthly_volume: number
  city: string
  region: string
  bank_name: string
  status: string
  name?: string
  installation_type?: string
  services?: string[] | null
  branch_location?: string
}

type ATM = RawATM & {
  id: string
  name: string
  installation_type: "fixed" | "portable"
  services: string[]
  branch_location: string
}

const DEFAULT_SERVICES = ["retrait", "consultation"] as const
const INSTALLATION_TYPE_MAP = new Map<string, ATM["installation_type"]>([
  ["fixed", "fixed"],
  ["agency", "fixed"],
  ["branch", "fixed"],
  ["agence", "fixed"],
  ["portable", "portable"],
  ["mobile", "portable"],
  ["kiosk", "portable"],
  ["deployable", "portable"],
])

const normalizeInstallationType = (value?: string): ATM["installation_type"] => {
  if (!value) return "fixed"
  const normalized = value.trim().toLowerCase()
  return INSTALLATION_TYPE_MAP.get(normalized) ?? "fixed"
}

const normalizeServices = (value?: string[] | null): string[] => {
  if (!value || !Array.isArray(value)) return []
  const unique = new Map<string, string>()
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (!unique.has(lower)) {
      unique.set(lower, lower)
    }
  }
  return Array.from(unique.values())
}

const loadScrapedAtms = async (): Promise<RawATM[]> => {
  // Prefer the 'backend' directory (legacy-friendly).
  const dataPath = path.join(process.cwd(), "backend", "data.json")

  try {
    const fileContents = await fs.readFile(dataPath, "utf8")
    const parsed = JSON.parse(fileContents)
    if (Array.isArray(parsed)) {
      console.log(`[api/atms] Successfully loaded ${parsed.length} records from ${dataPath}`)
      return parsed as RawATM[]
    }
    console.warn(`[api/atms] Local data file is not an array: ${dataPath}`)
    return []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[api/atms] Failed to read or parse local data file at ${dataPath}:`, error)
    } else {
      console.warn(`[api/atms] No local data file found at ${dataPath}. Fallback will be empty.`)
    }
    return []
  }
}

const buildLocalDataset = async () => {
  const rawAtms = await loadScrapedAtms()

  const enrich = (atm: RawATM): ATM | null => {
    const atmId = atm.id || atm.idatm
    if (!atmId) return null

    const normalizedServices = normalizeServices(atm.services)

    return {
      ...atm,
      id: atmId,
      name: atm.name?.trim() || atmId,
      installation_type: normalizeInstallationType(atm.installation_type),
      services: normalizedServices.length ? normalizedServices : [...DEFAULT_SERVICES],
      branch_location: atm.branch_location?.trim() || `${atm.city} - ${atm.region}`,
    }
  }

  const dedupedAtms = new Map<string, ATM>()
  for (const atm of rawAtms.map(enrich).filter((a): a is ATM => a !== null)) {
    dedupedAtms.set(atm.id, atm)
  }

  const atms = Array.from(dedupedAtms.values()).map((atm) => {
    const normalizedServices = normalizeServices(atm.services)
    return {
      ...atm,
      name: atm.name?.trim() || atm.id,
      installation_type: normalizeInstallationType(atm.installation_type),
      services: normalizedServices.length ? normalizedServices : [...DEFAULT_SERVICES],
      branch_location: atm.branch_location?.trim() || `${atm.city} - ${atm.region}`,
    }
  })

  const totalCount = atms.length
  const citiesCovered = new Set(atms.map((a) => a.city)).size
  const regionsCovered = new Set(atms.map((a) => a.region)).size

  const bankStats = atms.reduce<Record<string, { bank: string; count: number; totalVolume: number }>>((acc, atm) => {
    const key = atm.bank_name || "Inconnu"
    if (!acc[key]) {
      acc[key] = { bank: key, count: 0, totalVolume: 0 }
    }
    acc[key].count += 1
    acc[key].totalVolume += atm.monthly_volume || 0
    return acc
  }, {})

  const marketLeaders = Object.values(bankStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((entry) => ({
      bank: entry.bank,
      atms: entry.count,
      market_share: totalCount ? `${((entry.count / totalCount) * 100).toFixed(1)}%` : "0.0%",
      avg_volume: entry.count ? Math.round(entry.totalVolume / entry.count) : 0,
    }))

  const countByService = (service: string) => {
    const target = service.toLowerCase()
    return atms.filter((atm) => atm.services.includes(target)).length
  }
  const countByInstallationType = (type: "fixed" | "portable") =>
    atms.filter((atm) => atm.installation_type === type).length

  const availableServices = Array.from(
    atms.reduce((acc, atm) => {
      for (const s of atm.services) acc.add(s)
      return acc
    }, new Set<string>()),
  ).sort()

  const bankingMarketData = {
    total_banks: Object.keys(bankStats).length,
    installation_types: {
      fixed: countByInstallationType("fixed"),
      portable: countByInstallationType("portable"),
    },
    market_leaders: marketLeaders,
    services_analysis: {
      basic_services: countByService("retrait"),
      deposit_enabled: countByService("depot"),
      currency_exchange: countByService("change"),
      transfer_enabled: countByService("virement"),
    },
    available_services: availableServices,
  }

  const performanceSummary = {
    high_performance: atms.filter((a) => a.monthly_volume > 1200).length,
    medium_performance: atms.filter((a) => a.monthly_volume >= 900 && a.monthly_volume <= 1200).length,
    low_performance: atms.filter((a) => a.monthly_volume < 900).length,
    maintenance_required: atms.filter((a) => a.status === "maintenance").length,
    portable_atms: countByInstallationType("portable"),
    fixed_atms: countByInstallationType("fixed"),
  }

  return {
    atms,
    total_count: totalCount,
    cities_covered: citiesCovered,
    regions_covered: regionsCovered,
    banking_market: bankingMarketData,
    performance_summary: performanceSummary,
    metadata: {
      source: "local",
      generated_at: new Date().toISOString(),
      missing_services: atms.filter((a) => a.services.length === 0).length,
      missing_installation_type: rawAtms.filter((a) => !a.installation_type).length,
      missing_branch_location: rawAtms.filter((a) => !a.branch_location).length,
    },
  }
}

/**
 * Proxy -> FastAPI (127.0.0.1:8000), avec fallback local si injoignable.
 * IMPORTANT : ce handler Next prend la priorité sur rewrites().
 */
export async function GET() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"

  try {
    const response = await fetch(`${backendUrl}/atms`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    console.warn(`[api/atms] Backend responded ${response.status}, fallback local dataset`)
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.warn(`[api/atms] Backend unreachable (${backendUrl}). Fallback local. ${msg}`)
  }

  const localData = await buildLocalDataset()
  return NextResponse.json({
    ...localData,
    metadata: {
      ...(localData.metadata ?? {}),
      source: "local-fallback",
      generated_at: new Date().toISOString(),
    },
  })
}
