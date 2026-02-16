// API key authentication — validates Bearer token against bcrypt-hashed keys
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import bcrypt from "bcryptjs"

export type AuthResult = {
  userId: string
  method: "session" | "apikey"
}

/**
 * Authenticate a request — tries session cookie first, then Bearer API key.
 * Returns null if unauthenticated.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult | null> {
  // Try session cookie first
  const session = await getSession()
  if (session?.sub) {
    return { userId: session.sub, method: "session" }
  }

  // Try Bearer API key
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  // API keys have format: msd_XXXX... — prefix is first 8 chars
  const prefix = token.slice(0, 8)

  const apiKey = await prisma.apiKey.findFirst({
    where: { prefix },
    include: { user: { select: { id: true } } },
  })

  if (!apiKey) return null

  // Verify bcrypt hash (matches how api-keys route stores them)
  const valid = await bcrypt.compare(token, apiKey.keyHash)
  if (!valid) return null

  return { userId: apiKey.user.id, method: "apikey" }
}
