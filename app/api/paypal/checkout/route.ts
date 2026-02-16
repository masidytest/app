// Create a PayPal subscription for plan upgrade
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createPayPalSubscription, paypalConfigured } from "@/lib/paypal"

const PLAN_MAP: Record<string, string | undefined> = {
  pro: process.env.PAYPAL_PRO_PLAN_ID,
  enterprise: process.env.PAYPAL_ENTERPRISE_PLAN_ID,
}

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

    // Map plan name to PayPal plan ID, or use raw ID if already a PayPal plan ID
    const paypalPlanId = PLAN_MAP[planId] ?? planId

    if (!paypalPlanId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const origin = req.nextUrl.origin
    const result = await createPayPalSubscription(
      paypalPlanId,
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
