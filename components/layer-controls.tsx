"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import {
  Layers,
  Users,
  Building,
  MapPin,
  Target,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  EyeOff,
  Palette,
  Zap,
  TrendingUp,
} from "lucide-react"
import { useState } from "react"
import { ATM } from "../types"

interface LayerControlsProps {
  activeLayers: {
    population: boolean
    competitors: boolean
    pois: boolean
    coverage: boolean
  }
  onLayerToggle: (layer: keyof LayerControlsProps["activeLayers"], active: boolean) => void
  selectedATM?: ATM | null
}
const layersConfig = [
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
      settings: {
        hasOpacity: true,
        hasRadius: true,
        hasIntensity: true,
      },
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
      settings: {
        hasOpacity: true,
        hasRadius: false,
        hasIntensity: false,
      },
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
      settings: {
        hasOpacity: true,
        hasRadius: false,
        hasIntensity: false,
      },
    },
   
  ]

export default function LayerControls({ activeLayers, onLayerToggle, selectedATM }: LayerControlsProps) {
  const [layerOpacity, setLayerOpacity] = useState({
    population: 70,
    competitors: 80,
    pois: 90,
    coverage: 60,
  })
  const [expandedLayers, setExpandedLayers] = useState<string[]>(["population"])

  const layers = layersConfig

  const toggleLayerExpansion = (layerKey: string) => {
    setExpandedLayers((prev) =>
      prev.includes(layerKey) ? prev.filter((key) => key !== layerKey) : [...prev, layerKey],
    )
  }

  const handleOpacityChange = (layerKey: string, value: number[]) => {
    setLayerOpacity((prev) => ({ ...prev, [layerKey]: value[0] }))
  }

  const getBankColor = (bankName?: string) => {
    switch (bankName) {
      case "Attijariwafa Bank":
        return "bg-red-100 text-red-800 border-red-200"
      case "Banque Populaire":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "BMCE Bank":
        return "bg-green-100 text-green-800 border-green-200"
      case "CIH Bank":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "BMCI":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Crédit du Maroc":
        return "bg-teal-100 text-teal-800 border-teal-200"
      case "Al Barid Bank":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Société Générale Maroc":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      case "Crédit Agricole du Maroc":
        return "bg-lime-100 text-lime-800 border-lime-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-4">
      {selectedATM && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Détails ATM Sélectionné</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Actif
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ATM Header Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{
                    backgroundColor: selectedATM.performance
                      ? selectedATM.performance >= 90
                        ? "#10b981"
                        : selectedATM.performance >= 80
                          ? "#f59e0b"
                          : "#ef4444"
                      : "#6b7280",
                  }}
                />
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{selectedATM.name || selectedATM.id}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getBankColor(selectedATM.bank_name)}`}
                    >
                      {selectedATM.bank_name}
                    </Badge>
                    {selectedATM.installation_type && (
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
                        {selectedATM.installation_type === "portable" ? (
                          <>
                            <Settings className="w-3 h-3 mr-1" />
                            Portable
                          </>
                        ) : (
                          <>
                            <Building className="w-3 h-3 mr-1" />
                            Fixe
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {selectedATM.performance && (
                <div className="text-right">
                  <div
                    className="text-lg font-bold"
                    style={{
                      color:
                        selectedATM.performance >= 90
                          ? "#10b981"
                          : selectedATM.performance >= 80
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {selectedATM.performance}%
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${selectedATM.performance >= 90 ? "#10b981" : selectedATM.performance >= 80 ? "#f59e0b" : "#ef4444"}20`,
                      color:
                        selectedATM.performance >= 90
                          ? "#10b981"
                          : selectedATM.performance >= 80
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {selectedATM.performance >= 90 ? "Excellent" : selectedATM.performance >= 80 ? "Bon" : "Faible"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Location Information */}
            {(selectedATM.address || selectedATM.branch_location || (selectedATM.latitude && selectedATM.longitude)) && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Localisation
                    </Label>
                    {selectedATM.branch_location && (
                      <p className="text-sm font-medium text-foreground">{selectedATM.branch_location}</p>
                    )}
                    {selectedATM.address && <p className="text-sm text-muted-foreground">{selectedATM.address}</p>}
                    {selectedATM.latitude && selectedATM.longitude && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedATM.latitude.toFixed(4)}°N, {selectedATM.longitude.toFixed(4)}°W
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {selectedATM.monthly_volume && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Volume</p>
                      <p className="text-sm font-bold text-blue-800">{selectedATM.monthly_volume}/mois</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedATM.monthly_volume && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-green-600 font-medium">Quotidien</p>
                      <p className="text-sm font-bold text-green-800">{Math.round(selectedATM.monthly_volume / 30)}/jour</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedATM.uptime && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Uptime</p>
                      <p className="text-sm font-bold text-purple-800">{selectedATM.uptime}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedATM.roi && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-orange-600 font-medium">ROI</p>
                      <p className="text-sm font-bold text-orange-800">{selectedATM.roi.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Indicators */}
            <div className="space-y-2">
              {selectedATM.cashLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Liquidité:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selectedATM.cashLevel === "Optimal"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : selectedATM.cashLevel === "Bon"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : selectedATM.cashLevel === "Faible"
                            ? "bg-orange-100 text-orange-800 border-orange-200"
                            : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {selectedATM.cashLevel}
                  </Badge>
                </div>
              )}

              {selectedATM.status && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Réseau:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selectedATM.status === "active"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : selectedATM.status === "maintenance"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {selectedATM.status}
                  </Badge>
                </div>
              )}
            </div>

            {/* Services */}
            {selectedATM.services && selectedATM.services.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Services disponibles
                </Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedATM.services.map((service: string) => (
                    <Badge key={service} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {service === "retrait"
                        ? "Retrait"
                        : service === "depot"
                          ? "Dépôt"
                          : service === "consultation"
                            ? "Consultation"
                            : service === "virement"
                              ? "Virement"
                              : service === "change"
                                ? "Change"
                                : service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Last Maintenance */}
            {selectedATM.lastMaintenance && (
              <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
                <span className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Maintenance:
                </span>
                <span className="font-medium">{new Date(selectedATM.lastMaintenance).toLocaleDateString("fr-FR")}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Target className="w-3 h-3 mr-1" />
                Analyser
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Eye className="w-3 h-3 mr-1" />
                Centrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5" />
              <span>Couches de Données</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {Object.values(activeLayers).filter(Boolean).length}/4 actives
            </Badge>
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
                            onClick={() => toggleLayerExpansion(layer.key)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{layer.dataPoints}</span>
                        <span>{layer.lastUpdate}</span>
                      </div>
                    </div>
                  </div>

                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <Separator />

                      {/* Opacity Control */}
                      {layer.settings.hasOpacity && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Opacité</Label>
                            <span className="text-xs text-muted-foreground">{layerOpacity[layer.key]}%</span>
                          </div>
                          <Slider
                            value={[layerOpacity[layer.key]]}
                            onValueChange={(value) => handleOpacityChange(layer.key, value)}
                            max={100}
                            min={10}
                            step={10}
                            className="w-full"
                            disabled={!isActive}
                          />
                        </div>
                      )}

                      {/* Radius Control for Population */}
                      {layer.settings.hasRadius && layer.key === "population" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Rayon de lissage</Label>
                            <span className="text-xs text-muted-foreground">60px</span>
                          </div>
                          <Slider value={[60]} max={100} min={20} step={10} className="w-full" disabled={!isActive} />
                        </div>
                      )}

                      {/* Intensity Control for Population */}
                      {layer.settings.hasIntensity && layer.key === "population" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Intensité</Label>
                            <span className="text-xs text-muted-foreground">0.6</span>
                          </div>
                          <Slider value={[60]} max={100} min={10} step={10} className="w-full" disabled={!isActive} />
                        </div>
                      )}

                      {/* Layer-specific controls */}
                      {layer.key === "competitors" && (
                        <div className="space-y-3">
                          <Label className="text-sm">Types de concurrents</Label>
                          <div className="space-y-2">
                            {["Banques", "Assurances", "Microfinance"].map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Switch id={`${layer.key}-${type}`} defaultChecked disabled={!isActive} />
                                <Label htmlFor={`${layer.key}-${type}`} className="text-xs">
                                  {type}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {layer.key === "pois" && (
                        <div className="space-y-3">
                          <Label className="text-sm">Catégories POI</Label>
                          <div className="space-y-2">
                            {["Commerces", "Écoles", "Transport", "Santé"].map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Switch id={`${layer.key}-${category}`} defaultChecked disabled={!isActive} />
                                <Label htmlFor={`${layer.key}-${category}`} className="text-xs">
                                  {category}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {layer.key === "coverage" && (
                        <div className="space-y-3">
                          <Label className="text-sm">Temps de marche</Label>
                          <div className="space-y-2">
                            {["5 min", "10 min", "15 min"].map((time) => (
                              <div key={time} className="flex items-center space-x-2">
                                <Switch id={`${layer.key}-${time}`} defaultChecked disabled={!isActive} />
                                <Label htmlFor={`${layer.key}-${time}`} className="text-xs">
                                  {time}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent" disabled={!isActive}>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Actions Rapides</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start bg-transparent"
            onClick={() => {
              Object.keys(activeLayers).forEach((key) => {
                onLayerToggle(key as keyof typeof activeLayers, true)
              })
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Afficher toutes les couches
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start bg-transparent"
            onClick={() => {
              Object.keys(activeLayers).forEach((key) => {
                onLayerToggle(key as keyof typeof activeLayers, false)
              })
            }}
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Masquer toutes les couches
          </Button>

          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres avancés
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
