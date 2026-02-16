// Edge-safe auth helpers — no Node.js APIs, compatible with middleware
import { jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "masidy-secret-key-change-in-production"
)
const COOKIE = "masidy_session"

export type SessionPayload = {
  sub: string
  email: string
  name: string | null
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export function cookieName() {
  return COOKIE
}
