// PayPal webhook — handles subscription lifecycle events
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPayPalSubscription, verifyPayPalWebhook, paypalConfigured } from "@/lib/paypal"

export const runtime = "nodejs"

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID

export async function POST(req: NextRequest) {
  if (!paypalConfigured) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 500 })
  }

  const body = await req.text()

  // Verify webhook signature if webhook ID is configured
  if (WEBHOOK_ID) {
    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => { headers[k] = v })

    const valid = await verifyPayPalWebhook(WEBHOOK_ID, headers, body)
    if (!valid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
    }
  }

  try {
    const event = JSON.parse(body)
    const eventType = event.event_type as string
    const resource = event.resource

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subscriptionId = resource.id
        const userId = resource.custom_id

        if (!userId) break

        // Fetch subscription details to determine plan
        const sub = await getPayPalSubscription(subscriptionId)
        const planId = sub.plan_id

        // Map PayPal plan ID to our plan names
        const plan = planId === process.env.PAYPAL_ENTERPRISE_PLAN_ID ? "enterprise" : "pro"

        await prisma.subscription.create({
          data: {
            userId,
            stripeId: `paypal_${subscriptionId}`, // Reuse stripeId field for PayPal
            plan,
            status: "active",
          },
        })
        break
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const subscriptionId = resource.id
        await prisma.subscription.updateMany({
          where: { stripeId: `paypal_${subscriptionId}` },
          data: { status: "canceled" },
        })
        break
      }

      case "BILLING.SUBSCRIPTION.UPDATED": {
        const subscriptionId = resource.id
        const status = resource.status === "ACTIVE" ? "active" : "canceled"
        await prisma.subscription.updateMany({
          where: { stripeId: `paypal_${subscriptionId}` },
          data: { status },
        })
        break
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Record usage event for payment
        const customId = resource.custom
        if (customId) {
          await prisma.usageEvent.create({
            data: {
              userId: customId,
              type: "payment_succeeded",
              amount: Math.round(parseFloat(resource.amount?.total ?? "0") * 100),
            },
          })
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed", details: String(error) },
      { status: 500 }
    )
  }
}
