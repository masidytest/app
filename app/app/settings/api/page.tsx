import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { ApiKeysManager } from "@/components/settings/api-keys-manager"

export default async function ApiSettingsPage() {
  const session = await getSession()
  const keys = session?.sub
    ? await prisma.apiKey.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, prefix: true, scopes: true, createdAt: true },
      })
    : []

  return (
    <ApiKeysManager
      initialKeys={keys.map((k) => ({ ...k, createdAt: k.createdAt.toISOString() }))}
    />
  )
}
