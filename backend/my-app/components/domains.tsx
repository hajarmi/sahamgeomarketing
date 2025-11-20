"use client"

import { useState } from "react"
import { ChevronDown, TrendingUp, Users, Shield, MapPin, Wrench, Lock, TrendingDown } from "lucide-react"

const domains = [
  {
    id: 1,
    title: "Trafic & Mobilité",
    icon: TrendingUp,
    color: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    accentColor: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-700",
    impact: "Impact Élevé",
    tables: 45,
    objective: "Comprendre et anticiper les flux de véhicules sur le réseau autoroutier.",
    description:
      "Prévisions de trafic en temps réel, optimisation de la capacité réseau, planification d'infrastructure.",
    details: [
      {
        type: "Trafic horaire",
        tables: "trafic_horaire_2012 → trafic_horaire_2022",
        desc: "Nombre de véhicules par axe, gare, et heure",
      },
      {
        type: "Trafic mensuel",
        tables: "trafic_mensuel, trafic_mensuel_TMJ",
        desc: "Moyenne mensuelle et journalière par section",
      },
      {
        type: "Temps de parcours",
        tables: "temps_de_parcours",
        desc: "Durée moyenne de trajet entre points clés",
      },
      {
        type: "Origine-Destination",
        tables: "matriceOD, matriceGare",
        desc: "Patterns d'utilisation du réseau",
      },
    ],
  },
  {
    id: 2,
    title: "Accidents & Sécurité",
    icon: Shield,
    color: "from-red-500 to-red-600",
    bgLight: "bg-red-50",
    borderColor: "border-red-200",
    accentColor: "text-red-600",
    badgeColor: "bg-red-100 text-red-700",
    impact: "Impact Critique",
    tables: 38,
    objective: "Prévenir les risques et réduire la gravité des accidents.",
    description: "Analyse prédictive des accidents, zones à risque, prévention proactive.",
    details: [
      { type: "Accidents déclarés", tables: "acc_accident", desc: "Référentiel principal des incidents" },
      { type: "Dégâts et équipements", tables: "acc_degat_accident", desc: "Impacts matériels" },
      { type: "Gravité & nature", tables: "acc_gravite_accident", desc: "Classification et causes" },
      { type: "Environnement", tables: "acc_environnement_accident", desc: "Contexte météorologique" },
    ],
  },
  {
    id: 3,
    title: "Clients & CRM",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
    accentColor: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-700",
    impact: "Impact Élevé",
    tables: 42,
    objective: "Centraliser et segmenter les clients pour une vision unique.",
    description: "CRM centralisé, segmentation client, analyse comportementale.",
    details: [
      { type: "Référentiel client", tables: "crm_client", desc: "Données personnelles et contractuelles" },
      { type: "Interactions", tables: "crm_ticket", desc: "Suivi des réclamations et demandes" },
      { type: "Produits & services", tables: "crm_produit", desc: "Services et abonnements" },
      { type: "Télépéage Jawaz", tables: "telepeage", desc: "Données de badges et transactions" },
    ],
  },
  {
    id: 4,
    title: "Recettes & Finance",
    icon: TrendingDown,
    color: "from-green-500 to-green-600",
    bgLight: "bg-green-50",
    borderColor: "border-green-200",
    accentColor: "text-green-600",
    badgeColor: "bg-green-100 text-green-700",
    impact: "Impact Élevé",
    tables: 35,
    objective: "Analyser les revenus et optimiser la rentabilité.",
    description: "Analyse financière, tarification dynamique, prévisions revenus.",
    details: [
      { type: "Recettes par année", tables: "recette_2012 → recette_2022", desc: "Données financières 10 ans" },
      { type: "Détail par gare", tables: "peage, moyenpaiement", desc: "Transactions et catégories" },
      { type: "Tarification", tables: "tarif, formuleTMJ", desc: "Grilles tarifaires optimisées" },
      { type: "Prévisions", tables: "previsiontrafic", desc: "Projections de revenus" },
    ],
  },
  {
    id: 5,
    title: "Infrastructure",
    icon: MapPin,
    color: "from-amber-500 to-amber-600",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    accentColor: "text-amber-600",
    badgeColor: "bg-amber-100 text-amber-700",
    impact: "Impact Moyen",
    tables: 28,
    objective: "Cartographier le réseau et relier les événements.",
    description: "Géolocalisation, topographie réseau, points de repère.",
    details: [
      { type: "Réseau autoroutier", tables: "troncon, section", desc: "Description physique du réseau" },
      { type: "Gares & échangeurs", tables: "gare, echangeur", desc: "Points d'accès et de sortie" },
      { type: "Stations-service", tables: "stationservice", desc: "Localisation des aires" },
      { type: "Géolocalisation", tables: "geolocalisation", desc: "Coordonnées géographiques" },
    ],
  },
  {
    id: 6,
    title: "Interventions & Maintenance",
    icon: Wrench,
    color: "from-cyan-500 to-cyan-600",
    bgLight: "bg-cyan-50",
    borderColor: "border-cyan-200",
    accentColor: "text-cyan-600",
    badgeColor: "bg-cyan-100 text-cyan-700",
    impact: "Impact Moyen",
    tables: 32,
    objective: "Optimiser la maintenance et la réactivité opérationnelle.",
    description: "Interventions terrain, maintenance préventive, planification intelligente.",
    details: [
      { type: "Interventions terrain", tables: "ass_intervention", desc: "Détails des opérations" },
      { type: "Types d'intervention", tables: "ass_type_intervention", desc: "Nature et durée" },
      { type: "Équipements", tables: "ass_equipement", desc: "Équipements concernés" },
      { type: "Travaux planifiés", tables: "travaux_avenir", desc: "Planification des chantiers" },
    ],
  },
  {
    id: 7,
    title: "Gouvernance & Support",
    icon: Lock,
    color: "from-slate-500 to-slate-600",
    bgLight: "bg-slate-50",
    borderColor: "border-slate-200",
    accentColor: "text-slate-600",
    badgeColor: "bg-slate-100 text-slate-700",
    impact: "Impact Fondamental",
    tables: 24,
    objective: "Assurer la traçabilité et la qualité des données.",
    description: "Notifications, gouvernance, dictionnaires de référence.",
    details: [
      { type: "Notifications & événements", tables: "notification, evenement", desc: "Événements opérationnels" },
      { type: "Historique communication", tables: "historique_sms", desc: "Suivi des échanges" },
      { type: "Prévisions", tables: "previsiontrafic", desc: "Modèles de prévision" },
      { type: "Référentiels", tables: "ville, typealerte", desc: "Tables de référence" },
    ],
  },
]

export default function DataDomains() {
  const [expandedId, setExpandedId] = useState<number | null>(1)

  return (
    <section className="px-6 py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">7 Domaines Stratégiques</h2>
          <p className="text-lg text-slate-600">
            Explorez l'architecture complète de vos données avec des métriques de valeur et d'impact
          </p>
        </div>

        <div className="space-y-4">
          {domains.map((domain) => {
            const IconComponent = domain.icon
            return (
              <div
                key={domain.id}
                className={`${domain.bgLight} ${domain.borderColor} border rounded-xl overflow-hidden transition-all hover:shadow-md`}
              >
                <button
                  onClick={() => setExpandedId(expandedId === domain.id ? null : domain.id)}
                  className="w-full p-6 flex items-start justify-between hover:opacity-95 transition-opacity"
                >
                  <div className="flex items-start gap-4 text-left flex-1">
                    <div className={`bg-gradient-to-br ${domain.color} p-3 rounded-lg text-white flex-shrink-0`}>
                      <IconComponent size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-xl font-bold ${domain.accentColor}`}>{domain.title}</h3>
                        <span className={`${domain.badgeColor} text-xs font-semibold px-2 py-1 rounded-full`}>
                          {domain.impact}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-2">{domain.objective}</p>
                      <p className="text-sm text-slate-500">{domain.description}</p>
                      <div className="flex gap-6 mt-3 text-sm">
                        <span className="text-slate-600">
                          <span className="font-semibold text-slate-900">{domain.tables}</span> tables
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={24}
                    className={`${domain.accentColor} transition-transform flex-shrink-0 mt-1 ${
                      expandedId === domain.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedId === domain.id && (
                  <div className="px-6 pb-6 border-t border-current border-opacity-10 bg-white bg-opacity-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                      {domain.details.map((detail, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-slate-100">
                          <div className={`font-semibold ${domain.accentColor} mb-2 text-sm`}>{detail.type}</div>
                          <div className="text-xs font-mono bg-slate-100 text-slate-700 p-2 rounded mb-2 overflow-x-auto">
                            {detail.tables}
                          </div>
                          <p className="text-sm text-slate-600">{detail.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Synthèse des Flux de Données</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "Trafic & Mobilité", description: "Prévisions en temps réel et optimisation de capacité" },
              { label: "Accidents & Sécurité", description: "Alertes prédictives et zones à risque identifiées" },
              { label: "Clients & CRM", description: "Segmentation automatique et recommandations" },
              { label: "Recettes & Finance", description: "Tarification dynamique et projections revenus" },
              { label: "Infrastructure", description: "Cartographie complète et géolocalisation" },
              { label: "Maintenance", description: "Planification intelligente et maintenance préventive" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2 text-sm">{item.label}</div>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
