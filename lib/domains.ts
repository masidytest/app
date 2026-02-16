// Domain management via Vercel Domains Registrar API v1 — branded as Masidy
const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""
}

function teamQueryAnd() {
  return VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ""
}

export const domainsConfigured = !!VERCEL_TOKEN

/** Check if a domain is available for purchase */
export async function checkDomainAvailability(name: string): Promise<{
  available: boolean
  price?: number
  period?: number
}> {
  if (!VERCEL_TOKEN) throw new Error("Domains not configured")

  const [statusRes, priceRes] = await Promise.all([
    fetch(
      `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(name)}/availability${teamQuery()}`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    ),
    fetch(
      `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(name)}/price${teamQuery()}`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    ),
  ])

  if (!statusRes.ok) {
    const err = await statusRes.text()
    throw new Error(`Availability check failed: ${err}`)
  }
  if (!priceRes.ok) {
    const err = await priceRes.text()
    throw new Error(`Price check failed: ${err}`)
  }

  const status = await statusRes.json()
  const price = await priceRes.json()

  return {
    available: status.available === true,
    price: price.purchasePrice ?? price.renewalPrice,
    period: price.years ?? 1,
  }
}

/** Purchase a domain via Vercel */
export async function purchaseDomain(
  name: string,
  contactInfo?: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address1: string
    city: string
    state: string
    zip: string
    country: string
  }
): Promise<{
  domain: string
  orderId: string
}> {
  if (!VERCEL_TOKEN) throw new Error("Domains not configured")

  // Get the price first
  const priceRes = await fetch(
    `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(name)}/price${teamQuery()}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  if (!priceRes.ok) throw new Error("Failed to get domain price")
  const priceData = await priceRes.json()

  const expectedPrice = priceData.purchasePrice ?? priceData.renewalPrice
  if (!expectedPrice) throw new Error("Domain price not available")

  const defaultContact = {
    firstName: "Masidy",
    lastName: "Admin",
    email: "admin@masidy.app",
    phone: "+1.0000000000",
    address1: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US",
  }

  const res = await fetch(
    `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(name)}/buy${teamQuery()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        autoRenew: true,
        years: priceData.years ?? 1,
        expectedPrice,
        contactInformation: contactInfo ?? defaultContact,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Domain purchase failed: ${err}`)
  }

  const data = await res.json()
  return { domain: name, orderId: data.orderId }
}

/** Add a domain to a Vercel project (for deployment) */
export async function addDomainToProject(
  projectId: string,
  domain: string
): Promise<{ name: string; configured: boolean }> {
  if (!VERCEL_TOKEN) throw new Error("Domains not configured")

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/domains${teamQuery()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to add domain: ${err}`)
  }

  const data = await res.json()
  return { name: data.name, configured: !!data.verified }
}

/** Remove a domain from a project */
export async function removeDomainFromProject(
  projectId: string,
  domain: string
): Promise<void> {
  if (!VERCEL_TOKEN) throw new Error("Domains not configured")

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}${teamQuery()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to remove domain: ${err}`)
  }
}

/** List all domains on the account */
export async function listDomains(): Promise<
  Array<{ name: string; expiresAt: string | null; createdAt: number }>
> {
  if (!VERCEL_TOKEN) throw new Error("Domains not configured")

  const res = await fetch(`https://api.vercel.com/v5/domains${teamQuery()}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })

  if (!res.ok) throw new Error("Failed to list domains")

  const data = await res.json()
  return (data.domains ?? []).map((d: Record<string, unknown>) => ({
    name: d.name as string,
    expiresAt: d.expiresAt as string | null,
    createdAt: d.createdAt as number,
  }))
}

/** Get domain info */
export async function getDomainInfo(domain: string): Promise<{
  name: string
  expiresAt: string | null
  verified: boolean
}> {
  if (!VERCEL_TOKEN) throw new Error("Domains not configured")

  const res = await fetch(
    `https://api.vercel.com/v6/domains/${domain}${teamQuery()}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  )

  if (!res.ok) throw new Error("Failed to get domain info")

  const data = await res.json()
  return {
    name: data.name,
    expiresAt: data.expiresAt ?? null,
    verified: data.verified ?? false,
  }
}
