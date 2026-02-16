"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

type CreditPackage = {
  id: string
  messages: number
  price: number
  label: string
}

export function BuyCreditsCard({ packages }: { packages: CreditPackage[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)

  // Handle return from PayPal — capture the order
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token") // PayPal adds ?token=ORDER_ID on return

    if (token && params.has("credits_order")) {
      setCapturing(true)
      fetch("/api/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSuccess(data.credits)
            // Clean up URL
            const url = new URL(window.location.href)
            url.searchParams.delete("token")
            url.searchParams.delete("credits_order")
            url.searchParams.delete("PayerID")
            window.history.replaceState({}, "", url.toString())
          }
        })
        .finally(() => setCapturing(false))
    }
  }, [])

  async function handleBuy(packageId: string) {
    setLoading(packageId)
    try {
      const res = await fetch("/api/paypal/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  if (capturing) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">Processing your payment...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-center">
        <p className="text-sm font-medium text-primary">
          +{success.toLocaleString()} credits added to your account!
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => { setSuccess(null); window.location.reload() }}
        >
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {packages.map((pkg) => (
        <button
          key={pkg.id}
          onClick={() => handleBuy(pkg.id)}
          disabled={!!loading}
          className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-foreground">{pkg.label}</span>
          <span className="text-lg font-bold text-primary">${pkg.price}</span>
          <span className="text-[10px] text-muted-foreground">
            ${(pkg.price / pkg.messages).toFixed(3)}/msg
          </span>
          {loading === pkg.id && (
            <span className="text-xs text-muted-foreground">Redirecting...</span>
          )}
        </button>
      ))}
    </div>
  )
}
