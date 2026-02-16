import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { AccountSettingsForm } from "@/components/settings/account-settings-form"

export default async function AccountSettingsPage() {
  const session = await getSession()
  const user = session?.sub
    ? await prisma.user.findUnique({ where: { id: session.sub } })
    : null

  return (
    <AccountSettingsForm
      initialName={user?.name ?? ""}
      initialEmail={user?.email ?? ""}
    />
  )
}
