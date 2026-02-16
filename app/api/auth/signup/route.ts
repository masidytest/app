import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken, cookieName } from "@/lib/auth"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await prisma.user.create({
      data: { email: body.email, name: body.name, passwordHash },
    })

    // Create a default workspace for the new user
    const workspace = await prisma.workspace.create({
      data: { name: `${body.name}'s Workspace`, plan: "free" },
    })
    await prisma.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
    })

    const token = await signToken({ sub: user.id, email: user.email, name: user.name })
    const res = NextResponse.json({ ok: true, workspaceId: workspace.id })
    res.cookies.set(cookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
