import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { SERVICE_TYPES } from "@/lib/managed-services"
import { ServiceCards } from "@/components/services/service-cards"
import { EnvVarsManager } from "@/components/services/env-vars-manager"

export default async function ProjectServicesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const session = await getSession()

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId: session?.sub ?? "" } } },
    },
    include: { services: true },
  })

  if (!project) notFound()

  const activeServices = project.services.map((s) => ({
    id: s.id,
    type: s.type,
    name: s.name,
    status: s.status,
  }))

  const serviceDefs = SERVICE_TYPES.map((s) => ({
    type: s.type,
    name: s.name,
    description: s.description,
    icon: s.icon,
  }))

  return (
    <div className="grid gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Masidy Services</CardTitle>
          <CardDescription>
            One-click infrastructure for your app. Enable what you need — databases, caching, storage, and authentication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceCards
            definitions={serviceDefs}
            active={activeServices}
            projectId={projectId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environment Variables</CardTitle>
          <CardDescription>
            Secrets and configuration for your deployments. These are encrypted and injected at build time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnvVarsManager projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  )
}
