// Capture PayPal payment, then purchase domain via Vercel and connect to project
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { purchaseDomain, addDomainToProject, domainsConfigured } from "@/lib/domains"
import { capturePayPalOrder, paypalConfigured } from "@/lib/paypal"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  if (!domainsConfigured || !paypalConfigured) {
    return NextResponse.json({ error: "Domains or payment not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required (PayPal payment must be completed first)" }, { status: 400 })
    }

    // Step 1: Capture the PayPal payment
    const capture = await capturePayPalOrder(orderId)
    if (capture.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed", status: capture.status }, { status: 400 })
    }

    // Step 2: Parse order metadata
    let meta: { userId: string; domain: string; projectId: string | null }
    try {
      meta = JSON.parse(capture.customId ?? "{}")
    } catch {
      return NextResponse.json({ error: "Invalid order metadata" }, { status: 400 })
    }

    if (meta.userId !== session.sub) {
      return NextResponse.json({ error: "Order does not belong to this user" }, { status: 403 })
    }

    // Step 3: Purchase the domain on Vercel (billed to your Vercel account)
    await purchaseDomain(meta.domain)

    // Step 4: Connect domain to project if specified
    if (meta.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: meta.projectId,
          workspace: { members: { some: { userId: session.sub } } },
        },
      })

      if (project) {
        await addDomainToProject(process.env.VERCEL_PROJECT_ID ?? "", meta.domain)
      }
    }

    // Step 5: Record the purchase
    await prisma.usageEvent.create({
      data: {
        userId: session.sub,
        type: "domain_purchase",
        amount: 1,
      },
    })

    return NextResponse.json({ success: true, domain: meta.domain })
  } catch (error) {
    return NextResponse.json(
      { error: "Domain purchase failed", details: String(error) },
      { status: 500 }
    )
  }
}
