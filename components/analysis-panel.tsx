"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  Car,
  Target,
  BarChart3,
  Calculator,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts"

interface AnalysisPanelProps {
  selectedLocation: {
    lng: number
    lat: number
    address?: string
  } | null
  simulationMode: boolean
  setSelectedLocation: (location: any) => void
}

export default function AnalysisPanel({ selectedLocation, simulationMode, setSelectedLocation }: AnalysisPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ======= NOUVELLE LOGIQUE: charger les vraies données =======
  useEffect(() => {
    const run = async () => {
      if (!selectedLocation || !simulationMode) return
      setLoading(true)
      try {
        const url = `/api/communes/indicators?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()

        const ind = data.indicators || {}

        const radarData = [
          { subject: "Population",     A: ((ind.densite_norm ?? 0) * 100), fullMark: 100 },
          { subject: "Revenus",        A: ((ind.INIV ?? 0) * 100),         fullMark: 100 },
          { subject: "Accessibilité",  A: ((ind.Indice_acces ?? ind.indice_acces ?? 0) * 100), fullMark: 100 },
          { subject: "Concurrence",    A: ((1 / (1 + (ind.nb_atm ?? 0))) * 100),               fullMark: 100 },
          { subject: "Transport",      A: ((ind.Indice_trans ?? ind.indice_trans ?? 0) * 100), fullMark: 100 },
          { subject: "Éducation",      A: ((ind.IEDU ?? 0) * 100),                              fullMark: 100 },
        ]

        setAnalysis({
          potentialScore: Math.round(data.score ?? 0),
          coordinates: selectedLocation,
          demographics: {
            population500m: ind.densite ? Math.round(ind.densite) : 0,
            population1km: 0,
            averageIncome: Math.round((ind.INIV ?? 0) * 100000), // visuel
            ageGroup: `Jeunesse ${(ind.taux_jeuness ?? 0).toFixed(2)} · Vieillissement ${(ind.taux_vieilless ?? 0).toFixed(2)}`,
          },
          competition: {
            competitors500m: ind.nb_atm ?? 0,
            competitors1km: undefined,
            marketShare: undefined,
          },
          accessibility: {
            footTraffic: undefined,
            vehicleTraffic: undefined,
            publicTransport:
              (ind.Indice_trans ?? ind.indice_trans ?? 0) > 0.6
                ? "Excellent"
                : (ind.Indice_trans ?? ind.indice_trans ?? 0) > 0.35
                ? "Bon"
                : "Faible",
            parking: (ind.Indice_acces ?? ind.indice_acces ?? 0) > 0.5 ? "Disponible" : "Limité",
          },
          radarData,
          reasonCodes: [
            { type: "positive", text: `Densité ${(ind.densite_norm ?? 0).toFixed(2)}`, icon: Users,    weight: 20, impact: "Élevé" },
            { type: "negative", text: `Concurrents nb_atm = ${ind.nb_atm ?? 0}`,       icon: Building, weight: 15, impact: "Moyen" },
            { type: "positive", text: `Accessibilité ${(ind.Indice_acces ?? ind.indice_acces ?? 0).toFixed(2)}`,
              icon: Car, weight: 20, impact: "Élevé" },
            { type: "positive", text: `Éducation (IEDU) ${(ind.IEDU ?? 0).toFixed(2)}`, icon: TrendingUp, weight: 10, impact: "Moyen" },
          ],
          cannibalization: { percentage: Math.min(40, (ind.nb_atm ?? 0) * 3), affectedSites: [] },
          roi: { monthlyRevenue: 0, monthlyCosts: 0, paybackPeriod: 0 },
        })
      } catch (e) {
        console.error("[analysis-panel] indicators error:", e)
        setAnalysis(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [selectedLocation, simulationMode])
  // ======= FIN NOUVELLE LOGIQUE =======

  const handleAddressSearch = async () => {
    if (!searchQuery.trim()) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setGeocodeError(null)
    setGeocodeLoading(true)

    try {
      console.log("[analysis-panel] Searching for address:", searchQuery)

      const params = new URLSearchParams({
        q: searchQuery.trim(),
        countrycodes: "ma",
        limit: "1",
      })

      const response = await fetch(`/api/geocode?${params.toString()}`, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error("Geocoding request failed")
      }

      const payload = await response.json()
      const results = Array.isArray(payload.results) ? payload.results : []

      if (results.length > 0) {
        const result = results[0]
        const location = {
          lat: Number.parseFloat(result.lat),
          lng: Number.parseFloat(result.lon),
          address: result.display_name,
        }

        console.log("[analysis-panel] Found location:", location)

        // Update the selected location to trigger map update and analysis
        setSelectedLocation(location)

        // If there's an onLocationSelect callback, call it to update the map
        if (typeof window !== "undefined" && window.parent) {
          // Dispatch a custom event to notify the parent component
          const event = new CustomEvent("addressSearchResult", {
            detail: location,
          })
          window.dispatchEvent(event)
        }

        // Clear the search query after successful search
        setSearchQuery("")
      } else {
        console.log("[analysis-panel] No results found for:", searchQuery)
        setGeocodeError("Aucun résultat trouvé pour cette adresse. Veuillez essayer une autre recherche.")
      }
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return
      }
      console.error("[analysis-panel] Geocoding error:", error)
      setGeocodeError("Erreur lors de la recherche d'adresse. Veuillez réessayer ultérieurement.")
    } finally {
      setGeocodeLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Recherche d'Adresse</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label htmlFor="search">Adresse ou lieu</Label>
              <Input
                id="search"
                placeholder="Ex: Avenue Mohammed V, Casablanca"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddressSearch()
                  }
                }}
                aria-describedby={geocodeError ? "geocode-error" : undefined}
              />
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={handleAddressSearch}
              disabled={geocodeLoading}
            >
              <Search className="w-4 h-4 mr-2" />
              {geocodeLoading ? "Recherche..." : "Rechercher"}
            </Button>
            {geocodeError && (
              <p id="geocode-error" className="text-sm text-destructive">
                {geocodeError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedLocation && simulationMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Analyse du Site</span>
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Coordonnées: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyse en cours...</p>
                <p className="text-xs text-muted-foreground mt-2">Calcul des indicateurs géomarketing</p>
              </div>
            ) : analysis ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                  <TabsTrigger value="demographics">Démographie</TabsTrigger>
                  <TabsTrigger value="competition">Concurrence</TabsTrigger>
                  <TabsTrigger value="roi">ROI</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Potential Score */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Score de Potentiel Global</Label>
                      <Badge
                        variant={
                          analysis.potentialScore >= 80
                            ? "default"
                            : analysis.potentialScore >= 60
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {analysis.potentialScore}/100
                      </Badge>
                    </div>
                    <Progress value={analysis.potentialScore} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {analysis.potentialScore >= 80
                        ? "Excellent potentiel"
                        : analysis.potentialScore >= 60
                          ? "Bon potentiel"
                          : "Potentiel limité"}
                    </p>
                  </div>

                  {/* Radar Chart */}
                  <div className="space-y-3">
                    <Label className="font-medium">Signature du Site</Label>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={analysis.radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
                          <Radar
                            name="Score"
                            dataKey="A"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Reason Codes */}
                  <div className="space-y-3">
                    <Label className="font-medium">Facteurs Explicatifs</Label>
                    <div className="space-y-3">
                      {analysis.reasonCodes.map((reason: any, index: number) => {
                        const Icon = reason.icon
                        return (
                          <div key={index} className="p-3 rounded-lg border bg-card/50">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                {reason.type === "positive" ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : reason.type === "negative" ? (
                                  <AlertTriangle className="w-5 h-5 text-red-500" />
                                ) : (
                                  <Target className="w-5 h-5 text-yellow-500" />
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{reason.text}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs">
                                    Poids: {reason.weight}%
                                  </Badge>
                                  <Badge
                                    variant={
                                      reason.impact === "Très élevé"
                                        ? "default"
                                        : reason.impact === "Élevé"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    Impact {reason.impact}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="demographics" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm">Population 500m</span>
                      </div>
                      <span className="font-medium">{analysis.demographics.population500m.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-secondary" />
                        <span className="text-sm">Population 1km</span>
                      </div>
                      <span className="font-medium">{analysis.demographics.population1km.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span className="text-sm">Revenu moyen</span>
                      </div>
                      <span className="font-medium">{analysis.demographics.averageIncome.toLocaleString()} MAD</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Tranche d'âge</span>
                      </div>
                      <span className="font-medium">{analysis.demographics.ageGroup}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="competition" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-primary" />
                        <span className="text-sm">Concurrents 500m</span>
                      </div>
                      <span className="font-medium">{analysis.competition.competitors500m}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-secondary" />
                        <span className="text-sm">Concurrents 1km</span>
                      </div>
                      <span className="font-medium">{analysis.competition.competitors1km}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-accent" />
                        <span className="text-sm">Part de marché estimée</span>
                      </div>
                      <span className="font-medium">{analysis.competition.marketShare}%</span>
                    </div>
                  </div>

                  {/* Cannibalization */}
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Cannibalisation Estimée</Label>
                      <Badge variant="outline">{analysis.cannibalization.percentage}%</Badge>
                    </div>
                    <Progress value={analysis.cannibalization.percentage} className="h-2" />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sites Affectés</Label>
                      {analysis.cannibalization.affectedSites.map((site: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">
                            {site.name} ({site.distance})
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {site.impact}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="roi" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Revenus mensuels estimés</span>
                      </div>
                      <span className="font-medium">{analysis.roi.monthlyRevenue.toLocaleString()} MAD</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Coûts mensuels estimés</span>
                      </div>
                      <span className="font-medium">{analysis.roi.monthlyCosts.toLocaleString()} MAD</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm">Période de retour</span>
                      </div>
                      <span className="font-medium">{analysis.roi.paybackPeriod} mois</span>
                    </div>

                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <span className="font-medium">ROI Mensuel Net</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {(
                          ((analysis.roi.monthlyRevenue - analysis.roi.monthlyCosts) / analysis.roi.monthlyCosts) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Marge nette: {(analysis.roi.monthlyRevenue - analysis.roi.monthlyCosts).toLocaleString()}{" "}
                        MAD/mois
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}

            {analysis && (
              <div className="mt-6 pt-4 border-t">
                <Button className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ajouter au Scénario de Simulation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedLocation && simulationMode && (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Mode Simulation Actif</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez sur la carte pour analyser un emplacement potentiel
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Score de potentiel automatique</p>
              <p>• Analyse démographique détaillée</p>
              <p>• Calcul de cannibalisation</p>
              <p>• Projection ROI</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
