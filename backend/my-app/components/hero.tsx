export default function DataMapHero() {
  return (
    <section className="px-6 py-20 md:py-28 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-sm font-semibold text-orange-700">Architecture de Données</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
            Carte des Données
            <span className="text-orange-600 block">ADM</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
            L'architecture complète des domaines de données qui alimentent les cas d'usage Data & IA à fort impact pour
            votre infrastructure autoroutière.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <div className="text-3xl font-bold text-orange-600 mb-2">7</div>
            <p className="text-slate-600 font-medium">Domaines de Données</p>
            <p className="text-sm text-slate-500 mt-1">Couvrant tous les axes stratégiques</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <div className="text-3xl font-bold text-orange-600 mb-2">100+</div>
            <p className="text-slate-600 font-medium">Tables & Référentiels</p>
            <p className="text-sm text-slate-500 mt-1">Base de données complète</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <div className="text-3xl font-bold text-orange-600 mb-2">10+</div>
            <p className="text-slate-600 font-medium">Années de Données</p>
            <p className="text-sm text-slate-500 mt-1">Historique complet disponible</p>
          </div>
        </div>
      </div>
    </section>
  )
}
