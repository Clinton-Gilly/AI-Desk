"use client";

import { useQuery } from "convex/react";
import {
  Building2,
  Users,
  MessageSquare,
  Banknote,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  Activity,
  History,
  HelpCircle,
  Sparkles,
  BookOpen,
  Globe,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Compass,
  Smile,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverviewPage() {
  const stats = useQuery(api.admin.getOverviewStats);
  const recentConvos = useQuery(api.admin.listRecentConversations, { limit: 5 });

  const isLoading = stats === undefined || recentConvos === undefined;

  // Animation variants for container cascading entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 15 } },
  } as const;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // AI metrics
  const aiResolutionRate = 100 - stats.aiPerformance.handoffRate;
  
  // Calculate Grounding Metrics
  const totalAiReplies = stats.aiPerformance.groundedMessages + stats.aiPerformance.ungroundedMessages;
  const groundedPercentage = totalAiReplies > 0 
    ? Math.round((stats.aiPerformance.groundedMessages / totalAiReplies) * 100)
    : 100;
  const ungroundedPercentage = 100 - groundedPercentage;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
            System Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Platform-wide metrics, RAG grounding audits, and customer support metrics.
          </p>
        </div>
        <Link href="/admin/ai-behavior">
          <Button className="bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white shadow-soft transition-all duration-300 flex items-center gap-1.5 font-bold hover:shadow-soft-lg cursor-pointer">
            <Bot className="size-4 animate-bounce" />
            AI Behavior Dashboard
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6 animate-in fade-in duration-500"
      >
        {/* Row 1: Core Platform Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-red-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Workspaces
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <Building2 className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.totalWorkspaces}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Active business tenants
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-amber-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Platform Members
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.totalMembers}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Registered system operators
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-orange-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conversations
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <MessageSquare className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.totalConversations}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Total threads since creation
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-emerald-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estimated MRR
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  ${stats.estimatedMRR.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Monthly recurring revenue
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Row 2: Leads & Knowledge Performance */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-blue-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Helpdesk Articles
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <BookOpen className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.totalArticles}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Published articles for RAG
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-cyan-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Crawled Pages
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Globe className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.totalCrawlPages}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Pages in knowledge index
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-indigo-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Leads Captured
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.totalLeads}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Contacts generated by widget
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-violet-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lead Conversion Rate
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <TrendingUp className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.conversionRate}%
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Convo to Lead conversion
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Row 3: AI Behavior & Instincts Heuristic Summaries */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-violet-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Average AI Latency
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Clock className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.aiPerformance.averageResponseTimeSec}s
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Average turn response speed
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-emerald-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  User Sentiment Index
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Smile className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.aiPerformance.sentimentScore}%
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Positive/neutral conversation ratio
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-red-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Guardrail Violations
                </span>
                <span className={`flex size-7 items-center justify-center rounded-lg ${stats.aiPerformance.guardrailTriggers > 0 ? "bg-red-500/20 text-red-600 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                  <ShieldAlert className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.aiPerformance.guardrailTriggers}
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Blocked jailbreak/injection probes
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.015, translateY: -2 }}
            className="transition-all duration-300"
          >
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md shadow-soft hover:border-blue-500/20 hover:shadow-soft-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  AI Grounding Accuracy
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {groundedPercentage}%
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  RAG-sourced replies rate
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Restructured AI Insights Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          {/* AI Grounding, Instincts & Hallucinations */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
            <Card className="border-border bg-card/40 backdrop-blur-md shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded bg-red-500/10 text-red-500 animate-pulse">
                    <Bot className="size-4" />
                  </span>
                  <CardTitle className="text-lg">AI Behavior & RAG Insights</CardTitle>
                </div>
                <CardDescription>
                  Evaluating grounding metrics, RAG similarity scores, and hallucination risks.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Visual Grounding Analytics Split */}
                <div className="grid gap-6 sm:grid-cols-2 border-b border-border/60 pb-6">
                  {/* Left: Resolution Ring */}
                  <div className="flex flex-col items-center justify-center border-r border-border/40 pr-2">
                    <div className="relative flex size-24 items-center justify-center rounded-full border-4 border-muted">
                      <svg className="absolute size-full -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="44"
                          className="stroke-red-500 fill-none"
                          strokeWidth="8"
                          strokeDasharray={276}
                          strokeDashoffset={276 - (276 * aiResolutionRate) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="text-center">
                        <span className="text-xl font-extrabold text-foreground">{aiResolutionRate}%</span>
                      </div>
                    </div>
                    <span className="mt-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
                      AI Resolution Rate
                    </span>
                  </div>

                  {/* Right: Grounded vs Hallucination Split */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Hallucination Risk Audit
                    </h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-emerald-500" />
                          Grounded Replies
                        </span>
                        <span className="text-foreground font-bold">{groundedPercentage}%</span>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${groundedPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 text-rose-500 animate-pulse" />
                          Ungrounded (Hallucination Risk)
                        </span>
                        <span className="text-foreground font-bold">{ungroundedPercentage}%</span>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all"
                          style={{ width: `${ungroundedPercentage}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] leading-relaxed text-muted-foreground font-medium border-t border-border/40 pt-2">
                      Grounded replies rely directly on indexed knowledge articles/crawler text. Ungrounded replies are generated when vector retrieval falls below the score threshold.
                    </p>
                  </div>
                </div>

                {/* Top Grounding References */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Compass className="size-3.5 text-red-500" />
                    Top Cited RAG Sources
                  </h4>

                  {stats.aiPerformance.topCitedSources.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2 italic">
                      No grounding citations recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2 bg-muted/30 border rounded-lg p-3">
                      {stats.aiPerformance.topCitedSources.map((source, i) => (
                        <div key={i} className="flex justify-between items-center text-xs last:border-b-0 pb-1.5 border-b border-border/40 last:pb-0">
                          <span className="text-foreground font-semibold truncate max-w-[280px]">
                            {source.title}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {source.count} citations
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Distribution */}
                <div className="space-y-4 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-red-500" />
                      Message Distribution
                    </h4>
                    <span className="text-xs text-muted-foreground font-bold">
                      Total: {stats.totalMessages}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Visitor Messages */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground" />
                          Visitor Messages
                        </span>
                        <span className="text-foreground font-semibold">
                          {stats.messageBreakdown.visitor} ({stats.totalMessages > 0 ? Math.round((stats.messageBreakdown.visitor / stats.totalMessages) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${stats.totalMessages > 0 ? (stats.messageBreakdown.visitor / stats.totalMessages) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* AI Agent Messages */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Bot className="size-3 text-red-500" />
                          AI Agent Responses
                        </span>
                        <span className="text-foreground font-semibold">
                          {stats.messageBreakdown.aiAgent} ({stats.totalMessages > 0 ? Math.round((stats.messageBreakdown.aiAgent / stats.totalMessages) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-red-100 dark:bg-red-950/20 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${stats.totalMessages > 0 ? (stats.messageBreakdown.aiAgent / stats.totalMessages) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Human Agent Messages */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Users className="size-3 text-amber-500" />
                          Human Agent Replies
                        </span>
                        <span className="text-foreground font-semibold">
                          {stats.messageBreakdown.humanAgent} ({stats.totalMessages > 0 ? Math.round((stats.messageBreakdown.humanAgent / stats.totalMessages) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-amber-100 dark:bg-amber-950/20 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${stats.totalMessages > 0 ? (stats.messageBreakdown.humanAgent / stats.totalMessages) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Conversations */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card className="h-full border-border bg-card/40 backdrop-blur-md shadow-soft flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded bg-amber-500/10 text-amber-500">
                      <History className="size-4" />
                    </span>
                    <CardTitle className="text-lg">Recent Chats</CardTitle>
                  </div>
                  <Link href="/admin/workspaces">
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2">
                      View all
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Latest interactions across workspaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 px-4 pb-4">
                <div className="divide-y divide-border/60">
                  {recentConvos.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No recent active conversations found.
                    </div>
                  ) : (
                    recentConvos.map((convo) => (
                      <div key={convo._id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-sm">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground truncate">
                              {convo.visitorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate max-w-[100px]">
                              @{convo.workspaceName}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 break-all">
                            {convo.preview}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-semibold ${
                              convo.mode === "human"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            }`}
                          >
                            {convo.mode === "human" ? "Human" : "AI"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(convo.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
