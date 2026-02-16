import { MessageSquare, Cpu, Rocket } from "lucide-react"

const steps = [
  {
    icon: MessageSquare,
    title: "Describe Your App",
    description: "Tell the AI Builder what you want in plain English. Upload files or paste a GitHub repo for context.",
  },
  {
    icon: Cpu,
    title: "AI Builds It",
    description: "Our AI agent designs the architecture, writes the code, sets up infrastructure, and handles every detail.",
  },
  {
    icon: Rocket,
    title: "Test & Deploy",
    description: "Preview in sandbox, iterate with the AI, and deploy to production with a single click.",
  },
]

export function HowItWorksSection() {
  return (
    <section className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Three steps from idea to production. No coding, no configuration, no hassle.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="group relative rounded-xl border border-border bg-card p-8 transition-colors hover:border-primary/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-1 text-xs font-mono text-muted-foreground">
                {"0" + (i + 1)}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
