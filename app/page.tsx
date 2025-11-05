"use client"

import { useState, useCallback, useEffect, useReducer } from "react"
import type { KeyboardEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Target, BarChart3, Layers, Search, Brain, Calculator } from "lucide-react"
import LeafletMap from "@/components/mapbox-map"
import AnalysisPanel from "@/components/analysis-panel"
import ScoringDashboard from "@/components/scoring-dashboard"
import EnhancedLayerControls from "@/components/enhanced-layer-controls"
import LocationAnalyzer from "@/components/location-analyzer"
import ScenarioSimulator from "@/components/scenario-simulator"
import { ATM } from "@/types"

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState<{
    lng: number
    lat: number
    address?: string
  } | null>(null)
  const [activeLayers, setActiveLayers] = useState({
    population: true,
    competitors: true,
    pois: false,
    coverage: false,
  })
  const [simulationMode, setSimulationMode] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null)
  const [refreshKey, forceRefresh] = useReducer((v) => v + 1, 0)
  const [atms, setAtms] = useState<ATM[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, tab: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveTab(tab)
    }
  }

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
        setAtms([]) // Clear data on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchATMs()
  }, [refreshKey])

  useEffect(() => {
    const handleAddressSearchResult = (event: CustomEvent) => {
      console.log("[v0] Address search result received:", event.detail)
      setSelectedLocation(event.detail)
      // Switch to map tab to show the result on the map
      setActiveTab("map")
    }

    window.addEventListener("addressSearchResult", handleAddressSearchResult as EventListener)

    return () => {
      window.removeEventListener("addressSearchResult", handleAddressSearchResult as EventListener)
    }
  }, [])

  const handleLayerConfigChange = useCallback((layer: string, config: any) => {
    console.log(`[v0] Layer ${layer} config updated:`, config)
    // Here you would update the map visualization in real-time
  }, [])

  const handleATMSelect = useCallback((atm: ATM) => {
    console.log("[v0] ATM selected:", atm)
    setSelectedATM(atm)
    setActiveTab("map")
    // Center the map on the selected ATM
    if (atm.latitude && atm.longitude) {
      setSelectedLocation({
        lng: atm.longitude,
        lat: atm.latitude,
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">GeoMarketing Pro</h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    Optimisation intelligente des points de vente
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="flex items-center space-x-2 px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
                <span className="font-medium">IA Active</span>
              </Badge>

              <Button
                variant={simulationMode ? "default" : "outline"}
                size="sm"
                onClick={() => setSimulationMode(!simulationMode)}
                className="font-medium"
              >
                <Target className="w-4 h-4 mr-2" />
                {simulationMode ? "Mode Analyse" : "Mode Simulation"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl">
            <h2 className="text-5xl font-bold text-foreground mb-6 text-balance leading-tight">
              Solution de géomarketing avancée pour l'optimisation intelligente des réseaux de points de vente
            </h2>
            <p className="text-xl text-muted-foreground mb-12 text-pretty leading-relaxed">
              Analysez, simulez et optimisez l'emplacement de vos automates bancaires, magasins ou services. Calculs de
              potentiel, analyse de cannibalisation et recommandations explicables.
            </p>



            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card
                role="button"
                tabIndex={0}
                aria-label="Afficher le scoring IA"
                className="border-primary/20 card-hover cursor-pointer overflow-hidden transition-all hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => setActiveTab("scoring")}
                onKeyDown={(event) => handleCardKeyDown(event, "scoring")}
              >
                <div className="p-6 transition-transform duration-300 ease-in-out hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3 ">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Score de Potentiel</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Calcul automatique basé sur la densité, la concurrence et les flux
                  </p>
                </div>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                aria-label="Afficher les explications IA"
                className="border-accent/20 card-hover cursor-pointer overflow-hidden transition-all hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setActiveTab("reason-codes")}
                onKeyDown={(event) => handleCardKeyDown(event, "reason-codes")}
              >
                <div className="p-6 transition-transform duration-300 ease-in-out hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3 ">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground">Reason Codes</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Explications claires des recommandations IA
                  </p>
                </div>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                aria-label="Accéder à la simulation ROI"
                className="border-success/20 card-hover cursor-pointer overflow-hidden transition-all hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
                onClick={() => setActiveTab("roi-simulation")}
                onKeyDown={(event) => handleCardKeyDown(event, "roi-simulation")}
              >
                <div className="p-6 transition-transform duration-300 ease-in-out hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3 ">
                    <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-success" />
                    </div>
                    <h3 className="font-semibold text-foreground">Simulation ROI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Projections financières et période de retour
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6 h-12">
            <TabsTrigger value="map" className="flex items-center space-x-2 px-4">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Carte</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center space-x-2 px-4">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Analyse</span>
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center space-x-2 px-4">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Scoring</span>
            </TabsTrigger>
            <TabsTrigger value="layers" className="flex items-center space-x-2 px-4">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Couches</span>
            </TabsTrigger>
            <TabsTrigger value="reason-codes" className="flex items-center space-x-2 px-4">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Reason Codes</span>
            </TabsTrigger>
            <TabsTrigger value="roi-simulation" className="flex items-center space-x-2 px-4">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Simulation ROI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-[600px]">
              <div className="lg:col-span-1 flex flex-col max-h-full">
                <div className="flex-1 overflow-hidden">
                  <EnhancedLayerControls
                    activeLayers={activeLayers}
                    onLayerToggle={(layer, active) => setActiveLayers((prev) => ({ ...prev, [layer]: active }))}
                    mode="compact"
                    onLayerConfigChange={handleLayerConfigChange}
                    selectedATM={selectedATM}
                    onATMSelect={handleATMSelect}
                    refresh={refreshKey}
                    atms={atms}
                    loading={isLoading}
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <Card className="h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <MapPin className="w-5 h-5" />
                          <span>Carte Interactive - Maroc</span>
                        </CardTitle>
                        <CardDescription>
                          {simulationMode
                            ? "Cliquez sur la carte pour simuler un nouveau point de vente"
                            : "Explorez les données géospatiales et les points de vente existants"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={forceRefresh} aria-label="Refresh map data">
                          Actualiser les données
                        </Button>
                      </div>
                      <Badge
                        variant={simulationMode ? "default" : "secondary"}
                        aria-label={`Current mode: ${simulationMode ? "Simulation" : "Exploration"}`}
                      >
                        {simulationMode ? "Simulation" : "Exploration"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <LeafletMap
                      activeLayers={activeLayers}
                      simulationMode={simulationMode}
                      onLocationSelect={setSelectedLocation}
                      selectedATM={selectedATM}
                      onATMSelect={handleATMSelect}
                      atms={atms}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span>Vue Carte</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <LeafletMap
                      activeLayers={activeLayers}
                      simulationMode={simulationMode}
                      onLocationSelect={setSelectedLocation}
                      selectedATM={selectedATM}
                      onATMSelect={handleATMSelect}
                      atms={atms}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <AnalysisPanel
                  selectedLocation={selectedLocation}
                  simulationMode={simulationMode}
                  setSelectedLocation={setSelectedLocation}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Sélection d'Emplacement</span>
                    </CardTitle>
                    <CardDescription>Cliquez sur la carte pour analyser le potentiel d'un emplacement</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <LeafletMap
                      activeLayers={activeLayers}
                      simulationMode={true}
                      onLocationSelect={setSelectedLocation}
                      selectedATM={selectedATM}
                      onATMSelect={handleATMSelect}
                      atms={atms}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <ScoringDashboard selectedLocation={selectedLocation} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <EnhancedLayerControls
                  activeLayers={activeLayers}
                  onLayerToggle={(layer, active) => setActiveLayers((prev) => ({ ...prev, [layer]: active }))}
                  mode="detailed"
                  onLayerConfigChange={handleLayerConfigChange}
                  selectedATM={selectedATM}
                  refresh={refreshKey}
                  onATMSelect={handleATMSelect}
                  atms={atms}
                  loading={isLoading}
                />
              </div>
              <div className="lg:col-span-3">
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Layers className="w-5 h-5" />
                      <span>Visualisation des Couches</span>
                    </CardTitle>
                    <CardDescription>Configurez et visualisez les différentes couches de données</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <LeafletMap
                      activeLayers={activeLayers}
                      simulationMode={simulationMode}
                      onLocationSelect={setSelectedLocation}
                      selectedATM={selectedATM}
                      onATMSelect={handleATMSelect}
                      atms={atms}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reason-codes" className="space-y-6">
            <LocationAnalyzer />
          </TabsContent>

          <TabsContent value="roi-simulation" className="space-y-6">
            <ScenarioSimulator />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground">GeoMarketing Pro</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Solution de géomarketing avancée pour l'optimisation intelligente des réseaux de points de vente.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Données</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Densité démographique</p>
                <p>• Analyse concurrentielle</p>
                <p>• Points d'intérêt (POI)</p>
                <p>• Zones de chalandise</p>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GeoMarketing Pro - The FrontlineUnit - Tous droits réservés
            </div>
            <div className="text-sm text-muted-foreground">
              Developed by The Frontline Unit
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

