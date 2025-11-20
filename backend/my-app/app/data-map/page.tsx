import Header from "@/components/header"
import Footer from "@/components/footer"
import DataMapHero from "@/components/hero"
import DataDomains from "@/components/domains"

export default function DataMapPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <DataMapHero />
      <DataDomains />
      <Footer />
    </main>
  )
}
