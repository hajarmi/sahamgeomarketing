"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

const DEFAULT_FEATURES = [
  "Vue globale du réseau d’ATM",
  "Analyse des zones d’opportunité",
  "Visualisation population / POI / transport",
]

export default function FeatureList() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DEFAULT_FEATURES.map((feature) => (
        <Card key={feature} className="h-full">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-1 h-5 w-5" />
            <p className="text-sm text-muted-foreground">{feature}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
