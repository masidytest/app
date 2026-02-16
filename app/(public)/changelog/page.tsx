import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Changelog - NovaBuilder",
  description: "Stay up to date with the latest features and improvements to NovaBuilder.",
}

const entries = [
  {
    date: "February 12, 2026",
    title: "IDE Live Preview Improvements",
    description: "Real-time preview now updates instantly as the AI Builder writes code. Added support for responsive preview modes.",
    tag: "Feature",
  },
  {
    date: "February 5, 2026",
    title: "Custom Domain Support",
    description: "Pro and Enterprise users can now connect custom domains to their deployed applications with automatic SSL.",
    tag: "Feature",
  },
  {
    date: "January 28, 2026",
    title: "Sandbox Environment",
    description: "New isolated sandbox testing environment. Test your AI apps safely before deploying to production.",
    tag: "Feature",
  },
  {
    date: "January 15, 2026",
    title: "Performance Optimizations",
    description: "Improved AI Builder response times by 40%. Reduced deployment build times across all plans.",
    tag: "Improvement",
  },
]

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <h1 className="text-3xl font-bold text-foreground md:text-4xl">Changelog</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        The latest updates and improvements to NovaBuilder.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        {entries.map((entry, i) => (
          <article key={i} className="relative border-l-2 border-border pl-8">
            <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
            <time className="text-xs font-mono text-muted-foreground">{entry.date}</time>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {entry.tag}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
