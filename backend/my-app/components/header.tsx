import Link from "next/link"
import { Menu } from "lucide-react"

export default function Header() {
  return (
    <header className="border-b border-border sticky top-0 bg-white/95 backdrop-blur z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">D</div>
            <span className="font-bold text-lg text-foreground">DataFlow</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              Home
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
              Services
            </Link>
            <Link href="/data-map" className="text-sm text-muted-foreground hover:text-foreground transition">
              Carte des Données
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
              Use Cases
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
              Methodology
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden sm:inline-block px-4 py-2 text-sm text-foreground hover:text-primary transition">
              EN
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition">
              Get Started
            </button>
            <button className="md:hidden p-2">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
