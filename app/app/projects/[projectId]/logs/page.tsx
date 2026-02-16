import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

const levelStyles: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default async function ProjectLogsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) notFound()

  const [deployments, messages] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.projectMessage.findMany({
      where: { projectId, role: "user" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  // Merge deployments + user messages into a unified log feed
  const logEntries = [
    ...deployments.map((dep) => ({
      id: dep.id,
      level: dep.status === "live" ? "info" : dep.status === "failed" ? "error" : "warn",
      message: `Deployment ${dep.status}: ${dep.url ?? dep.slug}`,
      timestamp: dep.createdAt,
    })),
    ...messages.map((msg) => ({
      id: msg.id,
      level: "info" as const,
      message: `User prompt: ${msg.content.slice(0, 120)}${msg.content.length > 120 ? "…" : ""}`,
      timestamp: msg.createdAt,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return (
    <div className="px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Logs</CardTitle>
          <CardDescription>Deployments and AI interactions for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {logEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity yet. Open the IDE and start building.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", levelStyles[entry.level])}>
                        {entry.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{entry.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
