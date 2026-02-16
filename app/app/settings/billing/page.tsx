import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { getPlan, CREDIT_PACKAGES } from "@/lib/plans"
import { UpgradeButton, ManageBillingButton } from "@/components/settings/upgrade-button"
import { BuyCreditsCard } from "@/components/settings/buy-credits"

export default async function BillingSettingsPage() {
  const session = await getSession()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [subscription, messageCount, creditsPurchased, projectCount] = await Promise.all([
    session?.sub
      ? prisma.subscription.findFirst({
          where: { userId: session.sub, status: "active" },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
    session?.sub
      ? prisma.usageEvent.count({
          where: {
            userId: session.sub,
            type: "ai_message",
            createdAt: { gte: monthStart },
          },
        })
      : Promise.resolve(0),
    session?.sub
      ? prisma.usageEvent.aggregate({
          where: {
            userId: session.sub,
            type: "credit_purchase",
            createdAt: { gte: monthStart },
          },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    session?.sub
      ? prisma.project.count({
          where: { workspace: { members: { some: { userId: session.sub } } } },
        })
      : Promise.resolve(0),
  ])

  const plan = getPlan(subscription?.plan)
  const hasSubscription = !!subscription
  const extraCredits = creditsPurchased._sum.amount ?? 0
  const totalLimit = plan.messagesPerMonth === Infinity ? Infinity : plan.messagesPerMonth + extraCredits
  const paypalProPlanId = process.env.PAYPAL_PRO_PLAN_ID ?? ""
  const paypalEnterprisePlanId = process.env.PAYPAL_ENTERPRISE_PLAN_ID ?? ""
  const hasPayment = !!paypalProPlanId
  const usagePercent = totalLimit === Infinity ? 0 : Math.round((messageCount / totalLimit) * 100)

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
              <p className="text-sm font-semibold text-foreground capitalize">{plan.label} Plan</p>
              <p className="text-xs text-muted-foreground">
                {subscription
                  ? `Since ${subscription.createdAt.toLocaleDateString()}`
                  : "No paid subscription"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                hasSubscription
                  ? "text-[10px] border-primary/30 text-primary"
                  : "text-[10px] border-muted text-muted-foreground"
              }
            >
              {hasSubscription ? "active" : "free"}
            </Badge>
          </div>

          {/* Usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI messages this month</span>
              <span>
                {messageCount.toLocaleString()} / {totalLimit === Infinity ? "∞" : totalLimit.toLocaleString()}
                {extraCredits > 0 && (
                  <span className="text-primary ml-1">(+{extraCredits.toLocaleString()} credits)</span>
                )}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Messages sent</p>
              <p className="mt-2 text-sm font-medium text-foreground">{messageCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Extra credits</p>
              <p className="mt-2 text-sm font-medium text-primary">{extraCredits.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Total projects</p>
              <p className="mt-2 text-sm font-medium text-foreground">{projectCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasSubscription ? (
              <ManageBillingButton />
            ) : (
              <>
                {paypalProPlanId && (
                  <UpgradeButton
                    paypalPlanId={paypalProPlanId}
                    label="Upgrade to Pro — $29/mo"
                  />
                )}
                {paypalEnterprisePlanId && (
                  <UpgradeButton
                    paypalPlanId={paypalEnterprisePlanId}
                    label="Enterprise — $99/mo"
                  />
                )}
                {!hasPayment && (
                  <p className="self-center text-xs text-muted-foreground">
                    Configure PayPal keys to enable upgrades.
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buy More Credits</CardTitle>
          <CardDescription>
            Running low? Purchase extra AI messages instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPayment ? (
            <BuyCreditsCard packages={CREDIT_PACKAGES} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Configure PayPal to enable credit purchases.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
          <CardDescription>Past invoices are managed through PayPal.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasSubscription ? (
            <ManageBillingButton />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
