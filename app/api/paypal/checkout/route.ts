// Create a PayPal subscription for plan upgrade
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createPayPalSubscription, paypalConfigured } from "@/lib/paypal"

export async function POST(req: NextRequest) {
  if (!paypalConfigured) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { planId } = await req.json()
    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 })
    }

    const origin = req.nextUrl.origin
    const result = await createPayPalSubscription(
      planId,
      session.sub,
      `${origin}/app/settings/billing?paypal_success=1`,
      `${origin}/app/settings/billing?paypal_canceled=1`
    )

    return NextResponse.json({ url: result.approvalUrl, subscriptionId: result.subscriptionId })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create PayPal subscription", details: String(error) },
      { status: 500 }
    )
  }
}
