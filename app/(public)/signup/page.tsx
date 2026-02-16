"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Zap, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("nova_pending_prompt")
    if (saved) setPendingPrompt(saved)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Signup failed"); return }

      // Check for a pending build prompt saved from the landing page
      const pendingPrompt = localStorage.getItem("nova_pending_prompt")
      const workspaceId: string | undefined = data.workspaceId

      if (pendingPrompt && workspaceId) {
        localStorage.removeItem("nova_pending_prompt")

        // Auto-create a project from the description
        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pendingPrompt.slice(0, 60),
            description: pendingPrompt,
            workspaceId,
          }),
        })

        if (projectRes.ok) {
          const projectData = await projectRes.json()
          const projectId: string = projectData.project.id
          // Save prompt for IDE to auto-start building
          localStorage.setItem("nova_autostart_prompt", pendingPrompt)
          router.push(`/app/projects/${projectId}/ide?autostart=1`)
          router.refresh()
          return
        }
      }

      router.push("/app")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {pendingPrompt ? "Sign up to start building your app" : "Start building AI apps in minutes"}
        </p>
        {pendingPrompt && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary mb-1">Your idea is saved</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{pendingPrompt}</p>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password <span className="text-muted-foreground text-xs">(min 8 characters)</span></Label>
            <Input id="password" type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <Button className="mt-2 w-full" type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}<Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
