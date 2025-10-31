"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Target } from "lucide-react"
import Dashboard from "@/components/dashboard"
import LeafletMap from "@/components/mapbox-map"
import EnhancedLayerControls from "@/components/enhanced-layer-controls"
import { ATM } from "@/types"

import { FeatureList } from "@/components/feature-list"
import { TabsExample } from "@/components/ui/tabs-example"

export default function DashboardPage() {
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null)
  const [activeLayers, setActiveLayers] = useState({
    population: true,
    competitors: true,
    pois: false,
    coverage: false,
  })
  const [simulationMode, setSimulationMode] = useState(false)
  const [atms, setAtms] = useState<ATM[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleATMSelect = useCallback((atm: ATM) => {
    console.log("[v0] ATM selected:", atm)
    setSelectedATM(atm)
  }, [])

  useEffect(() => {
    const fetchATMs = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/atms")
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        setAtms(data.atms)
      } catch (error) {
        console.error("Error fetching ATMs:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchATMs()
  }, [])

  const handleLayerConfigChange = useCallback((layer: string, config: any) => {
    console.log(`[v0] Layer ${layer} config updated:`, config)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Tableau de Bord ATM</h1>
                  <p className="text-sm text-muted-foreground font-medium">Analyse et gestion du réseau d'automates</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="flex items-center space-x-2 px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
                <span className="font-medium">Données en temps réel</span>
              </Badge>

              <Button
                variant={simulationMode ? "default" : "outline"}
                size="sm"
                onClick={() => setSimulationMode(!simulationMode)}
                className="font-medium"
                aria-label={simulationMode ? "Switch to Analysis Mode" : "Switch to Simulation Mode"}
              >
                <Target className="w-4 h-4 mr-2" />
                {simulationMode ? "Mode Analyse" : "Mode Simulation"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Dashboard Analytics */}
          <Dashboard />

          {/* Map and Controls Section */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-3/4">
              <Card className="h-[600px]">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5" />
                        <span>Réseau ATM - Vue Géographique</span>
                      </CardTitle>
                      <CardDescription>
                        {selectedATM
                          ? `ATM sélectionné: ${selectedATM.id}`
                          : "Cliquez sur un ATM pour voir ses détails"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedATM && (
                        <Badge variant="outline" className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span>{selectedATM.id}</span>
                        </Badge>
                      )}
                      <Badge
                        variant={simulationMode ? "default" : "secondary"}
                        aria-label={`Current mode: ${simulationMode ? "Simulation" : "Exploration"}`}
                      >
                        {simulationMode ? "Simulation" : "Exploration"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-80px)]">
                  <LeafletMap
                    activeLayers={activeLayers}
                    simulationMode={simulationMode}
                    onLocationSelect={(location) => console.log("[v0] Location selected:", location)}
                    onATMSelect={handleATMSelect}
                    atms={atms}
                    selectedATM={selectedATM}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="lg:w-1/4 space-y-6">
              <EnhancedLayerControls
                activeLayers={activeLayers}
                onLayerToggle={(layer, active) => setActiveLayers((prev) => ({ ...prev, [layer]: active }))}
                mode="detailed"
                onLayerConfigChange={handleLayerConfigChange}
                atms={atms}
                loading={isLoading}
                selectedATM={selectedATM}
                onATMSelect={handleATMSelect}
              />
            </div>
          </div>
          <TabsExample />
          <FeatureList />
        </div>
      </main>
    </div>
  )
}
