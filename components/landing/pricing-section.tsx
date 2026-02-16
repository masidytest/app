import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { pricingPlans } from "@/lib/dummy-data"
import { cn } from "@/lib/utils"

export function PricingSection() {
  return (
    <section className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Start free, upgrade when you are ready to ship to production.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-xl border p-8",
                plan.highlighted
                  ? "border-primary bg-card shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              )}
            >
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>

              <ul className="mt-8 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={plan.highlighted ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
