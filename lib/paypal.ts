// PayPal REST API integration — no deprecated SDK, just fetch
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY
const PAYPAL_MODE = process.env.PAYPAL_MODE ?? "sandbox"

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"

export const paypalConfigured = !!(PAYPAL_CLIENT_ID && PAYPAL_SECRET_KEY)

/** Get an OAuth2 access token from PayPal */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString("base64")

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

/** Create a PayPal subscription */
export async function createPayPalSubscription(
  planId: string,
  userId: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId,
      application_context: {
        brand_name: "Masidy",
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal subscription create failed: ${err}`)
  }

  const data = await res.json()
  const approvalLink = data.links?.find((l: { rel: string }) => l.rel === "approve")

  return {
    subscriptionId: data.id,
    approvalUrl: approvalLink?.href ?? "",
  }
}

/** Get subscription details */
export async function getPayPalSubscription(subscriptionId: string) {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`PayPal subscription fetch failed: ${res.status}`)
  return res.json()
}

/** Cancel a subscription */
export async function cancelPayPalSubscription(subscriptionId: string, reason?: string) {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: reason ?? "User requested cancellation" }),
  })

  if (!res.ok) throw new Error(`PayPal cancel failed: ${res.status}`)
}

/** Verify a webhook signature */
export async function verifyPayPalWebhook(
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook_id: webhookId,
      transmission_id: headers["paypal-transmission-id"],
      transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"],
      auth_algo: headers["paypal-auth-algo"],
      transmission_sig: headers["paypal-transmission-sig"],
      webhook_event: JSON.parse(body),
    }),
  })

  if (!res.ok) return false
  const data = await res.json()
  return data.verification_status === "SUCCESS"
}

/** Create a one-time PayPal order (for credit purchases) */
export async function createPayPalOrder(
  amount: number,
  description: string,
  customId: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amount.toFixed(2) },
          description,
          custom_id: customId,
        },
      ],
      application_context: {
        brand_name: "Masidy",
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal order create failed: ${err}`)
  }

  const data = await res.json()
  const approvalLink = data.links?.find((l: { rel: string }) => l.rel === "approve")

  return {
    orderId: data.id,
    approvalUrl: approvalLink?.href ?? "",
  }
}

/** Capture a PayPal order after user approval */
export async function capturePayPalOrder(orderId: string): Promise<{
  status: string
  customId?: string
}> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal capture failed: ${err}`)
  }

  const data = await res.json()
  const customId = data.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id

  return { status: data.status, customId }
}

/** Get the PayPal client ID for frontend use */
export function getPayPalClientId(): string | null {
  return PAYPAL_CLIENT_ID ?? null
}
