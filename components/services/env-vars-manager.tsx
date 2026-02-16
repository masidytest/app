"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"

type EnvVar = {
  id: string
  key: string
  value: string
  target: string
}

export function EnvVarsManager({ projectId }: { projectId: string }) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/env`)
      .then((res) => res.json())
      .then((data) => setEnvVars(data.envVars ?? []))
      .finally(() => setLoading(false))
  }, [projectId])

  async function handleAdd() {
    if (!newKey.trim() || !newValue.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/env`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim().toUpperCase(), value: newValue }),
      })
      const data = await res.json()
      if (data.success) {
        setNewKey("")
        setNewValue("")
        // Refresh list
        const listRes = await fetch(`/api/projects/${projectId}/env`)
        const listData = await listRes.json()
        setEnvVars(listData.envVars ?? [])
      } else {
        setError(data.error || "Failed to add variable")
      }
    } catch {
      setError("Failed to add variable")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(key: string) {
    setDeleting(key)
    try {
      await fetch(`/api/projects/${projectId}/env`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
      setEnvVars((prev) => prev.filter((v) => v.key !== key))
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Add new env var */}
      <div className="flex gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          placeholder="KEY_NAME"
          className="font-mono text-xs"
        />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="value"
          type="password"
          className="font-mono text-xs"
        />
        <Button onClick={handleAdd} disabled={saving || !newKey.trim() || !newValue.trim()} size="sm">
          {saving ? "Adding..." : "Add"}
        </Button>
      </div>

      {/* List */}
      {envVars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No environment variables set. Add variables your deployed app needs.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {envVars.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <code className="text-xs font-semibold text-foreground">{v.key}</code>
                <code className="text-xs text-muted-foreground">{v.value}</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(v.key)}
                disabled={deleting === v.key}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
