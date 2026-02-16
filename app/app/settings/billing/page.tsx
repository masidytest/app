import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export default async function BillingSettingsPage() {
  const session = await getSession()
  const [subscription, messageCount, projectCount] = await Promise.all([
    session?.sub
      ? prisma.subscription.findFirst({
          where: { userId: session.sub },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
    session?.sub
      ? prisma.projectMessage.count({
          where: { project: { workspace: { members: { some: { userId: session.sub } } } } },
        })
      : Promise.resolve(0),
    session?.sub
      ? prisma.project.count({
          where: { workspace: { members: { some: { userId: session.sub } } } },
        })
      : Promise.resolve(0),
  ])

  const planLabel = subscription?.plan ?? "Free"
  const statusLabel = subscription?.status ?? "free"

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
          <CardDescription>Your subscription and usage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">{planLabel} Plan</p>
              <p className="text-xs text-muted-foreground">
                {subscription
                  ? `Since ${subscription.createdAt.toLocaleDateString()}`
                  : "No paid subscription"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                statusLabel === "active"
                  ? "text-[10px] border-primary/30 text-primary"
                  : "text-[10px] border-muted text-muted-foreground"
              }
            >
              {statusLabel}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">AI messages sent</p>
              <p className="mt-2 text-sm font-medium text-foreground">{messageCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Total projects</p>
              <p className="mt-2 text-sm font-medium text-foreground">{projectCount}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled title="Stripe billing coming soon">
              Upgrade plan
            </Button>
            <p className="self-center text-xs text-muted-foreground">Stripe billing coming soon</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription>Billing integration is coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Stripe billing is not yet enabled.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Payment methods and invoices will appear here once billing is configured.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
          <CardDescription>Past invoices will appear here once billing is active.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No invoices yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
