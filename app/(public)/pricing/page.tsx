import type { Metadata } from "next"
import { PricingSection } from "@/components/landing/pricing-section"
import { FAQSection } from "@/components/landing/faq-section"

export const metadata: Metadata = {
  title: "Pricing - Masidy",
  description: "Simple, transparent pricing for Masidy. Start free and scale as you grow.",
}

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pt-16 text-center md:pt-24">
        <h1 className="text-balance text-3xl font-bold text-foreground md:text-5xl">
          Plans for every stage
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
          Start building for free. Upgrade when you are ready to deploy to production.
        </p>
      </section>
      <PricingSection />
      <FAQSection />
    </>
  )
}
