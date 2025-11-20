"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { WifiOff, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ATM } from "@/types"

function MapSkeleton() {
  return (
    <div
      className="w-full h-full rounded-lg bg-muted/50 animate-pulse flex items-center justify-center"
      style={{ minHeight: "500px" }}
    >
      <div className="text-center text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-2" />
        <p>Chargement de la carte...</p>
      </div>
    </div>
  )
}

const LeafletMap = dynamic(() => import("./leaflet-map-client"), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

interface MapboxMapProps {
  activeLayers: {
    population: boolean
    competitors: boolean
    pois: boolean
    transport: boolean
  }
  simulationMode: boolean
  isScoring?: boolean  
  onLocationSelect: (location: { lng: number; lat: number; address?: string }) => void
  atms: ATM[]
  selectedATM?: ATM | null
  onATMSelect?: (atm: ATM) => void
}

export default function MapboxMap({
  activeLayers,
  simulationMode,
  onLocationSelect,
  atms,
  selectedATM,
  onATMSelect,
}: MapboxMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setIsClient(true)

    const timer = setTimeout(() => {
      if (!document.querySelector(".leaflet-container")) {
        setLoadError(true)
      }
    }, 15000) // 15-second timeout

    return () => clearTimeout(timer)
  }, [retry])

  const handleRetry = () => {
    setLoadError(false)
    setRetry((prev) => prev + 1)
  }

  if (loadError) {
    return (
      <div
        className="w-full h-full rounded-lg bg-muted/30 flex items-center justify-center"
        style={{ minHeight: "500px" }}
      >
        <div className="text-center text-destructive">
          <WifiOff className="w-10 h-10 mx-auto mb-4" />
          <p className="font-semibold">Erreur de chargement de la carte</p>
          <p className="text-sm text-muted-foreground mb-4">
            Votre connexion réseau est peut-être lente.
          </p>
          <Button onClick={handleRetry}>Réessayer</Button>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<MapSkeleton />}>
      {isClient && (
        <LeafletMap
          key={retry}
          activeLayers={activeLayers}
          simulationMode={simulationMode}
          onLocationSelect={onLocationSelect}
          atms={atms}
          selectedATM={selectedATM}
          onATMSelect={onATMSelect}
        />
      )}
    </Suspense>
  )
}
