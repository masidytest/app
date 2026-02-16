// Workspace members API — list, invite, remove, update role
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { z } from "zod"

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).optional().default("editor"),
})

const updateSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["admin", "editor", "viewer"]),
})

async function requireWorkspaceAdmin(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, role: { in: ["owner", "admin"] } },
  })
  return !!member
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { role: "asc" },
    })
    return NextResponse.json({ members })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch members", details: String(error) },
      { status: 500 }
    )
  }
}

// Invite member by email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = await requireWorkspaceAdmin(session.sub, workspaceId)
  if (!isAdmin) {
    return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 })
  }

  try {
    const { email, role } = inviteSchema.parse(await req.json())

    // Find or handle user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: "User not found. They must sign up first." },
        { status: 404 }
      )
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspaceId },
    })
    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 })
    }

    const member = await prisma.workspaceMember.create({
      data: { userId: user.id, workspaceId, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    return NextResponse.json({ member })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to invite member", details: String(error) },
      { status: 500 }
    )
  }
}

// Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = await requireWorkspaceAdmin(session.sub, workspaceId)
  if (!isAdmin) {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 })
  }

  try {
    const { memberId, role } = updateSchema.parse(await req.json())
    const member = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, email: true, name: true } } },
    })
    return NextResponse.json({ member })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update member", details: String(error) },
      { status: 500 }
    )
  }
}

// Remove member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = await requireWorkspaceAdmin(session.sub, workspaceId)
  if (!isAdmin) {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 })
  }

  try {
    const { memberId } = z.object({ memberId: z.string().min(1) }).parse(await req.json())

    // Don't let admin remove themselves if they're the only admin
    const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } })
    if (member?.userId === session.sub) {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: { in: ["owner", "admin"] } },
      })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 })
      }
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to remove member", details: String(error) },
      { status: 500 }
    )
  }
}
