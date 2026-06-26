"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import {
  Bot,
  Clock,
  Smile,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sparkles,
  BookOpen,
  ArrowRight,
  Shield,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Info,
  BadgeAlert,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiBehaviorDashboard() {
  const behaviorDetails = useQuery(api.admin.getAiBehaviorDetails);
  const [activeTab, setActiveTab] = useState<"instincts" | "hallucinations" | "guardrails">("instincts");

  const isLoading = behaviorDetails === undefined;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  } as const;

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
  } as const;

  const tabContentVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 10, transition: { duration: 0.2 } },
  } as const;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8 bg-muted/10 h-screen overflow-y-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const {
    averageResponseTimeSec,
    sentimentStats,
    groundingStats,
    confidenceStats,
    hallucinationRiskConversations,
    guardrailEvents,
  } = behaviorDetails;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Admin Overview
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">AI Behavior</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            <Bot className="size-8 text-red-500" />
            AI Behavior & Insights
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Audit hallucination indices, system instincts, vector confidence thresholds, and guardrail alerts.
          </p>
        </div>
      </div>

      {/* Overview Cards (Short row) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft hover:shadow-soft-lg hover:border-red-500/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hallucination Index
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                <AlertTriangle className="size-4 animate-pulse" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {groundingStats.hallucinationRate}%
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                Uncited/ungrounded response rate
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft hover:shadow-soft-lg hover:border-violet-500/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                AI Instinct Speed
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <Clock className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {averageResponseTimeSec}s
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                Average visitor-to-AI turn latency
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft hover:shadow-soft-lg hover:border-rose-500/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Security Interventions
              </span>
              <span className={`flex size-7 items-center justify-center rounded-lg ${guardrailEvents.length > 0 ? "bg-rose-500/10 text-rose-600 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                <Shield className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {guardrailEvents.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                Triggered input security rules
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setActiveTab("instincts")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "instincts"
              ? "border-red-500 text-red-500 bg-red-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Activity className="size-4" />
          AI Instincts & Capabilities
        </button>
        <button
          onClick={() => setActiveTab("hallucinations")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "hallucinations"
              ? "border-red-500 text-red-500 bg-red-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <AlertTriangle className="size-4" />
          Hallucination Risk Audit ({hallucinationRiskConversations.length})
        </button>
        <button
          onClick={() => setActiveTab("guardrails")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "guardrails"
              ? "border-red-500 text-red-500 bg-red-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Shield className="size-4" />
          Guardrails & Safety Logs ({guardrailEvents.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
          >
            {/* TAB 1: AI INSTINCTS & PERFORMANCE */}
            {activeTab === "instincts" && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Sentiment & Donut Stack */}
                <Card className="border-border bg-card/40 backdrop-blur-md shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smile className="size-5 text-emerald-500" />
                      Visitor Sentiment Profile
                    </CardTitle>
                    <CardDescription>
                      Calculated from text keywords in incoming messages to evaluate customer experience.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Custom Animated Stacked Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                        <span>Positive ({sentimentStats.positive}%)</span>
                        <span>Neutral ({sentimentStats.neutral}%)</span>
                        <span>Negative ({sentimentStats.negative}%)</span>
                      </div>
                      <div className="relative h-6 w-full rounded-full bg-muted overflow-hidden flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sentimentStats.positive}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          title={`Positive: ${sentimentStats.positiveCount}`}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sentimentStats.neutral}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                          className="h-full bg-amber-500"
                          title={`Neutral: ${sentimentStats.neutralCount}`}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sentimentStats.negative}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-rose-500 to-red-600"
                          title={`Negative: ${sentimentStats.negativeCount}`}
                        />
                      </div>
                    </div>

                    {/* Breakdown counts */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/15">
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {sentimentStats.positiveCount}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Positive</p>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/15">
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {sentimentStats.neutralCount}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Neutral</p>
                      </div>
                      <div className="rounded-lg bg-rose-500/10 p-3 border border-rose-500/15">
                        <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                          {sentimentStats.negativeCount}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Negative</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/40 border p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
                      <Info className="size-4 shrink-0 text-violet-500 mt-0.5" />
                      <p className="leading-relaxed">
                        Visitor sentiments help identify gaps in prompt directives. A high concentration of negative sentiments can serve as an early indicator that your system prompt requires clarifying constraints.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Latency Spectrum */}
                <Card className="border-border bg-card/40 backdrop-blur-md shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="size-5 text-violet-500" />
                      Latency Spectrum Gauge
                    </CardTitle>
                    <CardDescription>
                      Validates LLM performance speed. Highly critical for responsive user experiences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {/* Spectrum line */}
                      <div className="relative pt-6">
                        {/* Spectrum Bar */}
                        <div className="h-3 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600" />
                        
                        {/* Pointer marker representing current average */}
                        <motion.div
                          initial={{ left: "0%" }}
                          animate={{ left: `${Math.min(100, (averageResponseTimeSec / 5) * 100)}%` }}
                          transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.2 }}
                          className="absolute top-2 -translate-x-1/2 flex flex-col items-center gap-1"
                        >
                          <span className="text-[10px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded shadow">
                            {averageResponseTimeSec}s
                          </span>
                          <div className="size-2.5 rotate-45 bg-foreground" />
                        </motion.div>
                      </div>

                      {/* Spectrum Labels */}
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <span className="text-emerald-500">Fast (&lt;1s)</span>
                        <span className="text-amber-500">Optimal (1-2.5s)</span>
                        <span className="text-rose-500">Slow (&gt;3s)</span>
                      </div>
                    </div>

                    {/* Confidence Distribution Meter */}
                    <div className="border-t border-border/60 pt-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Zap className="size-3.5 text-yellow-500 animate-pulse" />
                        RAG Semantic Confidence Distribution
                      </h4>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">High Confidence (Excellent match)</span>
                            <span className="text-foreground">{confidenceStats.high}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${confidenceStats.high}%` }}
                              className="h-full bg-blue-500 rounded-full"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Medium Confidence (Moderate match)</span>
                            <span className="text-foreground">{confidenceStats.medium}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${confidenceStats.medium}%` }}
                              className="h-full bg-amber-500 rounded-full"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Low Confidence (Possible Hallucinations)</span>
                            <span className="text-foreground">{confidenceStats.low}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${confidenceStats.low}%` }}
                              className="h-full bg-rose-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 2: HALLUCINATION AUDIT LOG */}
            {activeTab === "hallucinations" && (
              <Card className="border-border bg-card/40 backdrop-blur-md shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="size-5 text-red-500" />
                    High Hallucination Risk Conversations
                  </CardTitle>
                  <CardDescription>
                    Conversations where the AI replied to the visitor but drew 0 citations from knowledge base indexing. We flag these for administrator grounding review.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hallucinationRiskConversations.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                      <ShieldCheck className="size-8 text-emerald-500 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-foreground">Perfect Grounding Audit</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        All active AI-supported threads are correctly utilizing citation grounding.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden divide-y divide-border/60">
                      <div className="grid grid-cols-4 bg-muted/40 p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <div className="col-span-2">Visitor & Workspace</div>
                        <div className="text-center">AI Replies</div>
                        <div className="text-right">Risk Action</div>
                      </div>

                      {hallucinationRiskConversations.map((convo) => (
                        <div key={convo._id} className="grid grid-cols-4 p-3.5 items-center text-sm hover:bg-muted/10 transition-colors">
                          <div className="col-span-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{convo.visitorName}</span>
                              <Badge variant="outline" className="text-[10px] font-semibold bg-red-500/10 text-red-600 border-red-500/20">
                                {convo.workspaceName}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-sm">
                              &ldquo;{convo.preview}&rdquo;
                            </p>
                          </div>
                          <div className="text-center font-semibold text-foreground">
                            {convo.aiMessageCount} responses
                          </div>
                          <div className="text-right">
                            <Link href={`/admin/workspaces`}>
                              <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-red-500/20 hover:border-red-500/40 text-red-600 hover:bg-red-500/5 cursor-pointer">
                                Ground Audit
                                <ExternalLink className="size-3.5 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grounding Info Card */}
                  <div className="mt-6 border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 flex gap-3">
                    <BadgeAlert className="size-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        RAG Grounding Best Practices
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        If conversations are appearing in this log frequently, check that the relevant workspace has **published articles** or **active crawl files** mapped to the keywords being queried by the user. If knowledge base is loaded, the vector search threshold may require adjustment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB 3: GUARDRAILS & SECURITY LOGS */}
            {activeTab === "guardrails" && (
              <Card className="border-border bg-card/40 backdrop-blur-md shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="size-5 text-rose-500 animate-pulse" />
                    Guardrail Alerts & Threat Auditing
                  </CardTitle>
                  <CardDescription>
                    Real-time detection of system override attempts, jailbreak probes, and unauthorized operation queries.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {guardrailEvents.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                      <Shield className="size-8 text-muted-foreground/60 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-foreground">Clean Security Log</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        No override probes or system command violations detected.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {guardrailEvents.map((evt) => (
                        <div key={evt._id} className="border border-border/80 rounded-lg p-3 bg-muted/20 flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{evt.visitorName}</span>
                              <span className="text-[10px] text-muted-foreground">@{evt.workspaceName}</span>
                              <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] border-red-500/20 font-bold px-2 py-0.5">
                                {evt.ruleTriggered}
                              </Badge>
                            </div>
                            <div className="font-mono text-muted-foreground bg-muted p-2.5 rounded border leading-relaxed select-all overflow-x-auto text-[11px] break-all max-h-32">
                              {evt.body}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-semibold">
                            {new Date(evt.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Guardrail Policy Notice */}
                  <div className="mt-6 border rounded-lg p-4 bg-muted/40">
                    <div className="flex gap-2">
                      <AlertCircle className="size-4.5 text-violet-500 mt-0.5" />
                      <span className="text-xs font-bold text-foreground">Global Guardrail Policies</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Our platform injects static guardrails on all agent threads to prevent prompt injection and access leakage. Guardrail logs are audited platform-wide. If a visitor triggers a guardrail more than 5 times in a single thread, the agent will automatically snooze its responses and flag the thread for human handoff.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
