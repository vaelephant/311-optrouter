import { Navbar } from "./(home)/components/navbar"
import { Hero } from "./(home)/components/hero"
import { Stats } from "./(home)/components/stats"
import { Features } from "./(home)/components/features"
import { Models } from "./(home)/components/models"
import { CodeExample } from "./(home)/components/code-example"
import { Pricing } from "./(home)/components/pricing"
import { CTA } from "./(home)/components/cta"
import { Footer } from "./(home)/components/footer"

export default function Home() {
  return (
    <main 
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-bg-page)',
      }}
    >
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Models />
      <CodeExample />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}

