import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken, cookieName } from "@/lib/auth"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    })

    const token = await signToken({ sub: user.id, email: user.email, name: user.name })
    const res = NextResponse.json({ ok: true, workspaceId: membership?.workspaceId ?? null })
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
