"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function UpgradeButton({
  paypalPlanId,
  label,
}: {
  paypalPlanId: string
  label: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/paypal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: paypalPlanId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading}>
      {loading ? "Redirecting…" : label}
    </Button>
  )
}

export function ManageBillingButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.open("https://www.paypal.com/myaccount/autopay/", "_blank")}
    >
      Manage billing
    </Button>
  )
}
