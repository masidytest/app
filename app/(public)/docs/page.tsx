import type { Metadata } from "next"
import { BookOpen, FileText, Code, Rocket } from "lucide-react"

export const metadata: Metadata = {
  title: "Documentation - NovaBuilder",
  description: "Learn how to use NovaBuilder to build and deploy AI-powered apps.",
}

const sections = [
  { icon: BookOpen, title: "Getting Started", description: "Learn the basics of NovaBuilder and create your first AI app." },
  { icon: FileText, title: "Guides", description: "Step-by-step tutorials for common workflows and use cases." },
  { icon: Code, title: "API Reference", description: "Complete API documentation for programmatic access." },
  { icon: Rocket, title: "Deployment", description: "Learn about deployment options, custom domains, and scaling." },
]

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <h1 className="text-3xl font-bold text-foreground md:text-4xl">Documentation</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Everything you need to build, test, and deploy AI apps with NovaBuilder.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30 cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <section.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{section.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{section.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Full documentation content coming soon. This is a placeholder layout.
        </p>
      </div>
    </div>
  )
}
