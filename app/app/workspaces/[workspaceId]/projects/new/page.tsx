"use client"

import { use, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CreateProjectResponse = {
  project: {
    id: string
  }
}

export default function NewProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = use(params)
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError("Project name is required.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          workspaceId,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        const message = typeof payload?.error === "string" ? payload.error : "Failed to create project."
        throw new Error(message)
      }

      const data = (await res.json()) as CreateProjectResponse
      router.push(`/app/projects/${data.project.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Create New Project</CardTitle>
          <CardDescription>Start a new project inside this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. AI Support Portal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project about?"
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Project"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/app/workspaces/${workspaceId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
