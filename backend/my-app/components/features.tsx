import { TrendingUp, Mail, Eye } from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    title: "Demand Forecasting",
    description: "Machine learning and exogenous signals",
    items: [
      "Machine learning and exogenous signals",
      "Actionable and personalized predictions",
      "Stabilize planning",
      "Reduce operational costs",
    ],
    color: "bg-orange-50",
  },
  {
    icon: Mail,
    title: "Intelligent Processing",
    description: "Automated reading and classification",
    items: [
      "Automated reading and classification",
      "Prioritize requests",
      "Generate contextual responses",
      "Immediate productivity gain",
    ],
    color: "bg-gray-50",
  },
  {
    icon: Eye,
    title: "AI Quality Control",
    description: "Automatic defect detection",
    items: ["Automatic defect detection", "Image and video analysis", "Process stabilization", "Defect reduction"],
    color: "bg-orange-50",
  },
]

export default function Features() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className={`${feature.color} rounded-2xl p-8 border-2 border-border hover:border-primary/50 transition`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                </div>
                <ul className="space-y-2">
                  {feature.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
