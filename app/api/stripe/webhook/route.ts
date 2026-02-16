// Stripe webhook endpoint
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2023-10-16" }) : null

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    )
  }
  const sig = req.headers.get("stripe-signature")
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  // Handle event types
  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice
      // Example: update subscription status, track usage, etc.
      if (invoice.customer) {
        await prisma.usageEvent.create({
          data: {
            userId: invoice.customer as string,
            type: "payment_succeeded",
            amount: invoice.amount_paid,
          },
        })
      }
      break
    }
    // Add more event types as needed
    default:
      break
  }

  return NextResponse.json({ received: true })
}
