"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Copy, Trash2, Check } from "lucide-react"
import { toast } from "sonner"

type ApiKey = {
  id: string
  name: string
  prefix: string
  scopes: string
  createdAt: string
}

export function ApiKeysManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState("read")
  const [creating, setCreating] = useState(false)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function createKey() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create key")
      setKeys((prev) => [
        { ...data.key, createdAt: data.key.createdAt },
        ...prev,
      ])
      setNewRawKey(data.rawKey)
      setName("")
      setScopes("read")
      toast.success("API key created — copy it now, it won't be shown again")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Delete this API key? It will stop working immediately.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success("API key deleted")
    } catch {
      toast.error("Failed to delete key")
    } finally {
      setDeletingId(null)
    }
  }

  function copyKey() {
    if (!newRawKey) return
    navigator.clipboard.writeText(newRawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Keys</CardTitle>
          <CardDescription>Keys used to access NovaBuilder APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {newRawKey && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <p className="text-xs font-medium text-emerald-400">
                Copy your new key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono text-foreground break-all">
                  {newRawKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setNewRawKey(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
              No API keys yet. Create one to start integrating.
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{key.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-xs text-muted-foreground font-mono">{key.prefix}…</code>
                    <Badge variant="outline" className="text-[10px]">{key.scopes}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive hover:text-destructive"
                  onClick={() => deleteKey(key.id)}
                  disabled={deletingId === key.id}
                >
                  {deletingId === key.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create New Key</CardTitle>
          <CardDescription>Generate a new API key for scripts or integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Key name</Label>
            <Input
              placeholder="e.g. CI/CD pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            <Input
              placeholder="read, write, admin"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
            />
          </div>
          <Button onClick={createKey} disabled={creating || !name.trim()}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create key
          </Button>
          <p className="text-xs text-muted-foreground">
            Keys are shown only once. Store them securely.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
