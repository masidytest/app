import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { ProjectSettingsForm } from "@/components/project/project-settings-form"

type ConfigJson = {
  envVars?: Record<string, string>
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) notFound()

  const config = project.configJson as ConfigJson | null
  const envVarsObj = config?.envVars ?? {}
  const envVars = Object.entries(envVarsObj).map(([key, value]) => ({ key, value }))

  return (
    <ProjectSettingsForm
      projectId={projectId}
      initialName={project.name}
      initialDescription={project.description ?? ""}
      initialStatus={project.status}
      workspaceId={project.workspaceId}
      envVars={envVars}
    />
  )
}
