import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z.string().default("read"),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true },
  })
  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = createSchema.parse(await req.json())

    // Generate a random API key: msd_<40 random hex chars>
    const raw = `msd_${randomBytes(20).toString("hex")}`
    const prefix = raw.slice(0, 8) // "msd_" + first 4 chars
    const keyHash = await bcrypt.hash(raw, 10)

    const key = await prisma.apiKey.create({
      data: {
        userId: session.sub,
        name: body.name,
        keyHash,
        prefix,
        scopes: body.scopes,
      },
    })

    // Return full key only once
    return NextResponse.json({
      key: { id: key.id, name: key.name, prefix: key.prefix, scopes: key.scopes, createdAt: key.createdAt },
      rawKey: raw,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await prisma.apiKey.deleteMany({ where: { id, userId: session.sub } })
  return NextResponse.json({ ok: true })
}
