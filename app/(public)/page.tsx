import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FAQSection } from "@/components/landing/faq-section"

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
    </>
  )
}
