"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SearchResult = {
  available: boolean
  price?: number
  period?: number
}

export function DomainSearch({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [buying, setBuying] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [purchased, setPurchased] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Handle return from PayPal — capture payment + purchase domain on Vercel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token") // PayPal order ID

    if (token && params.has("domain_order")) {
      setCapturing(true)
      fetch("/api/domains/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPurchased(data.domain)
            // Clean URL
            const url = new URL(window.location.href)
            url.searchParams.delete("token")
            url.searchParams.delete("domain_order")
            url.searchParams.delete("domain")
            url.searchParams.delete("projectId")
            url.searchParams.delete("PayerID")
            window.history.replaceState({}, "", url.toString())
          } else {
            setError(data.error || "Domain purchase failed")
          }
        })
        .catch(() => setError("Failed to complete domain purchase"))
        .finally(() => setCapturing(false))
    }
  }, [])

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`/api/domains/search?name=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch {
      setError("Failed to search domain")
    } finally {
      setSearching(false)
    }
  }

  async function handleBuy() {
    setBuying(true)
    setError(null)

    try {
      // Redirect to PayPal checkout for domain purchase
      const res = await fetch("/api/domains/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: query.trim(), projectId }),
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || "Failed to create checkout")
      }
    } catch {
      setError("Failed to start checkout")
    } finally {
      setBuying(false)
    }
  }

  if (capturing) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">Purchasing your domain... This may take a moment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a domain (e.g. myapp.com)"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={searching || !query.trim()}>
          {searching ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{query.trim()}</p>
              {result.available ? (
                <p className="text-xs text-primary">
                  Available — ${result.price}/year
                </p>
              ) : (
                <p className="text-xs text-destructive">Not available</p>
              )}
            </div>
            {result.available && (
              <Button onClick={handleBuy} disabled={buying} size="sm">
                {buying ? "Redirecting to PayPal..." : `Buy for $${result.price}/yr`}
              </Button>
            )}
          </div>
        </div>
      )}

      {purchased && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4">
          <p className="text-sm font-medium text-primary">
            {purchased} purchased and connected to your project!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            DNS may take a few minutes to propagate.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      )}
    </div>
  )
}

export function ConnectedDomains({
  domains,
  projectId,
}: {
  domains: Array<{ name: string; configured: boolean }>
  projectId: string
}) {
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleDisconnect(domain: string) {
    setRemoving(domain)
    try {
      await fetch("/api/domains/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, projectId, action: "disconnect" }),
      })
      window.location.reload()
    } finally {
      setRemoving(null)
    }
  }

  if (domains.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No custom domains connected. Search and buy a domain above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {domains.map((d) => (
        <div
          key={d.name}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{d.name}</p>
            <p className="text-xs text-muted-foreground">
              {d.configured ? "Active" : "Configuring..."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDisconnect(d.name)}
            disabled={removing === d.name}
            className="text-xs text-destructive hover:text-destructive"
          >
            {removing === d.name ? "Removing..." : "Disconnect"}
          </Button>
        </div>
      ))}
    </div>
  )
}
