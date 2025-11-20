const visions = [
  {
    icon: "🧠",
    title: "From Data to Decision",
    description:
      "We help enterprises structure their data, automate low-value tasks, empower employees with intelligent tools, and align performance and ease of use.",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    icon: "🎯",
    title: "Data Becomes Concrete",
    description: "Data becomes a concrete lever of efficiency, quality and reactivity for your operations.",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    icon: "⚡",
    title: "Light and Fast Solutions",
    description:
      "Light, fast solutions to deploy with limited disruption and limited onboarding. Let's accelerate this momentum.",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    icon: "📊",
    title: "Measurable Impact",
    description: "Measurable impact from the first months of deployment with concrete results and activities.",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
]

export default function Vision() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="flex items-center gap-2 text-3xl font-bold text-foreground mb-8">
            <span className="text-primary">🔖</span>
            Our Vision
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {visions.map((vision, idx) => (
            <div key={idx} className={`${vision.bgColor} border-2 ${vision.borderColor} rounded-2xl p-8`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{vision.icon}</span>
                <h3 className="text-xl font-bold text-foreground">{vision.title}</h3>
              </div>
              <p className="text-muted-foreground">{vision.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
