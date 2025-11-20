"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Target,
  TrendingUp,
  Users,
  Building,
  Car,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  Route,
  GraduationCap,
} from "lucide-react"

type IndicatorKey =
  | "population"
  | "competitors"
  | "vieillissement"
  | "niveau_vie"
  | "accessibilite"
  | "jeunesse"
  | "education"
  | "transport"
  | "densite_routiere"

interface ScoringDashboardProps {
  selectedLocation: { lng: number; lat: number; address?: string } | null
}

/** Définition affichage des indicateurs */
const INDICATORS: Record<IndicatorKey, { label: string; icon: any }> = {
  population: { label: "Population", icon: Users },
  competitors: { label: "Concurrence (moins = mieux)", icon: Building },
  vieillissement: { label: "Taux vieillissement", icon: TrendingUp },
  niveau_vie: { label: "Niveau de vie (INIV)", icon: TrendingUp },
  accessibilite: { label: "Accessibilité", icon: Route },
  jeunesse: { label: "Taux jeunesse", icon: Users },
  education: { label: "Éducation (IEDU)", icon: GraduationCap },
  transport: { label: "Transport", icon: Car },
  densite_routiere: { label: "Densité routière", icon: MapPin },
}

/** Poids par défaut (sans fécondité, somme = 1) */
const DEFAULT_W: Record<IndicatorKey, number> = {
  population: 0.22,
  competitors: 0.11,
  vieillissement: 0.06,
  niveau_vie: 0.11,
  accessibilite: 0.17,
  jeunesse: 0.06,
  education: 0.11,
  transport: 0.11,
  densite_routiere: 0.05,
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const pct = (x: number) => Math.max(0, Math.min(100, x))

export default function ScoringDashboard({ selectedLocation }: ScoringDashboardProps) {
  const [weights, setWeights] = useState(DEFAULT_W)
  const [loading, setLoading] = useState(false)
  const [raw, setRaw] = useState<any | null>(null) // { commune, indicators, score? }
  const [confidence, setConfidence] = useState<number>(93)
  const [isAdjusting, setIsAdjusting] = useState(false)

  /** Fetch indicateurs réels */
  useEffect(() => {
    if (!selectedLocation) return

    const ctrl = new AbortController()

    ;(async () => {
      setLoading(true)
      try {
        const q = `lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`
        const res = await fetch(`/api/communes/indicators?${q}`, {
          cache: "no-store",
          signal: ctrl.signal,
        })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setRaw(data)
        setConfidence(93)
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("[ScoringDashboard] indicators error:", e)
          setRaw(null)
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [selectedLocation])

  /** Unifier -> indicateurs normalisés 0..100 à partir du backend */
  const scoring = useMemo(() => {
    if (!raw) return null
    const ind = raw.indicators || {}

    // 1) Extraire et normaliser (0..100) chaque indicateur
    const densite_norm = Number(ind.densite_norm ?? 0) // 0..1
    const iniv = Number(ind.INIV ?? 0) // 0..1
    const i_acces = Number(ind.Indice_acces ?? ind.indice_acces ?? 0) // 0..1
    const i_trans = Number(ind.Indice_trans ?? ind.indice_trans ?? 0) // 0..1
    const i_edu = Number(ind.IEDU ?? 0) // 0..1
    const densite_rout = Number(ind.indice_densite ?? ind.indice_densi ?? 0) // 0..1

    const nb_atm = Number(ind.nb_atm ?? 0) // concurrence → moins c’est mieux
    const competitors = 1 / (1 + Math.max(0, nb_atm)) // 0..1

    const taux_vieilless = Number(ind.taux_vieilless ?? 0) // %
    const vieillissement = 1 - clamp01(taux_vieilless / (taux_vieilless > 1 ? 100 : 1))

    const taux_jeuness = Number(ind.taux_jeuness ?? 0) // %
    const jeunesse = clamp01(taux_jeuness / (taux_jeuness > 1 ? 100 : 1))

    const normalized: Record<IndicatorKey, number> = {
      population: Math.round(pct(densite_norm * 100)),
      competitors: Math.round(pct(competitors * 100)),
      vieillissement: Math.round(pct(vieillissement * 100)),
      niveau_vie: Math.round(pct(iniv * 100)),
      accessibilite: Math.round(pct(i_acces * 100)),
      jeunesse: Math.round(pct(jeunesse * 100)),
      education: Math.round(pct(i_edu * 100)),
      transport: Math.round(pct(i_trans * 100)),
      densite_routiere: Math.round(pct(densite_rout * 100)),
    }

    // 2) Score global = somme (poids * valeur/100) * 100
    const sumW = Object.values(weights).reduce((a, b) => a + b, 0) || 1
    const totalScore = Math.round(
      Object.entries(normalized).reduce(
        (acc, [k, v]) => acc + (weights[k as IndicatorKey] / sumW) * (v / 100),
        0,
      ) * 100,
    )

    // 3) Contributions pondérées (en points)
    const contribs = Object.fromEntries(
      (Object.keys(normalized) as IndicatorKey[]).map((k) => {
        const points = (normalized[k] / 100) * (weights[k] / sumW) * 100
        return [k, Math.round(points)]
      }),
    ) as Record<IndicatorKey, number>

    // 4) Reason codes = top contributeurs
    const entries = Object.entries(contribs) as [IndicatorKey, number][]
    const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const reasonCodes = top.map(([k]) => {
      const v = normalized[k]
      const type = v >= 60 ? "positive" : v >= 40 ? "neutral" : "negative"
      return {
        type,
        text: `${INDICATORS[k].label}: ${v}/100`,
        category: k,
        weight: Math.round((weights[k] / sumW) * 100),
        impact: type === "positive" ? "Élevé" : type === "neutral" ? "Moyen" : "Faible",
        score: v,
      }
    })

    return {
      commune: raw.commune,
      totalScore,
      confidence,
      normalized, // 0..100
      contribs, // points
      reasonCodes,
    }
  }, [raw, weights, confidence])

  const normalizeWeights = (w: Record<IndicatorKey, number>) => {
    const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1
    const out = {} as Record<IndicatorKey, number>
    ;(Object.keys(w) as IndicatorKey[]).forEach((k) => {
      out[k] = w[k] / sum
    })
    return out
  }

  const handleWeightChange = (key: IndicatorKey, value: number[]) => {
    setIsAdjusting(true)
    const newVal = Math.max(0.02, Math.min(0.5, value[0] / 100)) // 2%..50%
    const cur = { ...weights }
    const diff = newVal - cur[key]
    const others = (Object.keys(cur) as IndicatorKey[]).filter((k) => k !== key)

    if (diff !== 0) {
      if (diff > 0) {
        const totalOthers = others.reduce((s, k) => s + cur[k], 0)
        if (totalOthers > 0) {
          others.forEach((k) => {
            const red = diff * (cur[k] / totalOthers)
            cur[k] = Math.max(0.02, cur[k] - red)
          })
        }
      } else {
        const add = Math.abs(diff) / others.length
        others.forEach((k) => {
          cur[k] = Math.min(0.5, cur[k] + add)
        })
      }
    }

    cur[key] = newVal
    setWeights(normalizeWeights(cur))
    setTimeout(() => setIsAdjusting(false), 80)
  }

  const resetToDefaultWeights = () => setWeights(normalizeWeights(DEFAULT_W))

  const getScoreColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500"

  const getScoreBadgeVariant = (score: number) =>
    score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"

  if (!selectedLocation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Moteur de Scoring IA</h3>
          <p className="text-sm text-muted-foreground">
            Clique sur la carte pour lancer le calcul.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>
              Scoring IA – Analyse Détaillée{" "}
              {scoring?.commune ? `(${scoring.commune})` : selectedLocation.address ?? ""}
            </span>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            Coordonnées: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </div>
        </CardHeader>

        <CardContent>
          {loading || !scoring ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Calcul du score en cours...</p>
            </div>
          ) : (
            <Tabs defaultValue="score" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="score">Score Global</TabsTrigger>
                <TabsTrigger value="breakdown">Détail</TabsTrigger>
                <TabsTrigger value="weights">Pondération</TabsTrigger>
              </TabsList>

              {/* SCORE GLOBAL */}
              <TabsContent value="score" className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <div className={`text-4xl font-bold ${getScoreColor(scoring.totalScore)}`}>
                      {scoring.totalScore}/100
                    </div>
                    <Badge
                      variant={getScoreBadgeVariant(scoring.totalScore)}
                      className="text-sm"
                    >
                      {scoring.totalScore >= 80
                        ? "Excellent"
                        : scoring.totalScore >= 60
                        ? "Bon"
                        : "Faible"}{" "}
                      Potentiel
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Target className="w-4 h-4" />
                      <span>Confiance: {confidence}%</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="font-medium">Scores par Indicateur</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {(Object.keys(INDICATORS) as IndicatorKey[]).map((k) => {
                      const v = scoring.normalized[k]
                      const Icon = INDICATORS[k].icon
                      return (
                        <div key={k} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {INDICATORS[k].label}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Score</span>
                              <span
                                className={`text-sm font-medium ${getScoreColor(v)}`}
                              >
                                {v}/100
                              </span>
                            </div>
                            <Progress value={v} className="h-1" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* REASON CODES */}
                <div className="space-y-3">
                  <Label className="font-medium">Facteurs Explicatifs (Reason Codes)</Label>
                  <div className="space-y-3">
                    {scoring.reasonCodes.map((r, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card/50">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {r.type === "positive" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : r.type === "negative" ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Info className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <p className="text-sm">{r.text}</p>
                              <Badge variant="outline" className="text-xs ml-2">
                                {INDICATORS[r.category as IndicatorKey].label}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">
                                  Poids: {r.weight}%
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Impact {r.impact}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-medium ${getScoreColor(
                                  r.score,
                                )}`}
                              >
                                {r.score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* DÉTAIL : contributions pondérées */}
              <TabsContent value="breakdown" className="space-y-4">
                <div className="space-y-4">
                  {(Object.keys(INDICATORS) as IndicatorKey[]).map((k) => {
                    const v = scoring.normalized[k]
                    const w = Math.round(
                      (weights[k] /
                        (Object.values(weights).reduce((a, b) => a + b, 0) || 1)) *
                        100,
                    )
                    return (
                      <div key={k} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>{INDICATORS[k].label}</Label>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              Poids: {w}%
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {v}/100
                            </Badge>
                          </div>
                        </div>
                        <Progress value={v} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          Contribution: {scoring.contribs[k]} pts
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* PONDÉRATION : sliders */}
              <TabsContent value="weights" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Ajustez les pondérations (total normalisé à 100%).
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToDefaultWeights}
                    className="text-xs bg-transparent"
                  >
                    Réinitialiser
                  </Button>
                </div>

                <div className="space-y-4">
                  {(Object.keys(INDICATORS) as IndicatorKey[]).map((k) => {
                    const curPct = Math.round(weights[k] * 1000) / 10
                    return (
                      <div key={k} className="space-y-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">{INDICATORS[k].label}</Label>
                          <span className="text-sm font-mono bg-background px-2 py-1 rounded border">
                            {curPct}%
                          </span>
                        </div>
                        <Slider
                          value={[curPct]}
                          onValueChange={(v) => handleWeightChange(k, v)}
                          max={50}
                          min={2}
                          step={1}
                          className="w-full"
                          disabled={isAdjusting}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Min: 2%</span>
                          <span>Actuel: {curPct}%</span>
                          <span>Max: 50%</span>
                        </div>
                      </div>
                    )
                  })}

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <p className="font-medium">💡 Conseils :</p>
                        <p>• Le total est automatiquement normalisé à 100%.</p>
                        <p>• Augmenter un critère réduit les autres proportionnellement.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
