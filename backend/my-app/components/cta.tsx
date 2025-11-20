export default function CTA() {
  return (
    <section className="bg-gradient-to-r from-primary to-primary/90 text-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl">🚀</span>
          <span className="text-lg font-semibold">Ready to transform?</span>
        </div>
        <h2 className="text-4xl font-bold mb-6 text-balance">Transform Your Operations with AI</h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto text-balance">
          Discover our use cases or contact us to discuss your specific needs
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 bg-white text-primary rounded-lg font-bold hover:bg-gray-50 transition">
            View All Use Cases
          </button>
          <button className="px-8 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition">
            Contact Us
          </button>
        </div>
      </div>
    </section>
  )
}
