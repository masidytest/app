// Analytics API — aggregate usage events by day and type
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    // Daily message counts
    const events = await prisma.usageEvent.findMany({
      where: {
        userId: session.sub,
        type: "ai_message",
        createdAt: { gte: since },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    // Aggregate by day
    const dailyMap = new Map<string, number>()
    for (const e of events) {
      const day = e.createdAt.toISOString().slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
    }

    // Fill missing days with 0
    const daily: { date: string; messages: number }[] = []
    const cursor = new Date(since)
    const today = new Date()
    while (cursor <= today) {
      const day = cursor.toISOString().slice(0, 10)
      daily.push({ date: day, messages: dailyMap.get(day) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Per-project usage
    const projectMessages = await prisma.projectMessage.groupBy({
      by: ["projectId"],
      where: {
        project: { workspace: { members: { some: { userId: session.sub } } } },
        role: "user",
        createdAt: { gte: since },
      },
      _count: true,
      orderBy: { _count: { projectId: "desc" } },
      take: 10,
    })

    // Fetch project names
    const projectIds = projectMessages.map((p) => p.projectId)
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    })
    const projectNameMap = new Map(projects.map((p) => [p.id, p.name]))

    const perProject = projectMessages.map((p) => ({
      projectId: p.projectId,
      name: projectNameMap.get(p.projectId) ?? "Unknown",
      messages: p._count,
    }))

    // Total counts
    const totalMessages = events.length
    const totalProjects = await prisma.project.count({
      where: { workspace: { members: { some: { userId: session.sub } } } },
    })
    const totalDeployments = await prisma.deployment.count({
      where: { project: { workspace: { members: { some: { userId: session.sub } } } } },
    })

    return NextResponse.json({
      daily,
      perProject,
      totals: { messages: totalMessages, projects: totalProjects, deployments: totalDeployments },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: String(error) },
      { status: 500 }
    )
  }
}
