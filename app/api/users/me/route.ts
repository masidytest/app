import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { z } from "zod"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.sub },
    select: { workspaceId: true },
  })

  return NextResponse.json({
    user: { id: session.sub, email: session.email, name: session.name },
    primaryWorkspaceId: membership?.workspaceId ?? null,
  })
}

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()

    // Password change request
    if (body.currentPassword && body.newPassword) {
      const { currentPassword, newPassword } = passwordSchema.parse(body)
      const user = await prisma.user.findUnique({ where: { id: session.sub } })
      if (!user?.passwordHash) return NextResponse.json({ error: "No password set" }, { status: 400 })

      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })

      const hash = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({ where: { id: session.sub }, data: { passwordHash: hash } })
      return NextResponse.json({ ok: true })
    }

    // Profile update
    const { name, email } = profileSchema.parse(body)
    const updated = await prisma.user.update({
      where: { id: session.sub },
      data: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
    })
    return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
