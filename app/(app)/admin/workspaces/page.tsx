"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Building2,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  Calendar,
  Users,
  Bot,
  MessageSquare,
  BadgeAlert,
  Loader2,
  Clock,
  Sparkles,
  Globe,
  Info,
  Edit,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminWorkspacesPage() {
  const workspaces = useQuery(api.admin.listWorkspaces);
  const [search, setSearch] = useState("");
  const [selectedWsId, setSelectedWsId] = useState<Id<"workspaces"> | null>(null);

  // Filter workspaces based on search query
  const filtered = workspaces?.filter((ws) => {
    const queryStr = search.toLowerCase();
    return (
      ws.name.toLowerCase().includes(queryStr) ||
      ws.slug.toLowerCase().includes(queryStr) ||
      ws.clerkOrgId.toLowerCase().includes(queryStr) ||
      ws.ownerClerkUserId.toLowerCase().includes(queryStr)
    );
  });

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "scale":
        return "default"; // dark/blue
      case "pro":
        return "secondary"; // purple/amber
      default:
        return "outline"; // gray
    }
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

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
            Workspace Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage, audit, and inspect active customer support desks across the platform.
          </p>
        </div>
      </div>

      {/* Directory Content */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Showing {filtered?.length ?? 0} of {workspaces?.length ?? 0} workspaces
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {workspaces === undefined ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered?.length === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Building2 className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground">No workspaces found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                No active workspaces match your search criteria. Check spelling or try a different query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Conversations</TableHead>
                    <TableHead className="text-center">AI Messages</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((ws) => (
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
                          {ws.planSlug === "free_org" ? "Free" : ws.planSlug}
                        </Badge>
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
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground" />
                          {new Date(ws._creationTime).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-semibold px-2.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => setSelectedWsId(ws._id)}
                        >
                          <Eye className="size-3.5" />
                          Audit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Audit Modal */}
      {selectedWsId && (
        <WorkspaceAuditDialog
          workspaceId={selectedWsId}
          open={!!selectedWsId}
          onOpenChange={(open) => !open && setSelectedWsId(null)}
        />
      )}
    </div>
  );
}

// Sub-component for Workspace Details Dialog
function WorkspaceAuditDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: Id<"workspaces">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useQuery(api.admin.getWorkspaceDetail, { workspaceId });
  const manuallySetSub = useMutation(api.admin.manuallySetSubscription);

  // Subscription editing states
  const [isEditing, setIsEditing] = useState(false);
  const [overridePlan, setOverridePlan] = useState<string>("");
  const [overrideStatus, setOverrideStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edit state when detail loads
  const handleStartEdit = () => {
    if (detail) {
      setOverridePlan(detail.plan.planSlug);
      setOverrideStatus(detail.plan.status);
      setIsEditing(true);
    }
  };

  const handleSaveOverride = async () => {
    setIsSaving(true);
    try {
      await manuallySetSub({
        workspaceId,
        planSlug: overridePlan,
        status: overrideStatus,
      });
      toast.success("Subscription plan updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to override plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl border-border bg-card shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="size-5 text-red-500" />
            Workspace Audit Report
          </DialogTitle>
          <DialogDescription>
            Platform performance diagnostics, capability details, and team roster.
          </DialogDescription>
        </DialogHeader>

        {detail === undefined ? (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <Loader2 className="size-8 animate-spin text-brand" />
            <span className="text-xs text-muted-foreground font-medium">
              Generating report...
            </span>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* General Workspace Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 rounded-lg border p-3.5 bg-muted/20 flex flex-col justify-between min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Workspace Identity
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-0.5 break-words leading-snug">
                    {detail.workspace.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono break-all mt-2">
                    ID: {detail.workspace._id}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono break-all">
                    Clerk Org ID: {detail.workspace.clerkOrgId || "No clerk link"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase text-[9px]">AI Engine:</span>
                    <Badge variant="outline" className="text-[9px] font-bold py-0 bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/15 capitalize">
                      {detail.workspace.aiProvider}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border p-3.5 bg-muted/20 relative min-w-0">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Subscription Status
                </span>
                
                {isEditing ? (
                  <div className="space-y-2.5 mt-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Plan Tier</label>
                      <select
                        value={overridePlan}
                        onChange={(e) => setOverridePlan(e.target.value)}
                        className="w-full text-xs bg-background border rounded px-2 py-1 text-foreground"
                      >
                        <option value="free_org">Free</option>
                        <option value="pro">Pro</option>
                        <option value="scale">Scale</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                      <select
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value)}
                        className="w-full text-xs bg-background border rounded px-2 py-1 text-foreground"
                      >
                        <option value="active">Active</option>
                        <option value="past_due">Past Due</option>
                        <option value="canceled">Canceled</option>
                        <option value="ended">Ended</option>
                        <option value="none">None (Implicit Free)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={handleSaveOverride}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Save className="size-3 mr-1" />}
                        Save Override
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-bold"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        <X className="size-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold capitalize text-foreground break-words">
                        {detail.plan.planSlug === "free_org" ? "Free Plan" : `${detail.plan.planSlug} Plan`}
                      </span>
                      <Badge
                        variant={detail.plan.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] px-1.5 py-0 font-bold shrink-0 ${
                          detail.plan.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {detail.plan.status === "active" ? "Active" : detail.plan.status === "none" ? "Inactive" : detail.plan.status.replace("_", " ")}
                      </Badge>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 ml-auto hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={handleStartEdit}
                        title="Override Plan"
                      >
                        <Edit className="size-3" />
                      </Button>
                    </div>
                    {detail.plan.currentPeriodEnd && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Renewal: {new Date(detail.plan.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-normal mt-1.5">
                      AI Quota: {detail.plan.limits.aiMessagesPerMonth.toLocaleString()} messages/mo · Seats: {detail.plan.limits.seats} max
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* About this Organization Section */}
            <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-red-500 animate-pulse" />
                About this Organization
              </h4>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Primary Domain/Website</span>
                    {detail.stats.websiteDomain ? (
                      <a
                        href={`https://${detail.stats.websiteDomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand font-semibold hover:underline flex items-center gap-1 mt-0.5 break-all"
                      >
                        <Globe className="size-3.5 shrink-0" />
                        <span>{detail.stats.websiteDomain}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic mt-0.5">No web crawler source configured yet</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 min-w-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Helpdesk Categories</span>
                    {detail.stats.articleCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {detail.stats.articleCategories.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-[9px] py-0 px-1.5 font-semibold bg-muted text-muted-foreground">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic mt-0.5">No help articles published</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Capability Metrics & Active Features (Restructured Unified Panel) */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Knowledge Configuration & Capabilities
              </h4>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 text-xs">
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <span className="text-muted-foreground uppercase block text-[9px] font-bold tracking-wider">Articles</span>
                  <span className="text-xl font-bold block text-foreground mt-1">{detail.stats.totalArticles}</span>
                </div>
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <span className="text-muted-foreground uppercase block text-[9px] font-bold tracking-wider">Crawled Pages</span>
                  <span className="text-xl font-bold block text-foreground mt-1">{detail.stats.totalCrawledPages}</span>
                </div>
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <span className="text-muted-foreground uppercase block text-[9px] font-bold tracking-wider">Vector Chunks</span>
                  <span className="text-xl font-bold block text-foreground mt-1">{detail.stats.totalKnowledgeChunks}</span>
                </div>
                <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center ${detail.stats.proactiveMessageEnabled ? "bg-emerald-500/5 border-emerald-500/10" : "bg-muted/30"}`}>
                  <span className="font-bold text-muted-foreground text-[9px] uppercase tracking-wider">Proactive</span>
                  <Badge variant={detail.stats.proactiveMessageEnabled ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 font-bold mt-1.5">
                    {detail.stats.proactiveMessageEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>
                <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center ${detail.stats.faqEnabled ? "bg-emerald-500/5 border-emerald-500/10" : "bg-muted/30"}`}>
                  <span className="font-bold text-muted-foreground text-[9px] uppercase tracking-wider">FAQ Widget</span>
                  <Badge variant={detail.stats.faqEnabled ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 font-bold mt-1.5">
                    {detail.stats.faqEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity Metrics
              </h4>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <MessageSquare className="size-4 mx-auto text-orange-500 mb-1.5" />
                  <span className="text-xl font-bold block text-foreground">{detail.stats.totalConversations}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Conversations</span>
                </div>
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <Bot className="size-4 mx-auto text-red-500 mb-1.5" />
                  <span className="text-xl font-bold block text-foreground">{detail.stats.totalAiMessages}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">AI Replies</span>
                </div>
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <Users className="size-4 mx-auto text-amber-500 mb-1.5" />
                  <span className="text-xl font-bold block text-foreground">{detail.stats.totalHumanMessages}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Human Replies</span>
                </div>
                <div className="rounded-lg border p-3 text-center bg-card shadow-soft">
                  <Clock className="size-4 mx-auto text-muted-foreground mb-1.5" />
                  <span className="text-xl font-bold block text-foreground">{detail.stats.totalVisitorMessages}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Visitor Texts</span>
                </div>
              </div>
            </div>

            {/* Team Roster */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Team Roster ({detail.members.length})
              </h4>
              <div className="border rounded-lg overflow-hidden divide-y bg-card">
                {detail.members.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No members mirrored yet.
                  </div>
                ) : (
                  detail.members.map((m) => (
                    <div key={m.clerkUserId} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-7">
                          {m.imageUrl ? <AvatarImage src={m.imageUrl} /> : null}
                          <AvatarFallback className="bg-brand/10 text-[10px] font-bold text-brand">
                            {m.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="leading-tight truncate">
                          <span className="font-semibold text-foreground block truncate">{m.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{m.email}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px] shrink-0 font-medium px-1.5 py-0">
                        {m.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
