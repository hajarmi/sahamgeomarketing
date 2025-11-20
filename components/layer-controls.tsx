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
] as const

type LayerKey = (typeof layersConfig)[number]["key"]

export default function LayerControls({ activeLayers, onLayerToggle, selectedATM }: LayerControlsProps) {
  const [layerOpacity, setLayerOpacity] = useState<Record<keyof LayerControlsProps["activeLayers"], number>>({
    population: 70,
    competitors: 80,
    pois: 90,
  })

  const [expandedLayers, setExpandedLayers] = useState<LayerKey[]>(["population"])

  const layers = layersConfig

  const toggleLayerExpansion = (layerKey: LayerKey) => {
    setExpandedLayers((prev) =>
      prev.includes(layerKey) ? prev.filter((key) => key !== layerKey) : [...prev, layerKey],
    )
  }

  const handleOpacityChange = (layerKey: LayerKey, value: number[]) => {
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
            {/* ... tout le bloc ATM (inchangé) ... */}
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
              {Object.values(activeLayers).filter(Boolean).length}/{Object.keys(activeLayers).length} actives
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
                  {/* ... contenu du layer (inchangé sauf usages de coverage supprimés) ... */}
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <Separator />

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

                      {layer.settings.hasRadius && layer.key === "population" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Rayon de lissage</Label>
                            <span className="text-xs text-muted-foreground">60px</span>
                          </div>
                          <Slider value={[60]} max={100} min={20} step={10} className="w-full" disabled={!isActive} />
                        </div>
                      )}

                      {layer.settings.hasIntensity && layer.key === "population" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Intensité</Label>
                            <span className="text-xs text-muted-foreground">0.6</span>
                          </div>
                          <Slider value={[60]} max={100} min={10} step={10} className="w-full" disabled={!isActive} />
                        </div>
                      )}

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
