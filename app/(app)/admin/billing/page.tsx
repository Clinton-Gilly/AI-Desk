"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import {
  CreditCard,
  Phone,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  PackagePlus,
  Layers,
  TrendingUp,
  AlertTriangle,
  TicketPercent,
  Calendar,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type BillingPlan = {
  _id: Id<"billingPlans">;
  _creationTime: number;
  key: string;
  name: string;
  priceMonthly: number;
  priceYearly?: number;
  trialDays?: number;
  tagline: string;
  highlighted: boolean;
  features: string[];
  limits: {
    aiMessagesPerMonth: number;
    kbDocuments: number;
    crawlPages: number;
    seats: number;
    conversationsPerMonth?: number;
    dataRetentionDays?: number;
  };
};

const AVAILABLE_FEATURES = [
  { key: "ai_messages", label: "AI Messages" },
  { key: "website_crawl", label: "Website Crawl" },
  { key: "kb_documents", label: "KB Documents" },
  { key: "helpdesk", label: "Helpdesk" },
  { key: "proactive_messages", label: "Proactive Messages" },
  { key: "remove_branding", label: "Remove Branding" },
];

const DEFAULT_FORM = {
  key: "",
  name: "",
  priceMonthly: 0,
  priceYearly: 0,
  trialDays: 0,
  tagline: "",
  highlighted: false,
  features: [] as string[],
  limits: {
    aiMessagesPerMonth: 100,
    kbDocuments: 10,
    crawlPages: 0,
    seats: 2,
    conversationsPerMonth: 500,
    dataRetentionDays: 30,
  },
};

// ─── Plan Form Dialog ─────────────────────────────────────────────────────────
function PlanFormDialog({
  open,
  onClose,
  editingPlan,
}: {
  open: boolean;
  onClose: () => void;
  editingPlan: BillingPlan | null;
}) {
  const create = useMutation(api.plans.create);
  const update = useMutation(api.plans.update);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() =>
    editingPlan
      ? {
          key: editingPlan.key,
          name: editingPlan.name,
          priceMonthly: editingPlan.priceMonthly,
          priceYearly: editingPlan.priceYearly ?? 0,
          trialDays: editingPlan.trialDays ?? 0,
          tagline: editingPlan.tagline,
          highlighted: editingPlan.highlighted,
          features: [...editingPlan.features],
          limits: { ...editingPlan.limits },
        }
      : { ...DEFAULT_FORM, features: [], limits: { ...DEFAULT_FORM.limits } }
  );

  // Keep form in sync when editingPlan changes
  const [featureInput, setFeatureInput] = useState("");

  const toggleFeature = (featureKey: string) => {
    setForm((f) => ({
      ...f,
      features: f.features.includes(featureKey)
        ? f.features.filter((k) => k !== featureKey)
        : [...f.features, featureKey],
    }));
  };

  const addCustomFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed || form.features.includes(trimmed)) return;
    setForm((f) => ({ ...f, features: [...f.features, trimmed] }));
    setFeatureInput("");
  };

  const removeFeature = (feat: string) => {
    setForm((f) => ({ ...f, features: f.features.filter((k) => k !== feat) }));
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error("Plan key and name are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingPlan) {
        await update({ id: editingPlan._id, ...form });
        toast.success("Plan updated successfully.");
      } else {
        await create(form);
        toast.success("Plan created successfully.");
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          <DialogDescription>
            {editingPlan
              ? "Update this subscription plan's details, pricing, and features."
              : "Add a new subscription plan. Up to 10 plans are supported."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-key">Plan Key (slug)</Label>
              <Input
                id="plan-key"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                placeholder="e.g. pro, scale, enterprise"
                disabled={!!editingPlan}
              />
              {editingPlan && (
                <p className="text-xs text-muted-foreground">Key cannot be changed after creation.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Display Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Pro, Scale, Enterprise"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-tagline">Tagline</Label>
            <Input
              id="plan-tagline"
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              placeholder="Short description shown on the pricing page"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Price / Month (KES)</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                value={form.priceMonthly}
                onChange={(e) => setForm((f) => ({ ...f, priceMonthly: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-price-yearly">Price / Year (KES)</Label>
              <Input
                id="plan-price-yearly"
                type="number"
                min={0}
                value={form.priceYearly}
                onChange={(e) => setForm((f) => ({ ...f, priceYearly: Number(e.target.value) }))}
                placeholder="0 = no annual plan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-trial">Free Trial (Days)</Label>
              <Input
                id="plan-trial"
                type="number"
                min={0}
                value={form.trialDays}
                onChange={(e) => setForm((f) => ({ ...f, trialDays: Number(e.target.value) }))}
                placeholder="0 = no trial"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="plan-highlighted"
                checked={form.highlighted}
                onCheckedChange={(v) => setForm((f) => ({ ...f, highlighted: v }))}
              />
              <Label htmlFor="plan-highlighted" className="cursor-pointer">
                Mark as Popular / Highlighted
              </Label>
            </div>
          </div>

          {/* Limits */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Usage Limits</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { field: "aiMessagesPerMonth", label: "AI Messages/mo" },
                  { field: "kbDocuments", label: "KB Documents" },
                  { field: "crawlPages", label: "Crawl Pages" },
                  { field: "seats", label: "Team Seats" },
                  { field: "conversationsPerMonth", label: "Conversations/mo" },
                  { field: "dataRetentionDays", label: "Data Retention (Days)" },
                ] as const
              ).map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.limits[field]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        limits: { ...f.limits, [field]: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Features</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AVAILABLE_FEATURES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFeature(key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors text-left ${
                    form.features.includes(key)
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-card text-muted-foreground hover:border-brand/40"
                  }`}
                >
                  <div
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      form.features.includes(key) ? "border-brand bg-brand text-white" : "border-border"
                    }`}
                  >
                    {form.features.includes(key) && <Check className="size-2.5" />}
                  </div>
                  {label}
                </button>
              ))}
            </div>

            {/* Custom feature input */}
            <div className="mt-3 flex gap-2">
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomFeature())}
                placeholder="Add custom feature tag…"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomFeature}>
                Add
              </Button>
            </div>

            {/* Custom features pills */}
            {form.features.filter((f) => !AVAILABLE_FEATURES.some((af) => af.key === f)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.features
                  .filter((f) => !AVAILABLE_FEATURES.some((af) => af.key === f))
                  .map((feat) => (
                    <span
                      key={feat}
                      className="flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs text-brand"
                    >
                      {feat}
                      <button
                        type="button"
                        onClick={() => removeFeature(feat)}
                        className="hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {editingPlan ? "Save Changes" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: BillingPlan;
  onEdit: (p: BillingPlan) => void;
  onDelete: (p: BillingPlan) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const planColor =
    plan.key === "free_org"
      ? "text-muted-foreground"
      : plan.key === "pro"
      ? "text-brand"
      : plan.highlighted
      ? "text-purple-500"
      : "text-foreground";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-lg ${planColor}`}>{plan.name}</span>
            {plan.highlighted && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <Star className="size-2.5" />
                Popular
              </span>
            )}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {plan.key}
            </code>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{plan.tagline}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-foreground">
              KES {plan.priceMonthly.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onEdit(plan)}
            title="Edit plan"
          >
            <Pencil className="size-3.5" />
          </Button>
          {plan.key !== "free_org" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(plan)}
              title="Delete plan"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Limits summary */}
      <div className="border-t border-border bg-muted/20 px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">AI Messages</span>
          <span className="block font-semibold text-foreground">
            {plan.limits.aiMessagesPerMonth.toLocaleString()}/mo
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">KB Docs</span>
          <span className="block font-semibold text-foreground">{plan.limits.kbDocuments}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Crawl Pages</span>
          <span className="block font-semibold text-foreground">{plan.limits.crawlPages}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Seats</span>
          <span className="block font-semibold text-foreground">{plan.limits.seats}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Conversations</span>
          <span className="block font-semibold text-foreground">{plan.limits.conversationsPerMonth?.toLocaleString() ?? "Unlimited"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Retention</span>
          <span className="block font-semibold text-foreground">{plan.limits.dataRetentionDays === -1 ? "Unlimited" : `${plan.limits.dataRetentionDays} days`}</span>
        </div>
      </div>

      {/* Features toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <span>{plan.features.length} feature{plan.features.length !== 1 ? "s" : ""}</span>
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
              {plan.features.map((feat) => {
                const label = AVAILABLE_FEATURES.find((f) => f.key === feat)?.label ?? feat;
                return (
                  <span
                    key={feat}
                    className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-0.5 text-[11px] text-brand"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBillingPage() {
  const stats = useQuery(api.admin.getOverviewStats);
  const workspaces = useQuery(api.admin.listWorkspaces);
  const mpesaTransactions = useQuery(api.admin.listAllMpesaTransactions);
  const mrrHistory = useQuery(api.admin.getMrrHistory);
  const usageAlerts = useQuery(api.admin.getUsageAlerts);
  const coupons = useQuery(api.coupons.list);
  const plans = useQuery(api.plans.list);
  
  const removePlan = useMutation(api.plans.remove);
  const createCoupon = useMutation(api.coupons.create);
  const toggleCoupon = useMutation(api.coupons.toggle);
  const removeCoupon = useMutation(api.coupons.remove);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<BillingPlan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isLoading =
    stats === undefined ||
    workspaces === undefined ||
    mpesaTransactions === undefined ||
    plans === undefined ||
    mrrHistory === undefined ||
    usageAlerts === undefined ||
    coupons === undefined;

  // Filter workspaces with paid plans
  const paidSubscribers = workspaces?.filter(
    (ws) => ws.planSlug !== "free_org" && ws.subscriptionStatus !== "none"
  );

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

  const handleDeleteConfirm = async () => {
    if (!deletingPlan) return;
    setDeleteLoading(true);
    try {
      await removePlan({ id: deletingPlan._id });
      toast.success(`Plan "${deletingPlan.name}" deleted.`);
      setDeletingPlan(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete plan.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate stats
  const totalPaidSubs = paidSubscribers?.length ?? 0;
  const activeProCount =
    workspaces?.filter((w) => w.planSlug === "pro" && w.subscriptionStatus === "active").length ?? 0;
  const activeScaleCount =
    workspaces?.filter((w) => w.planSlug === "scale" && w.subscriptionStatus === "active").length ?? 0;

  // Workspace map for name lookup
  const workspaceMap = new Map(workspaces?.map((w) => [w._id, w.name]) ?? []);
  const planCount = plans?.length ?? 0;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8 bg-muted/10 min-h-screen pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
            Billing &amp; Subscriptions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage subscription plans, monitor recurring revenue, and audit M-Pesa transactions.
          </p>
        </div>
      </div>

      {/* Plan Cohorts Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
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
            <p className="mt-1 text-xs text-muted-foreground">Workspaces (KES 0 / mo)</p>
          </CardContent>
        </Card>

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
              Pro workspaces · MRR: KES{" "}
              {(
                activeProCount *
                (plans?.find((p) => p.key === "pro")?.priceMonthly ?? 6500)
              ).toLocaleString()}
            </p>
          </CardContent>
        </Card>

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
              Scale workspaces · MRR: KES{" "}
              {(
                activeScaleCount *
                (plans?.find((p) => p.key === "scale")?.priceMonthly ?? 26000)
              ).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── MRR & Usage Alerts ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* MRR Chart */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft sm:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="size-4" />
              </span>
              <CardTitle className="text-lg">MRR History</CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Monthly Recurring Revenue based on completed M-Pesa transactions (last 6 months).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mrrHistory?.length === 0 ? (
              <div className="h-48 grid place-items-center text-sm text-muted-foreground">
                No revenue data available
              </div>
            ) : (
              <div className="h-48 flex items-end gap-2 pt-4">
                {mrrHistory?.map((data, i) => {
                  const maxRev = Math.max(...(mrrHistory.map(d => d.revenue) || [1]));
                  const height = data.revenue > 0 ? Math.max((data.revenue / maxRev) * 100, 4) : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative w-full flex justify-center h-full items-end">
                        <div 
                          className="w-full max-w-12 bg-emerald-500/80 rounded-t-sm transition-all group-hover:bg-emerald-400"
                          style={{ height: `${height}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] py-1 px-2 rounded whitespace-nowrap pointer-events-none">
                          KES {data.revenue.toLocaleString()}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Alerts */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-amber-500/10 text-amber-500">
                <AlertTriangle className="size-4" />
              </span>
              <CardTitle className="text-lg">Usage Alerts</CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Workspaces approaching their AI message limits (&ge;80%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!usageAlerts || usageAlerts.length === 0 ? (
              <div className="h-48 grid place-items-center text-sm text-muted-foreground text-center">
                All workspaces are operating<br/>within safe limits.
              </div>
            ) : (
              <div className="space-y-3 h-48 overflow-y-auto pr-2">
                {usageAlerts.map((alert, i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm truncate pr-2">{alert.workspaceName}</span>
                      <Badge variant={alert.percent >= 100 ? "destructive" : "outline"} className={alert.percent < 100 ? "text-amber-500 border-amber-500/30 bg-amber-500/10" : ""}>
                        {alert.percent}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${alert.percent >= 100 ? "bg-destructive" : "bg-amber-500"}`} 
                        style={{ width: `${Math.min(alert.percent, 100)}%` }} 
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>{alert.used.toLocaleString()} msgs used</span>
                      <span>{alert.limit.toLocaleString()} limit</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Coupons Manager ────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-blue-500/10 text-blue-500">
                <TicketPercent className="size-4" />
              </span>
              <div>
                <CardTitle className="text-lg">Promo Codes &amp; Coupons</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Create discount codes for new signups or promotions.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                // Implement open coupon form
                const code = window.prompt("Enter Coupon Code (e.g. LAUNCH50)");
                if (!code) return;
                const discount = parseInt(window.prompt("Enter Discount Percent (1-100)", "50") || "0", 10);
                if (discount <= 0 || discount > 100) return toast.error("Invalid discount");
                const maxUses = parseInt(window.prompt("Enter Max Uses (0 = unlimited)", "0") || "0", 10);
                
                createCoupon({ code, discountPercent: discount, maxUses })
                  .then(() => toast.success("Coupon created!"))
                  .catch(e => toast.error(e.message));
              }}
              className="w-full sm:w-auto gap-1.5"
            >
              <Plus className="size-4" />
              Add Coupon
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!coupons || coupons.length === 0 ? (
            <div className="grid place-items-center py-8 text-center text-sm text-muted-foreground">
              No coupons created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon._id}>
                      <TableCell className="font-mono font-bold text-foreground">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {coupon.discountPercent}% OFF
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {coupon.usedCount} / {coupon.maxUses === 0 ? "∞" : coupon.maxUses}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={coupon.active}
                          onCheckedChange={(active) => toggleCoupon({ id: coupon._id, active })}
                          aria-label="Toggle coupon status"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (window.confirm("Delete this coupon?")) {
                              removeCoupon({ id: coupon._id });
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
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

      {/* ─── Plans Management ─────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-brand/10 text-brand">
                <Layers className="size-4" />
              </span>
              <div>
                <CardTitle className="text-lg">Subscription Plans</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Manage the plans available to users. Maximum 10 plans.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingPlan(null);
                setShowPlanForm(true);
              }}
              disabled={planCount >= 10}
              className="w-full sm:w-auto gap-1.5"
            >
              <Plus className="size-4" />
              {planCount >= 10 ? "Max 10 plans" : "Add Plan"}
            </Button>
          </div>

          {/* Slot indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-colors ${
                    i < planCount ? "bg-brand" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {planCount}/10 plans used
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {planCount === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <PackagePlus className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground">No plans yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Create your first subscription plan to get started.
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => {
                  setEditingPlan(null);
                  setShowPlanForm(true);
                }}
              >
                <Plus className="size-4" />
                Create First Plan
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {plans?.map((plan) => (
                  <PlanCard
                    key={plan._id}
                    plan={plan as BillingPlan}
                    onEdit={(p) => {
                      setEditingPlan(p);
                      setShowPlanForm(true);
                    }}
                    onDelete={(p) => setDeletingPlan(p)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Directory */}
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
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price/mo</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Conversations</TableHead>
                    <TableHead className="text-center">AI Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidSubscribers?.map((ws) => {
                    const planDef = plans?.find((p) => p.key === ws.planSlug);
                    return (
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
                            {planDef?.name ?? ws.planSlug}
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
                        <TableCell className="font-bold text-foreground whitespace-nowrap">
                          KES {(planDef?.priceMonthly ?? 0).toLocaleString()}/mo
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa Transactions Audit Card */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt / Error</TableHead>
                    <TableHead>Checkout ID</TableHead>
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
                          {plans?.find((p) => p.key === tx.planSlug)?.name ?? tx.planSlug}
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

      {/* Plan Form Dialog */}
      {showPlanForm && (
        <PlanFormDialog
          open={showPlanForm}
          onClose={() => {
            setShowPlanForm(false);
            setEditingPlan(null);
          }}
          editingPlan={editingPlan}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(v) => !v && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deletingPlan?.name}&quot; plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the <strong>{deletingPlan?.name}</strong> plan. Workspaces
              currently on this plan will fall back to defaults on their next billing cycle. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
