"use client"

import { useState } from "react"

const useCases = [
  {
    title: "Demand Forecasting",
    category: "Forecasting",
    description: "Optimize Stock and Production",
    users: ["Supply Chain", "Production", "Sales"],
    status: { complete: 3, total: 5 },
    color: "border-orange-200",
  },
  {
    title: "Global Demand Planning",
    category: "Strategy",
    description: "Data Transformation Architecture",
    users: ["Data Engineers", "Analysts"],
    status: { complete: 5, total: 5 },
    color: "border-blue-200",
  },
  {
    title: "Vision Quality Control",
    category: "Quality",
    description: "Automatic Defect Detection",
    users: ["Quality Team", "Production"],
    status: { complete: 3, total: 4 },
    color: "border-green-200",
  },
  {
    title: "Formula Optimization",
    category: "Quality",
    description: "Paint Formula Optimization",
    users: ["R&D", "Quality"],
    status: { complete: 4, total: 4 },
    color: "border-yellow-200",
  },
  {
    title: "Data Platform Implementation",
    category: "Data Platform",
    description: "Robust Data Infrastructure",
    users: ["Data Team", "IT"],
    status: { complete: 4, total: 6 },
    color: "border-purple-200",
  },
  {
    title: "Electronic Document Management",
    category: "Documentation",
    description: "Document Management System",
    users: ["Operations", "Compliance"],
    status: { complete: 4, total: 5 },
    color: "border-orange-200",
  },
]

const StatBadge = ({ complete, total }: { complete: number; total: number }) => {
  const colors = ["bg-red-500", "bg-red-500", "bg-yellow-500", "bg-yellow-500", "bg-green-500", "bg-green-500"]
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, idx) => (
        <div
          key={idx}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
            idx < complete ? colors[idx] : "bg-gray-300"
          }`}
        >
          {idx + 1}
        </div>
      ))}
    </div>
  )
}

export default function UseCases() {
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "Forecasting", "Strategy", "Quality", "Data Platform", "Documentation"]

  const filtered = selectedCategory === "All" ? useCases : useCases.filter((uc) => uc.category === selectedCategory)

  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-3 text-balance">AI/ML Use Cases Portfolio</h2>
          <p className="text-lg text-muted-foreground">
            10 AI applications to optimize production and quality management.
          </p>
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-white text-foreground border border-border hover:border-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((useCase, idx) => (
            <div key={idx} className={`bg-white border-2 ${useCase.color} rounded-2xl p-6 hover:shadow-lg transition`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-orange-100 text-primary text-xs font-semibold rounded-full mb-3">
                    {useCase.category}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{useCase.description}</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Key Users:</p>
                  <div className="flex flex-wrap gap-1">
                    {useCase.users.map((user, uIdx) => (
                      <span key={uIdx} className="text-xs bg-gray-100 px-2 py-1 rounded text-foreground">
                        {user}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Implementation Status:</p>
                  <StatBadge complete={useCase.status.complete} total={useCase.status.total} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          {filtered.length} Use Cases • {Math.ceil(filtered.length / 3)} Categories • {filtered.length * 2} Features
        </div>
      </div>
    </section>
  )
}
