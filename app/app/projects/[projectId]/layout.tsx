import { ProjectTabs } from "@/components/project/project-tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

const statusColors: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paused: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="bg-card/50 px-8 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/app" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
          <Badge
            variant="outline"
            className={cn("text-[10px]", statusColors[project.status] ?? statusColors.draft)}
          >
            {project.status}
          </Badge>
        </div>
      </div>
      <ProjectTabs projectId={projectId} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
