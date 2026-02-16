// Search domain availability and price
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { checkDomainAvailability, domainsConfigured } from "@/lib/domains"

export async function GET(req: NextRequest) {
  if (!domainsConfigured) {
    return NextResponse.json({ error: "Domains not configured" }, { status: 500 })
  }

  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const name = req.nextUrl.searchParams.get("name")
  if (!name) {
    return NextResponse.json({ error: "name parameter is required" }, { status: 400 })
  }

  try {
    const result = await checkDomainAvailability(name)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check domain", details: String(error) },
      { status: 500 }
    )
  }
}
