// Create a PayPal one-time order for credit purchase
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createPayPalOrder, paypalConfigured } from "@/lib/paypal"
import { CREDIT_PACKAGES } from "@/lib/plans"

export async function POST(req: NextRequest) {
  if (!paypalConfigured) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { packageId } = await req.json()
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId)

    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 })
    }

    const origin = req.nextUrl.origin
    // Encode userId + packageId in custom_id so we can credit them after capture
    const customId = JSON.stringify({ userId: session.sub, packageId: pkg.id, messages: pkg.messages })

    const result = await createPayPalOrder(
      pkg.price,
      `Masidy ${pkg.label} credit pack`,
      customId,
      `${origin}/app/settings/billing?credits_order=CAPTURE_NEEDED`,
      `${origin}/app/settings/billing?credits_canceled=1`
    )

    return NextResponse.json({ url: result.approvalUrl, orderId: result.orderId })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create credit order", details: String(error) },
      { status: 500 }
    )
  }
}
