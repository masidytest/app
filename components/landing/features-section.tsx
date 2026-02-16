import { Bot, Eye, Shield, Globe, GitBranch, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI Builder Agent",
    description: "A conversational AI that designs, codes, and deploys full-stack apps from your description.",
  },
  {
    icon: Eye,
    title: "Live Preview",
    description: "Watch your app being built in real-time. See changes as the AI writes every component.",
  },
  {
    icon: Shield,
    title: "Sandbox Testing",
    description: "Test your app safely in an isolated sandbox before pushing to production.",
  },
  {
    icon: Globe,
    title: "One-Click Deploy",
    description: "Deploy to production with a single click. Custom domains, SSL, and CDN included.",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description: "Every change is tracked. Roll back to any version or branch out for experimentation.",
  },
  {
    icon: BarChart3,
    title: "Built-in Analytics",
    description: "Monitor usage, performance, and user engagement directly from your dashboard.",
  },
]

export function FeaturesSection() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Everything you need to ship AI apps
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            From idea to production, NovaBuilder handles the entire lifecycle of your AI-powered applications.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
