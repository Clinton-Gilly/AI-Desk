"use client";

import { useQuery } from "convex/react";
import {
  CreditCard,
  TrendingUp,
  Building,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Phone,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBillingPage() {
  const stats = useQuery(api.admin.getOverviewStats);
  const workspaces = useQuery(api.admin.listWorkspaces);
  const mpesaTransactions = useQuery(api.admin.listAllMpesaTransactions);

  const isLoading = stats === undefined || workspaces === undefined || mpesaTransactions === undefined;

  // Filter workspaces with paid plans
  const paidSubscribers = workspaces?.filter(
    (ws) => ws.planSlug !== "free_org" && ws.subscriptionStatus !== "none"
  );

  const getPlanPrice = (plan: string) => {
    if (plan === "pro") return 49;
    if (plan === "scale") return 199;
    return 0;
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "scale":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "pro":
        return "bg-brand/10 text-brand border-brand/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "past_due":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "canceled":
      case "ended":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getMpesaStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "pending":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse";
      case "failed":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate stats
  const totalPaidSubs = paidSubscribers?.length ?? 0;
  const activeProCount = workspaces?.filter((w) => w.planSlug === "pro" && w.subscriptionStatus === "active").length ?? 0;
  const activeScaleCount = workspaces?.filter((w) => w.planSlug === "scale" && w.subscriptionStatus === "active").length ?? 0;

  // Workspace map for name lookup
  const workspaceMap = new Map(workspaces?.map((w) => [w._id, w.name]) ?? []);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
            Billing & Subscriptions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor recurring subscription distribution, plan cohorts, and estimated monthly MRR.
          </p>
        </div>
      </div>

      {/* Plan Cohorts Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Free Plan */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Free Tier Cohort
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.subscriptionStats.free_org}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspaces ($0 / mo)
            </p>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">
              Pro Tier Cohort
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-brand flex items-baseline gap-2">
              <span>{stats.subscriptionStats.pro}</span>
              <span className="text-xs font-medium text-muted-foreground">
                ({activeProCount} active)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspaces ($49 / mo) · MRR: ${(activeProCount * 49).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Scale Plan */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Scale Tier Cohort
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400 flex items-baseline gap-2">
              <span>{stats.subscriptionStats.scale}</span>
              <span className="text-xs font-medium text-muted-foreground">
                ({activeScaleCount} active)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspaces ($199 / mo) · MRR: ${(activeScaleCount * 199).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-red-500/10 text-red-500">
              <CreditCard className="size-4" />
            </span>
            <CardTitle className="text-lg">Subscription Directory</CardTitle>
          </div>
          <CardDescription>
            Audit active customer subscription contracts, billing states, and revenue contributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {totalPaidSubs === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <CreditCard className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground">No paid subscribers</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                All active workspaces are currently on the Free tier.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Plan Slug</TableHead>
                    <TableHead>Billing State</TableHead>
                    <TableHead>Contribution</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Conversations</TableHead>
                    <TableHead className="text-center">AI Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidSubscribers?.map((ws) => (
                    <TableRow key={ws._id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-foreground font-semibold">{ws.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {ws.slug || "no-slug"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-[10px] px-2 py-0.5 ${getPlanBadgeColor(ws.planSlug)}`}
                        >
                          {ws.planSlug}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-[10px] px-2 py-0.5 ${getStatusBadgeColor(ws.subscriptionStatus)}`}
                        >
                          {ws.subscriptionStatus === "active" ? "Active" : ws.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        ${getPlanPrice(ws.planSlug)}/mo
                      </TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {ws.membersCount}
                      </TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {ws.conversationsCount}
                      </TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {ws.aiMessagesCount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa Transactions Audit Card */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-500">
              <Phone className="size-4" />
            </span>
            <CardTitle className="text-lg">M-Pesa Transaction Logs</CardTitle>
          </div>
          <CardDescription>
            Audit M-Pesa STK Push transactions, Safaricom receipt IDs, and transaction statuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!mpesaTransactions || mpesaTransactions.length === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Phone className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground">No M-Pesa transactions</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                No M-Pesa billing logs are available in this environment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt / Error</TableHead>
                    <TableHead>Checkout Request ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mpesaTransactions.map((tx) => (
                    <TableRow key={tx._id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-foreground font-semibold">
                            {workspaceMap.get(tx.workspaceId) || "Unknown Workspace"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {tx.clerkOrgId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-foreground">
                        {tx.phoneNumber}
                      </TableCell>
                      <TableCell className="font-bold text-foreground whitespace-nowrap">
                        KES {tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-[10px] px-2 py-0.5 ${getPlanBadgeColor(tx.planSlug)}`}
                        >
                          {tx.planSlug}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-[10px] px-2 py-0.5 ${getMpesaStatusBadgeColor(tx.status)}`}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {tx.status === "completed" && tx.mpesaReceiptNumber ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            {tx.mpesaReceiptNumber}
                          </span>
                        ) : tx.status === "failed" && tx.error ? (
                          <span className="text-rose-600 dark:text-rose-400 break-words max-w-[200px] inline-block">
                            {tx.error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                        {tx.checkoutRequestID}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
