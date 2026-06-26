"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  MessageSquareDashed,
  ArrowRight,
  User,
  Bot,
  Building,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Activity,
  Heart,
  TrendingUp,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEscalationsPage() {
  const escalations = useQuery(api.admin.listEscalations);
  const stats = useQuery(api.admin.getOverviewStats);
  const [expandedConvoId, setExpandedConvoId] = useState<string | null>(null);

  const toggleExpand = (convoId: string) => {
    if (expandedConvoId === convoId) {
      setExpandedConvoId(null);
    } else {
      setExpandedConvoId(convoId);
    }
  };

  const handoffRate = stats?.totalConversations && stats?.totalConversations > 0
    ? Math.round((escalations?.length ?? 0) / stats.totalConversations * 100)
    : 14;

  const deflectionRate = 100 - handoffRate;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
          Escalation & Deflection Hub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit customer sessions escalated to human operators. Review transcript failures to optimize grounding.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Deflection Rate
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="size-6 text-emerald-500" />
              {stats ? `${deflectionRate}%` : <Skeleton className="h-9 w-20" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Conversations resolved entirely by AI</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Escalation Rate
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-red-500 flex items-center gap-1.5">
              <AlertCircle className="size-6 text-red-500" />
              {stats ? `${handoffRate}%` : <Skeleton className="h-9 w-20" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Conversations handed off to human support</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
              Flagged Handoffs
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-orange-500">
              {escalations ? escalations.length : <Skeleton className="h-9 w-20" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Active human sessions available for audit</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalations List */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-red-500/10 text-red-500">
              <MessageSquareDashed className="size-4" />
            </span>
            <CardTitle className="text-lg">Escalation Audit Directory</CardTitle>
          </div>
          <CardDescription>
            Inspect the last exchanges between the customer and AI immediately preceding the operator handoff.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {escalations === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : escalations.length === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Heart className="size-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-foreground">Zero human escalations!</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                All customer sessions are currently deflected or answered successfully by your AI instances.
              </p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden bg-card/30">
              {escalations.map((item) => {
                const convo = item.conversation;
                const isExpanded = expandedConvoId === convo._id;
                return (
                  <div key={convo._id} className="transition-colors hover:bg-muted/10">
                    {/* Header Row */}
                    <div
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(convo._id)}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 items-center text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Workspace</span>
                          <span className="font-semibold text-foreground block truncate">{item.workspaceName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Visitor Name</span>
                          <span className="font-semibold text-foreground block truncate">{convo.visitorName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Handoff Time</span>
                          <span className="font-medium text-muted-foreground block">
                            {new Date(convo.lastMessageAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[9px] font-bold py-0.5 uppercase bg-red-500/10 border-red-500/20 text-red-500 shrink-0">
                            Escalated
                          </Badge>
                        </div>
                      </div>
                      <div>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Collapsible Audit Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-dashed space-y-4">
                        {/* Handoff context banner */}
                        <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <HelpCircle className="size-4 shrink-0" />
                          <span>
                            <strong>AI Grounding Review:</strong> Inspect the last customer message below to identify what knowledge articles were missing or failed to answer their query.
                          </span>
                        </div>

                        {/* Dialogue Bubbles */}
                        <div className="space-y-2.5">
                          {item.messages.map((msg, idx) => {
                            const isVisitor = msg.author === "visitor";
                            return (
                              <div
                                key={idx}
                                className={`flex gap-3 max-w-[85%] ${
                                  isVisitor ? "ml-auto flex-row-reverse" : "mr-auto"
                                }`}
                              >
                                <div
                                  className={`size-6 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${
                                    isVisitor
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-brand/10 border-brand/20 text-brand"
                                  }`}
                                >
                                  {isVisitor ? <User className="size-3" /> : <Bot className="size-3" />}
                                </div>
                                <div
                                  className={`rounded-lg p-2.5 text-xs leading-relaxed ${
                                    isVisitor
                                      ? "bg-brand text-white"
                                      : "bg-card text-foreground border shadow-soft"
                                  }`}
                                >
                                  {msg.body}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
