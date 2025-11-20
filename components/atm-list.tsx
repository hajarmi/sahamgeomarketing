"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Search, Filter, X, TrendingUp } from "lucide-react"
import { ATM } from "@/types"

interface ATMListProps {
  atms: ATM[]
  selectedATM?: ATM | null
  onATMSelect: (atm: ATM) => void
  loading: boolean
}

export default function ATMList({ atms, selectedATM, onATMSelect, loading }: ATMListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredResults = useMemo(() => {
    // Sort ATMs to put "Saham Bank" first
    const sortedAtms = [...atms].sort((a, b) => {
      const aIsSaham = a.bank_name === "Saham Bank"
      const bIsSaham = b.bank_name === "Saham Bank"

      // Saham Bank always comes first
      if (aIsSaham && !bIsSaham) {
        return -1
      }
      if (!aIsSaham && bIsSaham) {
        return 1
      }

      // If both are Saham Bank, sort by volume
      if (aIsSaham && bIsSaham) {
        return b.monthly_volume - a.monthly_volume
      }

      // Secondary priority for Société Générale
      const aIsSG = a.bank_name === "Société Générale Maroc"
      const bIsSG = b.bank_name === "Société Générale Maroc"

      if (aIsSG && !bIsSG) return -1
      if (!aIsSG && bIsSG) return 1
      if (aIsSG && bIsSG) return b.monthly_volume - a.monthly_volume
      
      // Otherwise, sort by name
      return a.id.localeCompare(b.id)
    })
    let filtered = sortedAtms

    // Enhanced search filtering
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((atm) => {
        return (
          atm.bank_name.toLowerCase().includes(searchLower) ||
          atm.city.toLowerCase().includes(searchLower) ||
          atm.region.toLowerCase().includes(searchLower) ||
          // Enhanced address search - split search terms for better matching
          searchLower
            .split(" ")
            .every(
              (term) =>
                atm.city.toLowerCase().includes(term) ||
                atm.bank_name.toLowerCase().includes(term),
            )
        )
      })
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((atm) => atm.status === statusFilter)
    }

    return filtered
  }, [atms, searchTerm, statusFilter])

  // Get unique cities, regions, and bank names for suggestions
  const uniqueSuggestions = useMemo(() => {
    const cities = [...new Set(atms.map((atm) => atm.city))].sort()
    const regions = [...new Set(atms.map((atm) => atm.region))].sort()
    // Ensure "Saham Bank" is always first in the suggestions
    const banks = ["Saham Bank", ...[...new Set(atms.map((atm) => atm.bank_name))].filter((b) => b !== "Saham Bank")].sort(
      (a, b) => (a === "Saham Bank" ? -1 : b === "Saham Bank" ? 1 : a.localeCompare(b)),
    )
    return { cities, regions, banks }
  }, [atms])

  const getBankColor = (bankName: string) => {
    switch (bankName) {
      case "Saham Bank":
        return "bg-primary/10 text-primary border-primary/20"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPerformanceLevel = (status: string) => {
    if (status === "active") return { level: "Élevé", color: "text-green-600" }
    if (status === "maintenance") return { level: "Moyen", color: "text-yellow-600" }
    if (status === "inactive") return { level: "Faible", color: "text-red-600" }
    return { level: "Inconnu", color: "text-gray-600" }
  }

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Liste des ATMs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="ml-2 text-sm text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Liste des ATMs</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredResults.length}/{atms.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Enhanced Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, ville, adresse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground self-center mr-1">Suggestions:</span>
              <Button key="bank-saham" variant="outline" size="sm" onClick={() => setSearchTerm("Saham Bank")} className="h-6 px-2 text-xs">
                Saham Bank
              </Button>
              {uniqueSuggestions.cities
                .filter((city) => city.toLowerCase().includes(searchTerm.toLowerCase()))
                .slice(0, 3)
                .map((city) => (
                  <Button
                    key={`city-${city}`}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm(city)}
                    className="h-6 px-2 text-xs"
                  >
                    {city}
                  </Button>
                ))}
              {uniqueSuggestions.regions
                .filter((region) => region.toLowerCase().includes(searchTerm.toLowerCase()))
                .slice(0, 2)
                .map((region) => (
                  <Button
                    key={`region-${region}`}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm(region)}
                    className="h-6 px-2 text-xs"
                  >
                    {region}
                  </Button>
                ))}
              {uniqueSuggestions.banks
                .filter((bank) => bank.toLowerCase().includes(searchTerm.toLowerCase()) && bank !== "Saham Bank")
                .slice(0, 2)
                .map((bank) => (
                  <Button key={`bank-${bank}`} variant="outline" size="sm" onClick={() => setSearchTerm(bank)} className="h-6 px-2 text-xs">
                    {bank}
                  </Button>
                ))}
            </div>
          }

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px] max-h-[600px] relative">
          <div className="space-y-2">
            {filteredResults.map((atm) => {
              const isSelected = selectedATM?.id === atm.id
              const performance = getPerformanceLevel(atm.status)


              return (
                <div
                  key={atm.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => onATMSelect(atm)}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                          style={{
                            backgroundColor:
                              atm.status === "active"
                                ? "#10b981"
                                : atm.status === "maintenance"
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm text-foreground">{atm.id}</h4>
                          <p className="text-xs text-muted-foreground">{atm.city}, {atm.region}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bank and Status */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs ${getBankColor(atm.bank_name)}`}>
                        {atm.bank_name}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(atm.status)}`}>
                        {atm.status === "active" ? "Actif" : atm.status === "maintenance" ? "Maintenance" : "Inactif"}
                      </Badge>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                       <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Performance:</span>
                        <span className={`font-medium ${performance.color}`}>{performance.level}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">{atm.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="ml-2 text-sm text-muted-foreground">Actualisation...</p>
            </div>
          )}
        </ScrollArea>

        {filteredResults.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun ATM trouvé</p>
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="mt-2 text-xs">
                Effacer la recherche
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
