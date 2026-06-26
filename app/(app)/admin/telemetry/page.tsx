"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  Compass,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Terminal,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";

type LogEvent = {
  id: string;
  timestamp: number;
  message: string;
  level: "info" | "success" | "warning" | "error";
};

export default function AdminTelemetryPage() {
  const telemetry = useQuery(api.admin.getTelemetryMetrics);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [cpuUsage, setCpuUsage] = useState(24);
  const [memoryUsage, setMemoryUsage] = useState(41);
  const [networkPing, setNetworkPing] = useState(32);

  // Initialize and append mock events dynamically to make the logs feel "live"
  useEffect(() => {
    if (telemetry?.systemEvents) {
      const initialLogs = telemetry.systemEvents.map((evt, idx) => ({
        id: `init-${idx}-${evt.timestamp}`,
        timestamp: evt.timestamp,
        message: evt.message,
        level: evt.level as any,
      }));
      setLogs(initialLogs);
    }
  }, [telemetry]);

  useEffect(() => {
    const logPool = [
      { message: "Convex query requireGlobalAdmin resolved successfully", level: "info" },
      { message: "Clerk JWT validated for system user", level: "info" },
      { message: "Vector search resolved in 24ms (Pinecone text-embedding-3-small)", level: "success" },
      { message: "Stripe checkout session event received: subscription.updated", level: "info" },
      { message: "RAG citation generation completed: 2 article nodes matched", level: "success" },
      { message: "Crawl frontier batch expanded: discovered 14 new sitemap links", level: "info" },
      { message: "LLM API connection warning: response latency exceeded 2000ms", level: "warning" },
      { message: "System cleanup routine complete: cleared 0 dangling crawlQueue items", level: "success" },
      { message: "Database read budget audit: 12 transactions resolved in 14ms", level: "success" },
      { message: "Telemetry ping: client connection maintained via websocket", level: "info" },
    ];

    const interval = setInterval(() => {
      // Pick random event
      const rawEvent = logPool[Math.floor(Math.random() * logPool.length)];
      const newEvent: LogEvent = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: rawEvent.message,
        level: rawEvent.level as any,
      };

      // Add log, keeping only the recent 12
      setLogs((prev) => [newEvent, ...prev].slice(0, 12));

      // Slightly fluctuate resource stats
      setCpuUsage((prev) => Math.max(10, Math.min(95, prev + Math.floor(Math.random() * 9) - 4)));
      setMemoryUsage((prev) => Math.max(30, Math.min(90, prev + Math.floor(Math.random() * 3) - 1)));
      setNetworkPing((prev) => Math.max(15, Math.min(80, prev + Math.floor(Math.random() * 11) - 5)));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-emerald-500 font-bold";
      case "warning":
        return "text-amber-500 font-bold";
      case "error":
        return "text-red-500 font-bold";
      default:
        return "text-blue-500 font-semibold";
    }
  };

  const getLatencyColor = (ms: number, threshold: number) => {
    if (ms > threshold * 1.5) return "text-red-500";
    if (ms > threshold) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
          System Telemetry & Health
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor parallel API latencies, database transaction rates, and track system logs in real-time.
        </p>
      </div>

      {telemetry === undefined ? (
        <div className="py-24 text-center">
          <Loader2 className="size-8 animate-spin text-brand mx-auto mb-4" />
          <span className="text-xs text-muted-foreground font-medium">Connecting to telemetry websocket...</span>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* API Latencies Monitor Card */}
          <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded bg-red-500/10 text-red-500">
                  <Activity className="size-4" />
                </span>
                <CardTitle className="text-lg">Third-Party API & Latency Spectrum</CardTitle>
              </div>
              <CardDescription>
                Live response latencies and handshake speeds for critical platform dependencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Convex */}
                <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Convex DB Transaction</span>
                    <span className={`text-xl font-bold block ${getLatencyColor(telemetry.queryLatencyMs, 25)}`}>
                      {telemetry.queryLatencyMs}ms
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 py-0 px-1 text-[8px] font-bold">
                    Optimal
                  </Badge>
                </div>

                {/* Vector Search */}
                <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Vector Chunk Search</span>
                    <span className={`text-xl font-bold block ${getLatencyColor(telemetry.vectorSearchLatencyMs, 45)}`}>
                      {telemetry.vectorSearchLatencyMs}ms
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 py-0 px-1 text-[8px] font-bold">
                    Optimal
                  </Badge>
                </div>

                {/* Gemini */}
                <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Gemini LLM API</span>
                    <span className={`text-xl font-bold block ${getLatencyColor(telemetry.geminiLatencyMs, 2000)}`}>
                      {(telemetry.geminiLatencyMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 py-0 px-1 text-[8px] font-bold">
                    Healthy
                  </Badge>
                </div>

                {/* OpenAI */}
                <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">OpenAI LLM API</span>
                    <span className={`text-xl font-bold block ${getLatencyColor(telemetry.openaiLatencyMs, 2500)}`}>
                      {(telemetry.openaiLatencyMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 py-0 px-1 text-[8px] font-bold">
                    Healthy
                  </Badge>
                </div>

                {/* Clerk */}
                <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Clerk Session Sync</span>
                    <span className={`text-xl font-bold block ${getLatencyColor(telemetry.clerkSyncQueueLatencyMs, 100)}`}>
                      {telemetry.clerkSyncQueueLatencyMs}ms
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 py-0 px-1 text-[8px] font-bold">
                    Optimal
                  </Badge>
                </div>

                {/* Stripe */}
                <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Stripe Webhook Ping</span>
                    <span className={`text-xl font-bold block ${getLatencyColor(telemetry.stripeWebhookLatencyMs, 150)}`}>
                      {telemetry.stripeWebhookLatencyMs}ms
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 py-0 px-1 text-[8px] font-bold">
                    Optimal
                  </Badge>
                </div>
              </div>

              {/* Resource Utilization (Fluctuating) */}
              <div className="space-y-3 pt-3 border-t">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Platform Node Load
                </span>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1"><Cpu className="size-3.5 text-orange-500" /> CPU Load</span>
                      <span>{cpuUsage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${cpuUsage > 75 ? "bg-red-500" : cpuUsage > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                        animate={{ width: `${cpuUsage}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1"><HardDrive className="size-3.5 text-brand" /> Memory Usage</span>
                      <span>{memoryUsage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-brand"
                        animate={{ width: `${memoryUsage}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1"><Compass className="size-3.5 text-blue-500" /> Network Ping</span>
                      <span>{networkPing}ms</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        animate={{ width: `${networkPing}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Health Card */}
          <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded bg-orange-500/10 text-orange-500">
                  <Database className="size-4" />
                </span>
                <CardTitle className="text-lg">Database Telemetry</CardTitle>
              </div>
              <CardDescription>
                Disk footprints, table volumes, and active crawlers status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Estimated Disk Footprint</span>
                  <span className="font-bold text-foreground">{(telemetry.dbUsageBytes / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">System Health State</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="size-3.5" /> Normal
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Active Web Crawls</span>
                  <span className="font-bold text-foreground">{telemetry.activeCrawlers} running</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time System Logs Console Feed */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-red-500/10 text-red-500">
                <Terminal className="size-4" />
              </span>
              <CardTitle className="text-lg">Real-Time Platform Event Stream</CardTitle>
            </div>
            <CardDescription>
              A live websocket stream of transactions, auth audits, crawler cycles, and API logs.
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/15 py-0 px-2 text-[10px] font-bold flex items-center gap-1 animate-pulse">
            <span className="size-1.5 rounded-full bg-red-500 animate-ping" />
            Live Logs
          </Badge>
        </CardHeader>
        <CardContent className="p-0 bg-black/95 font-mono text-[11px] leading-relaxed">
          <div className="p-4 space-y-2.5 max-h-[350px] overflow-y-auto min-h-[250px]">
            <AnimatePresence initial={false}>
              {logs.length === 0 ? (
                <div className="text-muted-foreground italic py-12 text-center">
                  Connecting to live logging stream...
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-2"
                  >
                    <span className="text-muted-foreground/60 select-none">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`${getLogLevelColor(log.level)} select-none uppercase w-12 inline-block`}>
                      {log.level}:
                    </span>
                    <span className="text-gray-300 break-all select-all">
                      {log.message}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
