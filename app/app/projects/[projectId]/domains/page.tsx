import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { DomainSearch, ConnectedDomains } from "@/components/domains/domain-manager"

export default async function ProjectDomainsPage({
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
    include: {
      deployments: {
        where: { status: "live" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!project) notFound()

  // Get connected domains from deployment URLs
  const connectedDomains = project.deployments
    .filter((d) => d.url && !d.url.includes("masidy.app/api/preview"))
    .map((d) => ({
      name: d.url?.replace("https://", "") ?? "",
      configured: d.status === "live",
    }))

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Domains</CardTitle>
          <CardDescription>
            Search and buy a custom domain for your project. Powered by Masidy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DomainSearch projectId={projectId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Domains</CardTitle>
          <CardDescription>
            Domains currently linked to this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedDomains domains={connectedDomains} projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  )
}
