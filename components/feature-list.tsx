// app/components/feature-list.tsx
"use client"

import { CheckCircle2 } from "lucide-react"

const FEATURES = [
  {
    title: "Scoring géomarketing intelligent",
    description:
      "Évalue chaque zone en fonction du potentiel de volume, de la concurrence, de la population et des infrastructures.",
  },
  {
    title: "Couverture du réseau ATM",
    description:
      "Analyse des zones sur-couvertes et sous-couvertes pour optimiser l’implantation des automates.",
  },
  {
    title: "Vision 360° du territoire",
    description:
      "Croisement des données démographiques, économiques, transport et points d’intérêt pour guider les décisions.",
  },
]

export function FeatureList() {
  return (
    <div className="space-y-4">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-sm">{f.title}</h3>
            <p className="text-xs text-muted-foreground">{f.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default FeatureList
