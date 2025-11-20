"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import ATMList from "./atm-list"
import {
  Layers,
  MapPin,
  Users,
  Building,
  ChevronDown,
  ChevronUp,
  Eye,
  Palette,
  BarChart3,
  Clock,
  Database,
  Activity,
  DollarSign,
  Wifi,
  Calendar,
  Route, // 👈 for Transport
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { ATM } from "@/types"

interface LayerControlsProps {
  activeLayers: {
    population: boolean
    competitors: boolean
    pois: boolean
    transport: boolean // 👈 NEW
  }
  onLayerToggle: (layer: keyof LayerControlsProps["activeLayers"], active: boolean) => void
  mode?: "compact" | "detailed"
  onLayerConfigChange?: (layer: string, config: any) => void
  selectedATM?: ATM | null
  atms?: ATM[]
  onATMSelect?: (atm: ATM) => void
  loading?: boolean
  refresh?: number
}

export default function EnhancedLayerControls({
  activeLayers,
  onLayerToggle,
  mode = "detailed",
  onLayerConfigChange,
  selectedATM,
  onATMSelect,
  atms,
  loading,
}: LayerControlsProps) {
  const [layerOpacity, setLayerOpacity] = useState({
    population: 70,
    competitors: 80,
    pois: 90,
    transport: 90, // 👈 NEW default opacity
  })
  const [expandedLayers, setExpandedLayers] = useState<string[]>(
    mode === "detailed" ? ["population"] : []
  )

  const layers = useMemo(
    () => [
      {
        key: "population" as const,
        label: "Densité Population",
        description: "Heatmap de la densité démographique",
        icon: Users,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        dataPoints: "2.3M points",
        lastUpdate: "Mis à jour il y a 2h",
        performance: { loadTime: "1.2s", accuracy: "98%" },
        settings: { hasOpacity: true, hasRadius: true, hasIntensity: true },
      },
      {
        key: "competitors" as const,
        label: "Concurrents",
        description: "Points de vente concurrents",
        icon: Building,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        dataPoints: "1,247 sites",
        lastUpdate: "Mis à jour il y a 1j",
        performance: { loadTime: "0.8s", accuracy: "100%" },
        settings: { hasOpacity: true, hasRadius: false, hasIntensity: false },
      },
      {
        key: "pois" as const,
        label: "Points d'Intérêt",
        description: "Commerces, écoles, gares",
        icon: MapPin,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        dataPoints: "15.7K POIs",
        lastUpdate: "Mis à jour il y a 6h",
        performance: { loadTime: "2.1s", accuracy: "95%" },
        settings: { hasOpacity: true, hasRadius: false, hasIntensity: false },
      },
      {
        key: "transport" as const, // 👈 NEW layer
        label: "Transport",
        description: "Trains, tram, bus, taxi",
        icon: Route,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        dataPoints: "Plusieurs milliers",
        lastUpdate: "Mis à jour il y a 3h",
        performance: { loadTime: "1.0s", accuracy: "97%" },
        settings: { hasOpacity: true, hasRadius: false, hasIntensity: false },
      },
      
    ],
    []
  )

  const handleOpacityChange = useCallback(
    (layerKey: string, value: number[]) => {
      const newOpacity = value[0]
      setLayerOpacity((prev) => ({ ...prev, [layerKey]: newOpacity }))
      onLayerConfigChange?.(layerKey, { opacity: newOpacity })
    },
    [onLayerConfigChange]
  )

  const activeLayersCount = useMemo(
    () => Object.values(activeLayers).filter(Boolean).length,
    [activeLayers]
  )
  const totalLayers = useMemo(() => Object.keys(activeLayers).length, [activeLayers])

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return "text-green-600"
    if (performance >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "connecté":
        return "text-green-600"
      case "instable":
        return "text-yellow-600"
      case "déconnecté":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (mode === "compact") {
    return (
      <div className="space-y-4">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4" />
                <span>Couches Actives</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activeLayersCount}/{totalLayers}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {layers.map((layer) => {
              const Icon = layer.icon
              const isActive = activeLayers[layer.key]

              return (
                <div key={layer.key} className="flex items-center justify-between p-2 rounded-md border">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${layer.color}`} />
                    <span className="text-sm font-medium">{layer.label}</span>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => onLayerToggle(layer.key, checked)}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {onATMSelect && (
          <ATMList
            atms={atms || []}
            selectedATM={selectedATM}
            onATMSelect={onATMSelect}
            loading={loading || false}
          />
        )}

        {selectedATM && (
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span>ATM Sélectionné</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">{selectedATM.id}</h4>
                <p className="text-xs text-muted-foreground">{selectedATM.bank_name}</p>
              </div>

              {selectedATM.monthly_volume && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Performance</span>
                    <span
                      className={`text-xs font-medium ${getPerformanceColor(
                        Math.round((selectedATM.monthly_volume / 1500) * 100)
                      )}`}
                    >
                      {Math.round((selectedATM.monthly_volume / 1500) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.round((selectedATM.monthly_volume / 1500) * 100)}
                    className="h-1"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedATM.monthly_volume && (
                  <div>
                    <span className="text-muted-foreground">Trans./jour</span>
                    <p className="font-medium">{Math.round(selectedATM.monthly_volume / 30)}</p>
                  </div>
                )}
                {selectedATM.uptime && (
                  <div>
                    <span className="text-muted-foreground">Disponibilité</span>
                    <p className="font-medium">{selectedATM.uptime}</p>
                  </div>
                )}
              </div>

              {selectedATM.status && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Statut réseau</span>
                  <Badge variant="outline" className={getStatusColor(selectedATM.status)}>
                    {selectedATM.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5" />
              <span>Couches de Données</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {activeLayersCount}/{totalLayers} actives
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center space-x-1">
                <Database className="w-3 h-3" />
                <span>Live</span>
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {layers.map((layer) => {
            const Icon = layer.icon
            const isExpanded = expandedLayers.includes(layer.key)
            const isActive = activeLayers[layer.key]

            return (
              <div key={layer.key} className={`rounded-lg border ${layer.borderColor} ${layer.bgColor}`}>
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${layer.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={layer.key} className="font-medium cursor-pointer">
                            {layer.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{layer.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={layer.key}
                            checked={isActive}
                            onCheckedChange={(checked) => onLayerToggle(layer.key, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedLayers((prev) =>
                                prev.includes(layer.key)
                                  ? prev.filter((key) => key !== layer.key)
                                  : [...prev, layer.key]
                              )
                            }
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="w-3 h-3" />
                          <span>{layer.dataPoints}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{layer.performance.loadTime}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {layer.lastUpdate} • Précision: {layer.performance.accuracy}
                      </div>
                    </div>
                  </div>

                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <Separator />

                      {/* Opacity control */}
                      {layer.settings.hasOpacity && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Opacité</Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {layerOpacity[layer.key]}%
                              </span>
                              <div
                                className={`w-4 h-4 rounded border ${layer.color.replace("text-", "bg-")}`}
                                style={{ opacity: layerOpacity[layer.key] / 100 }}
                              />
                            </div>
                          </div>
                          <Slider
                            value={[layerOpacity[layer.key]]}
                            onValueChange={(value) => handleOpacityChange(layer.key, value)}
                            max={100}
                            min={10}
                            step={5}
                            className="w-full"
                            disabled={!isActive}
                          />
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          disabled={!isActive}
                          onClick={() => {
                            // Isoler cette couche (désactiver les autres)
                            Object.keys(activeLayers).forEach((key) => {
                              if (key !== layer.key) {
                                onLayerToggle(key as keyof typeof activeLayers, false)
                              }
                            })
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Isoler
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent" disabled={!isActive}>
                          <Palette className="w-3 h-3 mr-1" />
                          Style
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {selectedATM && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>ATM Sélectionné</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedATM.id}</h3>
                <p className="text-sm text-muted-foreground">{selectedATM.bank_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedATM.city}, {selectedATM.region}
                </p>
              </div>
              {selectedATM.monthly_volume && (
                <div className="text-right">
                  <div
                    className={`text-2xl font-bold ${getPerformanceColor(
                      Math.round((selectedATM.monthly_volume / 1500) * 100)
                    )}`}
                  >
                    {Math.round((selectedATM.monthly_volume / 1500) * 100)}%
                  </div>
                  <Badge
                    variant="outline"
                    className={getPerformanceColor(
                      Math.round((selectedATM.monthly_volume / 1500) * 100)
                    )}
                  >
                    {Math.round((selectedATM.monthly_volume / 1500) * 100) >= 90
                      ? "Excellente"
                      : Math.round((selectedATM.monthly_volume / 1500) * 100) >= 80
                      ? "Bonne"
                      : "Faible"}
                  </Badge>
                </div>
              )}
            </div>

            {selectedATM.monthly_volume && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Performance globale</span>
                  <span
                    className={`text-sm font-medium ${getPerformanceColor(
                      Math.round((selectedATM.monthly_volume / 1500) * 100)
                    )}`}
                  >
                    {Math.round((selectedATM.monthly_volume / 1500) * 100)}%
                  </span>
                </div>
                <Progress
                  value={Math.round((selectedATM.monthly_volume / 1500) * 100)}
                  className="h-2"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selectedATM.monthly_volume && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 uppercase tracking-wide font-medium">
                      Transactions/jour
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-800">
                    {Math.round(selectedATM.monthly_volume / 30)}
                  </div>
                </div>
              )}

              {selectedATM.uptime && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600 uppercase tracking-wide font-medium">
                      Disponibilité
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-800">99.5%</div>
                </div>
              )}

              {selectedATM.monthly_volume && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-purple-600 uppercase tracking-wide font-medium">
                      Volume mensuel
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-800">
                    {selectedATM.monthly_volume}
                  </div>
                </div>
              )}

              {selectedATM.roi && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <DollarSign className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs text-yellow-600 uppercase tracking-wide font-medium">
                      ROI
                    </span>
                  </div>
                  <div className="text-lg font-bold text-yellow-800">
                    {selectedATM.roi.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {selectedATM.cashLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Niveau de liquidité</span>
                  <Badge
                    variant="outline"
                    className={
                      selectedATM.cashLevel === "Optimal"
                        ? "text-green-600 border-green-200"
                        : selectedATM.cashLevel === "Bon"
                        ? "text-yellow-600 border-yellow-200"
                        : selectedATM.cashLevel === "Faible"
                        ? "text-orange-600 border-orange-200"
                        : "text-red-600 border-red-200"
                    }
                  >
                    {selectedATM.cashLevel}
                  </Badge>
                </div>
              )}

              {selectedATM.status && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Statut réseau</span>
                  <Badge variant="outline" className={getStatusColor(selectedATM.status)}>
                    {selectedATM.status}
                  </Badge>
                </div>
              )}

              {selectedATM.lastMaintenance && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dernière maintenance</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date().toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
