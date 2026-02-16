"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const EXAMPLES = [
  "A SaaS dashboard for tracking monthly subscriptions",
  "A landing page for a mobile fitness app with pricing",
  "A todo app with kanban board and dark mode",
  "An invoice generator with client management",
]

export function BuildPromptInput({ primaryWorkspaceId }: { primaryWorkspaceId: string }) {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleBuild() {
    const text = prompt.trim()
    if (!text) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: text.slice(0, 60),
          description: text,
          workspaceId: primaryWorkspaceId,
        }),
      })
      if (!res.ok) throw new Error("Failed to create project")
      const data = await res.json()
      const projectId: string = data.project.id
      localStorage.setItem("nova_autostart_prompt", text)
      router.push(`/app/projects/${projectId}/ide?autostart=1`)
    } catch {
      setError("Failed to create project. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Build something new</h2>
      </div>
      <div className="rounded-lg border border-border bg-card p-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleBuild()
            }
          }}
          placeholder="Describe what you want to build… e.g. 'A SaaS dashboard for tracking revenue'"
          rows={2}
          className="w-full resize-none rounded-md bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Press Enter or click to start building
            </p>
          )}
          <Button
            size="sm"
            className="ml-auto"
            onClick={handleBuild}
            disabled={!prompt.trim() || loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Build with AI
            {!loading && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {ex.length > 44 ? ex.slice(0, 44) + "…" : ex}
          </button>
        ))}
      </div>
    </div>
  )
}
