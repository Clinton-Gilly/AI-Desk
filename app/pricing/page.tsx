"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Check, X, ArrowLeft, ArrowRight, Sparkles, Loader2, Phone, Zap, ShieldAlert } from "lucide-react";
import { PricingTable, Show } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/reveal";
import { BrandMark } from "@/app/_components/brand-mark";
import { PLAN_DISPLAY_LIST } from "@/lib/planDisplay";
import { PLANS, type Feature, type PlanSlug } from "@/convex/lib/plans";

// ─────────────────────────────────────────────────────────────────────────────
// Public pricing page (NOT under (app); no Clerk gating to view — see
// app/pricing/layout.tsx for the ClerkProvider wrapper that enables the billing
// components). Layers, top to bottom:
//
//   1. Bespoke plan cards (from lib/planDisplay.ts → convex/lib/plans.ts) for a
//      branded marketing layout, each with a per-plan <CheckoutButton
//      for="organization"> wrapped in <Show when="signed-in">. The checkout
//      drawer is Clerk's; we pass the plan id from a PUBLIC env var so the
//      dev-vs-prod `cplan_…` ids are never hardcoded (build-context rule).
//      Signed-out visitors see a "Sign in to subscribe" CTA instead.
//
//   2. A feature-comparison table (display-only, derived from PLANS).
//
//   3. Clerk's <PricingTable for="organization"> — the canonical, config-driven
//      org checkout (no plan ids needed; reads Clerk Dashboard plans directly).
//      This is the reliable path even if the env ids are unset.
//
//   4. A pricing FAQ accordion.
//
// The Clerk billing components (PricingTable / CheckoutButton / Show) are the
// working monetization path — this file only polishes layout/visuals around
// them; it must not change their behavior.
// ─────────────────────────────────────────────────────────────────────────────

// Optional public plan-id map (dev vs prod differ — never hardcode the cplan_…).
// When unset, the per-card CheckoutButton is skipped and we fall back to the
// <PricingTable> below + a link to the dashboard billing page.
const PUBLIC_PLAN_IDS: Record<PlanSlug, string | undefined> = {
  free_org: process.env.NEXT_PUBLIC_CLERK_PLAN_FREE_ID,
  pro: process.env.NEXT_PUBLIC_CLERK_PLAN_PRO_ID,
  scale: process.env.NEXT_PUBLIC_CLERK_PLAN_SCALE_ID,
};

export default function PricingPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch plans from DB; fall back to static PLAN_DISPLAY_LIST if empty
  const dbPlans = useQuery(api.plans.list);
  const planDisplayList = useMemo(() => {
    if (!dbPlans || dbPlans.length === 0) return PLAN_DISPLAY_LIST;
    // Map DB plans to PlanDisplay shape, keeping all 3 legacy slugs ordered
    const ordered = ["free_org", "pro", "scale"];
    const sorted = [...dbPlans].sort(
      (a, b) => ordered.indexOf(a.key) - ordered.indexOf(b.key)
    );
    return sorted.map((p) => ({
      slug: p.key as PlanSlug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      trialDays: p.trialDays,
      tagline: p.tagline,
      highlighted: p.highlighted,
      def: PLANS[p.key as PlanSlug] ?? PLANS.free_org,
      bullets: [
        `${p.limits.aiMessagesPerMonth.toLocaleString()} AI messages / month`,
        `${p.limits.seats} ${p.limits.seats === 1 ? "seat" : "seats"}`,
        `${p.limits.kbDocuments.toLocaleString()} knowledge base documents`,
        ...(p.limits.crawlPages > 0
          ? [`Crawl up to ${p.limits.crawlPages.toLocaleString()} pages`]
          : []),
      ],
    }));
  }, [dbPlans]);

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <PricingHeader />

      {/* ── Dark gradient hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        {/* Aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-aurora absolute -top-32 left-[15%] size-[30rem] rounded-full bg-brand/40 blur-[130px]" />
          <div
            className="animate-aurora absolute -top-10 right-[8%] size-[26rem] rounded-full bg-brand-2/30 blur-[130px]"
            style={{ animationDelay: "-6s" }}
          />
        </div>
        {/* Dotgrid texture */}
        <div
          aria-hidden
          className="bg-dotgrid pointer-events-none absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(60%_55%_at_50%_30%,black,transparent)]"
        />
        <div
          aria-hidden
          className="grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        />
        {/* Fade into the light section below */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
        />

        <div className="relative mx-auto w-full max-w-6xl px-6 pt-32 pb-44 text-center sm:pt-40">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
            <Sparkles className="size-3.5 text-brand-2" />
            Simple, transparent pricing
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Plans that scale with your{" "}
            <span className="text-gradient font-display text-[1.08em] font-normal italic">
              support
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/65">
            Start free. Upgrade when you need crawling, proactive messages, and
            higher AI quotas. Billed per organization — no surprise overages.
          </p>
          <div className="mx-auto mt-10 flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/5 p-2 backdrop-blur sm:mt-12">
            <span className={!isAnnual ? "text-sm font-semibold text-white px-2" : "text-sm font-medium text-white/60 px-2 cursor-pointer"} onClick={() => setIsAnnual(false)}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-brand-2" />
            <span className={isAnnual ? "text-sm font-semibold text-white px-2" : "text-sm font-medium text-white/60 px-2 cursor-pointer"} onClick={() => setIsAnnual(true)}>
              Yearly <span className="ml-1 rounded bg-brand/20 px-1.5 py-0.5 text-[10px] uppercase text-brand-2">Save 2 months</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Branded plan cards (pulled up over the hero fade) ───────────────── */}
      <section className="relative z-10 mx-auto -mt-28 w-full max-w-6xl px-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {planDisplayList.map((plan, i) => {
            const planId = PUBLIC_PLAN_IDS[plan.slug];
            const allFeatures = plan.def?.features ?? [];
            return (
              <Reveal key={plan.slug} delay={i * 0.08} className="h-full">
                <Card
                  className={
                    plan.highlighted
                      ? "border-brand/40 relative flex h-full flex-col overflow-visible rounded-3xl bg-card p-2 shadow-elevated ring-2 ring-brand/30 lg:-translate-y-3"
                      : "relative flex h-full flex-col rounded-3xl border-border bg-card p-2 shadow-card transition-shadow hover:shadow-elevated"
                  }
                >
                  {plan.highlighted && (
                    <>
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-gradient-to-br from-brand/20 to-brand-2/20 blur-md"
                      />
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1.5 bg-gradient-to-br from-brand to-brand-2 px-3 text-white shadow-[0_8px_24px_-8px_var(--brand)]">
                        <Sparkles className="size-3" />
                        Most popular
                      </Badge>
                    </>
                  )}
                  <CardHeader className="gap-1.5 px-5 pt-6">
                    <CardTitle className="text-base font-semibold tracking-tight">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-pretty">
                      {plan.tagline}
                    </CardDescription>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-5xl font-semibold tracking-tight">
                        KES {(isAnnual && plan.priceYearly ? plan.priceYearly / 12 : plan.priceMonthly).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /month {isAnnual && plan.priceYearly ? "billed yearly" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-5">
                    <div className="my-1 h-px bg-border" />
                    <ul className="mt-4 space-y-3 text-sm">
                      {plan.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                            <Check className="size-3" />
                          </span>
                          <span className="leading-snug">{bullet}</span>
                        </li>
                      ))}
                      {(["website_crawl", "proactive_messages", "remove_branding"] as const)
                        .filter((f) => !allFeatures.includes(f as Feature))
                        .map((f) => (
                          <li
                            key={f}
                            className="text-muted-foreground flex items-start gap-2.5"
                          >
                            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted">
                              <X className="size-3" />
                            </span>
                            <span className="leading-snug line-through">
                              {FEATURE_LABEL[f]}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="px-5 pb-6">
                    <PlanCta
                      planSlug={plan.slug}
                      planId={planId}
                      isFree={plan.priceMonthly === 0}
                      highlighted={plan.highlighted}
                      price={isAnnual && plan.priceYearly ? plan.priceYearly : plan.priceMonthly}
                      isAnnual={isAnnual}
                      trialDays={plan.trialDays}
                    />
                  </CardFooter>
                </Card>
              </Reveal>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-8 text-center text-sm">
          No credit card required for the Free plan · Cancel anytime
        </p>
      </section>

      {/* Feature comparison (display-only, derived from PLANS). */}
      <ComparisonTable />

      {/* Canonical Clerk org checkout (config-driven, no plan ids needed). */}
      <section className="mx-auto w-full max-w-6xl px-6">
        <Reveal className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-10">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-tight text-brand">
              Checkout
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Subscribe your{" "}
              <span className="font-display italic font-normal">
                organization
              </span>
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty">
              Pick a plan below to start checkout. You&apos;ll need an active
              organization — sign in and select one first.
            </p>
          </div>
          {isMounted && (
            <PricingTable
              for="organization"
              newSubscriptionRedirectUrl="/dashboard/billing"
            />
          )}
        </Reveal>
      </section>

      {/* Pricing FAQ. */}
      <PricingFaq />
    </main>
  );
}

// ── Top nav ──────────────────────────────────────────────────────────────────
// Simple branded bar with the wordmark, a back-to-home link, and a primary CTA.
// Sits over the dark hero, so text is light.
function PricingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="MyChat home">
          <BrandMark wordClassName="text-white" />
        </Link>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Link href="/">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back to home</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="group rounded-full bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_6px_20px_-6px_var(--brand)] hover:opacity-95"
          >
            <Link href="/sign-up">
              Start free
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// Human labels for the three "comparison" features used across the page.
const FEATURE_LABEL: Record<
  "website_crawl" | "proactive_messages" | "remove_branding",
  string
> = {
  website_crawl: "Website crawler",
  proactive_messages: "Proactive messages",
  remove_branding: "Remove branding",
};

// ── Comparison table ─────────────────────────────────────────────────────────
// Rows are derived from the canonical PLANS definitions so the table can never
// drift from what Convex actually enforces.
function ComparisonTable() {
  const plans = PLAN_DISPLAY_LIST;

  const limitRows: { label: string; value: (slug: PlanSlug) => string }[] = [
    {
      label: "AI messages / month",
      value: (s) => PLANS[s].limits.aiMessagesPerMonth.toLocaleString(),
    },
    { label: "Team seats", value: (s) => String(PLANS[s].limits.seats) },
    {
      label: "Knowledge base documents",
      value: (s) => PLANS[s].limits.kbDocuments.toLocaleString(),
    },
    {
      label: "Crawlable pages",
      value: (s) =>
        PLANS[s].limits.crawlPages > 0
          ? PLANS[s].limits.crawlPages.toLocaleString()
          : "—",
    },
  ];

  const featureRows: { label: string; feature: Feature }[] = [
    { label: "AI-powered replies", feature: "ai_messages" },
    { label: "Help center / articles", feature: "helpdesk" },
    { label: "Website crawler", feature: "website_crawl" },
    { label: "Proactive messages", feature: "proactive_messages" },
    { label: "Remove branding", feature: "remove_branding" },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
      <Reveal className="mx-auto mb-12 max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-tight text-brand">
          Side by side
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Compare every{" "}
          <span className="font-display italic font-normal">plan</span>
        </h2>
        <p className="text-muted-foreground mt-3 text-pretty">
          Every limit and feature, laid out so you can pick with confidence.
        </p>
      </Reveal>

      <Reveal className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Feature
              </th>
              {plans.map((p) => (
                <th
                  key={p.slug}
                  className={
                    "px-5 py-5 text-center" +
                    (p.highlighted ? " bg-brand/[0.04]" : "")
                  }
                >
                  <span
                    className={
                      "block text-sm font-semibold tracking-tight" +
                      (p.highlighted ? " text-brand" : "")
                    }
                  >
                    {p.name}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                    KES {p.priceMonthly.toLocaleString()}/mo
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionRow label="Limits" span={plans.length + 1} />
            {limitRows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
              >
                <td className="px-5 py-3.5 text-left font-medium">
                  {row.label}
                </td>
                {plans.map((p) => (
                  <td
                    key={p.slug}
                    className={
                      "px-5 py-3.5 text-center tabular-nums" +
                      (p.highlighted ? " bg-brand/[0.03]" : "")
                    }
                  >
                    {row.value(p.slug)}
                  </td>
                ))}
              </tr>
            ))}
            <SectionRow label="Features" span={plans.length + 1} />
            {featureRows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
              >
                <td className="px-5 py-3.5 text-left font-medium">
                  {row.label}
                </td>
                {plans.map((p) => {
                  const has = PLANS[p.slug].features.includes(row.feature);
                  return (
                    <td
                      key={p.slug}
                      className={
                        "px-5 py-3.5 text-center" +
                        (p.highlighted ? " bg-brand/[0.03]" : "")
                      }
                    >
                      {has ? (
                        <span className="mx-auto flex size-5 items-center justify-center rounded-full bg-brand/10 text-brand">
                          <Check className="size-3.5" aria-label="Included" />
                        </span>
                      ) : (
                        <X
                          className="text-muted-foreground/40 mx-auto size-4"
                          aria-label="Not included"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <tr className="bg-muted/40">
      <td
        colSpan={span}
        className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Is there really a free plan?",
    a: "Yes. The Free plan includes 100 AI messages per month, 2 seats, a 10-document knowledge base, the help center, and the fully embeddable widget — no credit card required.",
  },
  {
    q: "How does billing work?",
    a: "Plans are billed per organization, monthly. Checkout and invoicing run through Clerk Billing — upgrade, downgrade, or cancel anytime from your dashboard billing page.",
  },
  {
    q: "What counts as an AI message?",
    a: "Each automated reply the AI agent generates for a visitor counts as one AI message against your monthly quota. Replies sent by your human team don't count.",
  },
  {
    q: "Can I remove the “Powered by MyChat” branding?",
    a: "Yes — the Pro and Scale plans remove the branding footer from your widget. The Free plan keeps a small, themed attribution link.",
  },
  {
    q: "What happens if I hit my plan limits?",
    a: "We never charge surprise overages. When you approach a limit you'll be prompted to upgrade; the AI gracefully hands conversations to your team until you do.",
  },
  {
    q: "Can I change plans later?",
    a: "Absolutely. Upgrade or downgrade whenever you like — changes take effect immediately and your knowledge base, settings, and conversations all carry over.",
  },
] as const;

function PricingFaq() {
  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-6 py-24 sm:py-28">
        <Reveal className="mb-12 text-center">
          <p className="text-sm font-semibold tracking-tight text-brand">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Frequently asked{" "}
            <span className="font-display italic font-normal">questions</span>
          </h2>
          <p className="text-muted-foreground mt-3 text-pretty">
            Everything else you might be wondering.
          </p>
        </Reveal>
        <Reveal>
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border bg-card px-5 shadow-card sm:px-6"
          >
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 text-sm leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* ── Final CTA (brand gradient band, mirrors the landing page) ──────── */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:pb-32">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-brand to-brand-2 px-8 py-16 text-center text-white sm:px-16 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(40rem 22rem at 80% -10%, rgba(255,255,255,0.4), transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="grain pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          />
          <h3 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to get{" "}
            <span className="font-display italic font-normal">started?</span>
          </h3>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty text-base text-white/85 sm:text-lg">
            Launch your AI support desk in minutes — free to start, no credit
            card required.
          </p>
          <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-full bg-white px-7 text-base font-medium text-brand hover:bg-white/90 sm:w-auto"
            >
              <Link href="/sign-up">Start free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-full border-white/30 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Link href="/dashboard/billing">Go to billing</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function MpesaLogo() {
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#44B649] text-white font-sans font-bold text-xs select-none shadow-sm">
      <span className="text-white font-black uppercase">m-</span>
      <span className="text-[#E31E24] font-black uppercase">pesa</span>
    </span>
  );
}

// Per-plan CTA. Signed-in users with an org get the bespoke <CheckoutButton>
// (when a public plan id is configured); everyone else gets a sign-in / billing
// link. Always falls back gracefully so the page is useful without env ids.
function PlanCta({
  planSlug,
  planId,
  isFree,
  highlighted,
  price,
  isAnnual,
  trialDays,
}: {
  planSlug: PlanSlug;
  planId: string | undefined;
  isFree: boolean;
  highlighted?: boolean;
  price?: number;
  isAnnual?: boolean;
  trialDays?: number;
}) {
  const router = useRouter();
  const initiateMpesa = useAction(api.mpesa.initiateMpesaStkPush);
  const validateCoupon = useQuery(api.coupons.validate, { code: "" }); // Will handle manually if possible or just use action

  
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isInitiating, setIsInitiating] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "sent" | "completed" | "failed">("idle");
  const [txError, setTxError] = useState<string | null>(null);

  const pendingTx = useQuery(
    api.mpesa.getActiveMpesaPendingTransaction,
    checkoutRequestId ? { checkoutRequestID: checkoutRequestId } : "skip"
  );

  useEffect(() => {
    if (pendingTx) {
      if (pendingTx.status === "completed") {
        setPollingStatus("completed");
        const timer = setTimeout(() => {
          setIsMpesaModalOpen(false);
          router.push("/dashboard/billing");
        }, 3000);
        return () => clearTimeout(timer);
      } else if (pendingTx.status === "failed") {
        setPollingStatus("failed");
        setTxError(pendingTx.error ?? "Payment failed or was cancelled.");
      }
    }
  }, [pendingTx, router]);

  const handleUpgradeClick = () => {
    setIsMpesaModalOpen(true);
    setPhoneNumber("");
    setCouponCode("");
    setCouponError("");
    setDiscountPercent(0);
    setCheckoutRequestId(null);
    setPollingStatus("idle");
    setTxError(null);
  };

  const handleMpesaPay = async () => {
    if (!phoneNumber.trim()) return;
    setIsInitiating(true);
    setTxError(null);
    try {
      const res = await initiateMpesa({
        phoneNumber,
        planSlug: planSlug as "pro" | "scale",
        isAnnual,
        couponCode: couponCode.trim() || undefined,
      });
      if (res.success && res.checkoutRequestID) {
        setCheckoutRequestId(res.checkoutRequestID);
        setPollingStatus("sent");
      } else {
        throw new Error("Failed to initiate STK push");
      }
    } catch (err: any) {
      setTxError(err instanceof Error ? err.message : "Error initiating STK push");
      setPollingStatus("failed");
    } finally {
      setIsInitiating(false);
    }
  };

  const variantClass = highlighted
    ? "w-full rounded-full bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_8px_24px_-8px_var(--brand)] hover:opacity-95 cursor-pointer"
    : "w-full rounded-full cursor-pointer";

  return (
    <>
      <Show when="signed-out">
        <Button
          asChild
          className={variantClass}
          variant={highlighted ? "default" : "outline"}
        >
          <Link href={`/sign-in?redirect_url=/pricing`}>
            {isFree ? "Get started free" : "Sign in to subscribe"}
          </Link>
        </Button>
      </Show>

      <Show when="signed-in">
        {!isFree ? (
          <>
            {/* Original card checkout disabled / bypassed for M-Pesa:
            <CheckoutButton
              planId={planId}
              planPeriod="month"
              for="organization"
              newSubscriptionRedirectUrl="/dashboard/billing"
            >
              <Button
                className={variantClass}
                variant={highlighted ? "default" : "outline"}
              >
                Upgrade to {planSlug === "pro" ? "Pro" : "Scale"}
              </Button>
            </CheckoutButton>
            */}
            <Button
              onClick={handleUpgradeClick}
              className={variantClass}
              variant={highlighted ? "default" : "outline"}
            >
              {trialDays ? `Start ${trialDays}-day free trial` : `Upgrade to ${planSlug === "pro" ? "Pro" : "Scale"}`}
            </Button>
          </>
        ) : (
          <Button
            asChild
            className={variantClass}
            variant={highlighted ? "default" : "outline"}
          >
            <Link href="/dashboard/billing">
              Go to dashboard
            </Link>
          </Button>
        )}
      </Show>

      {/* M-Pesa & Card Checkout Payment Modal */}
      <Sheet open={isMpesaModalOpen} onOpenChange={setIsMpesaModalOpen}>
        <SheetContent className="w-full sm:max-w-md border-border bg-card shadow-lg p-6 text-foreground overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="size-5 text-brand" />
              Subscribe to {planSlug === "pro" ? "Pro" : "Scale"}
            </SheetTitle>
            <SheetDescription>
              Choose your preferred payment method below to complete the subscription purchase.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4 text-sm">
            {/* Option 1: M-Pesa STK Push */}
            <div className="border border-border/85 rounded-xl p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">Option A: Pay with M-Pesa</span>
                  <MpesaLogo />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">
                Enter your Safaricom phone number to receive an STK Push prompt on your device.
              </p>

              {pollingStatus === "idle" && (
                <div className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mpesa-phone" className="text-xs font-bold text-muted-foreground uppercase">
                      M-Pesa Mobile Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="mpesa-phone"
                        placeholder="e.g. 0712345678 or 2547XXXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Coupon Code - In a real app we'd validate this with a convex query */}
                  <div className="space-y-1.5 pt-1 border-t border-border mt-3">
                    <Label htmlFor="mpesa-coupon" className="text-xs font-bold text-muted-foreground uppercase">
                      Promo Code (Optional)
                    </Label>
                    <div className="relative flex gap-2">
                      <Input
                        id="mpesa-coupon"
                        placeholder="e.g. LAUNCH50"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError("");
                          setDiscountPercent(0);
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                    {couponError && <p className="text-[10px] text-rose-500 font-medium">{couponError}</p>}
                    {discountPercent > 0 && <p className="text-[10px] text-emerald-500 font-medium">{discountPercent}% discount applied!</p>}
                  </div>

                  <Button
                    onClick={handleMpesaPay}
                    disabled={isInitiating || !phoneNumber.trim()}
                    className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer mt-2"
                  >
                    {isInitiating ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Initiating...
                      </>
                    ) : (
                      <>Send STK Push (KES {(price ?? 0).toLocaleString()})</>
                    )}
                  </Button>
                </div>
              )}

              {pollingStatus === "sent" && (
                <div className="mt-4 p-3 rounded bg-blue-500/5 border border-blue-500/20 text-center space-y-2">
                  <Loader2 className="size-6 animate-spin text-brand mx-auto" />
                  <p className="text-xs font-bold text-foreground">STK Push Request Dispatched</p>
                  <p className="text-[11px] text-muted-foreground">
                    Please check phone <strong>{phoneNumber}</strong> and enter your M-Pesa PIN to complete the payment.
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 italic animate-pulse">
                    Waiting for Safaricom confirmation... (no need to refresh)
                  </p>
                </div>
              )}

              {pollingStatus === "completed" && (
                <div className="mt-4 p-3 rounded bg-emerald-500/5 border border-emerald-500/20 text-center space-y-1.5">
                  <Check className="size-6 text-emerald-500 mx-auto bg-emerald-500/10 rounded-full p-1" />
                  <p className="text-xs font-bold text-emerald-600">Payment Confirmed!</p>
                  <p className="text-[11px] text-muted-foreground">
                    Receipt: {pendingTx?.mpesaReceiptNumber ?? "N/A"}. Your plan has been upgraded successfully.
                  </p>
                </div>
              )}

              {pollingStatus === "failed" && (
                <div className="mt-4 p-3 rounded bg-rose-500/5 border border-rose-500/20 text-center space-y-2">
                  <ShieldAlert className="size-5 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-600">STK Push Payment Failed</p>
                  <p className="text-[11px] text-muted-foreground leading-normal">{txError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold mt-1"
                    onClick={() => {
                      setPollingStatus("idle");
                      setTxError(null);
                      setCheckoutRequestId(null);
                    }}
                  >
                    Try again
                  </Button>
                </div>
              )}
            </div>

            {/* Option 2: Credit Card (Disabled, Coming Soon) */}
            <div className="border border-border/80 bg-muted/10 rounded-xl p-4 opacity-60 pointer-events-none relative">
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 border-amber-500/20">
                  Coming Soon
                </Badge>
              </div>
              <span className="font-bold text-foreground text-sm">Option B: Pay with Credit Card</span>
              <p className="text-xs text-muted-foreground mt-1 mb-3 leading-normal">
                Global credit and debit card processing.
              </p>
              {planId && (
                <CheckoutButton
                  planId={planId}
                  planPeriod="month"
                  for="organization"
                  newSubscriptionRedirectUrl="/dashboard/billing"
                >
                  <Button disabled size="sm" className="w-full text-xs font-semibold">
                    Pay with Card
                  </Button>
                </CheckoutButton>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
