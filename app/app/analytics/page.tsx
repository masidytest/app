import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UsageCharts } from "@/components/analytics/usage-charts"

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session?.sub) redirect("/login")

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-lg font-semibold mb-1">Analytics</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Track your AI usage, project activity, and deployments.
      </p>
      <UsageCharts />
    </div>
  )
}
