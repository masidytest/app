// Create a PayPal order for domain purchase — user pays you, then Vercel buys the domain
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createPayPalOrder, paypalConfigured } from "@/lib/paypal"
import { checkDomainAvailability, domainsConfigured } from "@/lib/domains"

const DOMAIN_MARKUP = Number(process.env.DOMAIN_MARKUP_PERCENT ?? "20") // 20% markup by default

export async function POST(req: NextRequest) {
  if (!paypalConfigured || !domainsConfigured) {
    return NextResponse.json({ error: "Payment or domains not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { domain, projectId } = await req.json()

    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 })
    }

    // Verify domain is still available and get real price
    const availability = await checkDomainAvailability(domain)
    if (!availability.available) {
      return NextResponse.json({ error: "Domain is no longer available" }, { status: 400 })
    }

    // Apply markup: Vercel charges you $X, you charge user $X + markup
    const vercelPrice = availability.price ?? 0
    const userPrice = Math.ceil(vercelPrice * (1 + DOMAIN_MARKUP / 100))

    const origin = req.nextUrl.origin
    const customId = JSON.stringify({
      userId: session.sub,
      domain,
      projectId: projectId ?? null,
      vercelPrice,
    })

    const result = await createPayPalOrder(
      userPrice,
      `Custom domain: ${domain}`,
      customId,
      `${origin}/app/projects/${projectId}/domains?domain_order=CAPTURE_NEEDED&domain=${encodeURIComponent(domain)}`,
      `${origin}/app/projects/${projectId}/domains?domain_canceled=1`
    )

    return NextResponse.json({
      url: result.approvalUrl,
      orderId: result.orderId,
      price: userPrice,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create domain checkout", details: String(error) },
      { status: 500 }
    )
  }
}
