import Header from "@/components/header"
import Hero from "@/components/hero"
import Features from "@/components/features"
import Vision from "@/components/vision"
import UseCases from "@/components/use-cases"
import CTA from "@/components/cta"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <Vision />
      <UseCases />
      <CTA />
      <Footer />
    </main>
  )
}
