"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { MapPin, Target, Users, Activity } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import EnhancedLayerControls from "@/components/enhanced-layer-controls"
import { ATM } from "@/types"
import MapboxMap from "@/components/mapbox-map"

type ActiveLayers = {
  population: boolean
  competitors: boolean
  pois: boolean
  transport: boolean
}

const initialActiveLayers: ActiveLayers = {
  population: true,
  competitors: true,
  pois: false,
  transport: false,
}

export default function MapVisualization() {
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>(initialActiveLayers)
  const [simulationMode, setSimulationMode] = useState(false)
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number; address?: string } | null>(null)
  const [atms, setAtms] = useState<ATM[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const abort = new AbortController()

    const fetchATMs = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/atms", { signal: abort.signal })
        if (!response.ok) throw new Error(`Failed to fetch ATMs: ${response.status}`)
        const data = await response.json()
        setAtms(Array.isArray(data.atms) ? data.atms : [])
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          console.error("[map-visualization] Unable to load ATMs:", error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchATMs()

    return () => abort.abort()
  }, [])

  const handleLayerToggle = useCallback((layer: keyof ActiveLayers, enabled: boolean) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: enabled }))
  }, [])

  const handleLayerConfigChange = useCallback((layer: string, config: unknown) => {
    console.debug("[map-visualization] Layer config change", layer, config)
  }, [])

  const handleATMSelect = useCallback((atm: ATM) => {
    setSelectedATM(atm)
  }, [])

  const networkSummary = useMemo(() => {
    if (!atms.length) {
      return {
        total: 0,
        sahams: 0,
        competitors: 0,
        monthlyVolume: 0,
        averageVolume: 0,
      }
    }

    const sahams = atms.filter((atm) => atm.bank_name?.toLowerCase().includes("saham")).length
    const totalVolume = atms.reduce((acc, atm) => acc + (Number.isFinite(atm.monthly_volume) ? Number(atm.monthly_volume) : 0), 0)

    return {
      total: atms.length,
      sahams,
      competitors: atms.length - sahams,
      monthlyVolume: totalVolume,
      averageVolume: Math.round(totalVolume / atms.length),
    }
  }, [atms])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-80 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Target className="h-4 w-4" />
                <span>Mode Simulation</span>
              </CardTitle>
              <CardDescription>Activez le mode simulation pour tester de nouveaux emplacements.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Simulation IA</span>
              <Switch
                id="simulation-mode"
                checked={simulationMode}
                onCheckedChange={(checked) => setSimulationMode(checked)}
                aria-label="Basculer le mode simulation"
              />
            </CardContent>
          </Card>

          <EnhancedLayerControls
            activeLayers={activeLayers}
            onLayerToggle={handleLayerToggle}
            mode="detailed"
            onLayerConfigChange={handleLayerConfigChange}
            selectedATM={selectedATM}
            onATMSelect={handleATMSelect}
            atms={atms}
            loading={isLoading}
          />
        </div>

        <div className="flex-1">
          <Card className="h-[600px]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    <span>Carte Interactive - Maroc</span>
                  </CardTitle>
                  <CardDescription>
                    {simulationMode
                      ? "Cliquez sur la carte pour simuler un nouvel emplacement."
                      : "Explorez le réseau existant et les zones d’opportunité."}
                  </CardDescription>
                </div>
                <Badge variant={simulationMode ? "default" : "secondary"}>
                  {simulationMode ? "Simulation" : "Exploration"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-88px)] p-0">
              <MapboxMap
                activeLayers={activeLayers}
                simulationMode={simulationMode}
                onLocationSelect={setSelectedLocation}
                atms={atms}
                selectedATM={selectedATM}
                onATMSelect={handleATMSelect}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Users className="h-4 w-4" />
              <span>ATM sélectionné</span>
            </CardTitle>
            <CardDescription>
              {selectedATM
                ? "Détails de l’ATM sélectionné sur la carte."
                : "Sélectionnez un ATM sur la carte pour afficher ses détails."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedATM ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Identifiant</span>
                  <span className="font-medium text-foreground">{selectedATM.id}</span>
                </div>
                {selectedATM.bank_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Banque</span>
                    <span className="font-medium text-foreground">{selectedATM.bank_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volume mensuel</span>
                  <span className="font-medium text-foreground">
                    {selectedATM.monthly_volume?.toLocaleString("fr-MA") ?? "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Coordonnées</span>
                  <span className="font-medium text-foreground">
                    {selectedATM.latitude.toFixed(4)}, {selectedATM.longitude.toFixed(4)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun ATM sélectionné pour le moment.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Activity className="h-4 w-4" />
              <span>Vue réseau</span>
            </CardTitle>
            <CardDescription>Indicateurs synthétiques du réseau actuel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total ATMs</span>
              <span className="font-medium text-foreground">{networkSummary.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Saham Bank</span>
              <span className="font-medium text-foreground">{networkSummary.sahams}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Concurrents</span>
              <span className="font-medium text-foreground">{networkSummary.competitors}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Volume mensuel agrégé</span>
              <span className="font-medium text-foreground">
                {networkSummary.monthlyVolume.toLocaleString("fr-MA")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Volume moyen</span>
              <span className="font-medium text-foreground">
                {networkSummary.averageVolume.toLocaleString("fr-MA")}
              </span>
            </div>
            {selectedLocation && (
              <div className="mt-4 rounded-lg border p-3">
                <p className="text-xs uppercase text-muted-foreground">Dernier point simulé</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
                {selectedLocation.address && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedLocation.address}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedATM(null)}
          disabled={!selectedATM && !selectedLocation}
        >
          Réinitialiser la sélection
        </Button>
      </div>
    </div>
  )
}
