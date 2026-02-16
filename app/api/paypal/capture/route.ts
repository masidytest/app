// Capture a PayPal order after user approval and credit the account
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { capturePayPalOrder, paypalConfigured } from "@/lib/paypal"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  if (!paypalConfigured) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const result = await capturePayPalOrder(orderId)

    if (result.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed", status: result.status }, { status: 400 })
    }

    // Parse the custom_id to get userId and package details
    let meta: { userId: string; packageId: string; messages: number }
    try {
      meta = JSON.parse(result.customId ?? "{}")
    } catch {
      return NextResponse.json({ error: "Invalid order metadata" }, { status: 400 })
    }

    // Verify the user matches
    if (meta.userId !== session.sub) {
      return NextResponse.json({ error: "Order does not belong to this user" }, { status: 403 })
    }

    // Credit the user's account
    await prisma.usageEvent.create({
      data: {
        userId: session.sub,
        type: "credit_purchase",
        amount: meta.messages,
      },
    })

    return NextResponse.json({ success: true, credits: meta.messages })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to capture order", details: String(error) },
      { status: 500 }
    )
  }
}
