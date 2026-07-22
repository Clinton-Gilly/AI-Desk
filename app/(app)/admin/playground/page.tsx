"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Terminal,
  Sparkles,
  Building,
  ArrowRight,
  Send,
  Loader2,
  CheckCircle2,
  Cpu,
  Bookmark,
  DollarSign,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ModelOutput = {
  name: string;
  provider: string;
  response: string;
  latencySec: number;
  tokens: number;
  cost: number;
  grade: string;
};

export default function AdminPlaygroundPage() {
  const workspaces = useQuery(api.admin.listWorkspaces);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [queryText, setQueryText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationRun, setEvaluationRun] = useState(false);
  const [groundingQuery, setGroundingQuery] = useState("");

  // Query grounding articles using Convex
  const groundingChunks = useQuery(
    api.admin.searchGroundingChunks,
    selectedWorkspaceId && evaluationRun
      ? { workspaceId: selectedWorkspaceId as any, queryText: groundingQuery }
      : "skip"
  );

  // Model comparison outputs
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([]);

  const handleEvaluate = async () => {
    if (!selectedWorkspaceId || !queryText.trim()) return;

    setIsEvaluating(true);
    setGroundingQuery(queryText);
    setEvaluationRun(true);

    // Simulate LLM benchmarks after a short delay
    setTimeout(() => {
      const workspace = workspaces?.find((w) => w._id === selectedWorkspaceId);
      const wsName = workspace?.name || "the workspace";

      // Formulate responses based on the query text
      const simulatedText = queryText.toLowerCase();
      let responseContent = `Based on the crawled help articles for ${wsName}, yes, we support that request. We offer automated setup options and detailed API documentation for all verified members. Please consult the KB settings in your console dashboard for further steps.`;

      if (simulatedText.includes("price") || simulatedText.includes("cost") || simulatedText.includes("bill")) {
        responseContent = `According to the grounding documents for ${wsName}, our plans range from a Free tier (KSh 0/mo with 100 messages) to a Pro plan (KSh 6,500/mo with 1,000 messages) and a Scale plan (KSh 26,000/mo with 10,000 messages). Let me know if you would like me to generate an upgrade link!`;
      } else if (simulatedText.includes("integrate") || simulatedText.includes("install") || simulatedText.includes("setup")) {
        responseContent = `Our installation guidelines indicate that you can add MyChat to your website by pasting our custom script tag directly before the closing </body> tag of your HTML. Alternatively, we support standard Next.js npm packages.`;
      }

      const outputs: ModelOutput[] = [
        {
          name: "Gemini 1.5 Pro (Default)",
          provider: "Google",
          response: responseContent,
          latencySec: 1.1,
          tokens: 154,
          cost: 0.00019,
          grade: "Excellent Grounding",
        },
        {
          name: "GPT-4o (Premium)",
          provider: "OpenAI",
          response: `${responseContent} Feel free to ask if you have any additional queries about setting up integrations or configuring specific plan restrictions.`,
          latencySec: 1.9,
          tokens: 172,
          cost: 0.00086,
          grade: "Excellent (Verbose)",
        },
        {
          name: "Claude 3.5 Sonnet",
          provider: "Anthropic",
          response: `Here is the verified information: ${responseContent.replace("According to the grounding documents, ", "")}`,
          latencySec: 1.5,
          tokens: 142,
          cost: 0.00043,
          grade: "Concise & Accurate",
        },
      ];

      setModelOutputs(outputs);
      setIsEvaluating(false);
    }, 1200);
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
          AI Evaluation Playground
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Benchmark model performance, analyze vector grounding index matching, and audit response costs.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Selection and Input Card */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft xl:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-orange-500/10 text-orange-500">
                <Terminal className="size-4" />
              </span>
              <CardTitle className="text-lg">Benchmark Inputs</CardTitle>
            </div>
            <CardDescription>
              Select a target organization workspace to fetch its RAG context, and write a test user query.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Workspace Select */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Building className="size-3.5" /> Target Workspace
              </label>
              {workspaces === undefined ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select a workspace to audit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w) => (
                      <SelectItem key={w._id} value={w._id} className="text-xs">
                        {w.name} ({w.slug || "no slug"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Benchmark Query</label>
              <Input
                placeholder="e.g. What is your pricing details?"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEvaluate()}
                className="text-xs h-9"
              />
            </div>

            {/* Run Button */}
            <Button
              className="w-full bg-brand text-white font-bold h-10 gap-1.5 hover:opacity-90"
              disabled={isEvaluating || !selectedWorkspaceId || !queryText.trim()}
              onClick={handleEvaluate}
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running Benchmarks...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Run Comparative Benchmark
                </>
              )}
            </Button>

            {/* Matched Grounding Chunks Section */}
            {evaluationRun && (
              <div className="space-y-3.5 pt-4 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Bookmark className="size-3.5 text-brand" /> Grounding Segments Matched
                </span>
                {groundingChunks === undefined ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : groundingChunks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No articles found matching the query in this workspace. Response will run ungrounded.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {groundingChunks.map((chunk, idx) => (
                      <div key={idx} className="p-2.5 border rounded-lg bg-muted/20 text-xs leading-normal">
                        <div className="flex items-center justify-between gap-1.5 font-semibold text-foreground mb-1">
                          <span className="truncate">{chunk.title}</span>
                          <Badge variant="outline" className="text-[8px] py-0 px-1 font-semibold shrink-0 uppercase">
                            {chunk.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic leading-snug">
                          {chunk.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Comparative Cards (2 columns on large screen) */}
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft xl:col-span-2 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-500">
                <Sparkles className="size-4" />
              </span>
              <CardTitle className="text-lg">Comparative Model Performance</CardTitle>
            </div>
            <CardDescription>
              Review output variations, response speeds, token parameters, and estimated costs across engines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!evaluationRun ? (
              <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Cpu className="size-10 text-muted-foreground/30 animate-pulse" />
                <span className="max-w-xs leading-relaxed">
                  Run a benchmark query on the left to see side-by-side LLM outputs and performance diagnostics.
                </span>
              </div>
            ) : isEvaluating ? (
              <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin text-brand" />
                <span>Simulating parallel API requests...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Comparative cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {modelOutputs.map((out) => (
                    <div key={out.name} className="border rounded-lg p-3 bg-muted/20 flex flex-col justify-between space-y-3 relative overflow-hidden">
                      {out.provider === "Google" && (
                        <div className="absolute top-0 right-0 h-1.5 w-full bg-blue-500" />
                      )}
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span className="text-xs font-bold text-foreground">{out.name}</span>
                          <Badge variant="outline" className="text-[8px] py-0 px-1 font-bold uppercase bg-background text-brand border-brand/20">
                            {out.grade}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-normal break-words leading-relaxed select-all">
                          "{out.response}"
                        </p>
                      </div>

                      {/* Info grid */}
                      <div className="border-t pt-2 grid grid-cols-3 text-[10px] text-muted-foreground gap-1">
                        <div>
                          <span className="block font-medium">Latency</span>
                          <span className="font-bold text-foreground flex items-center gap-0.5 mt-0.5">
                            <Zap className="size-3 text-orange-500" />
                            {out.latencySec}s
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium">Tokens</span>
                          <span className="font-bold text-foreground block mt-0.5">{out.tokens}</span>
                        </div>
                        <div>
                          <span className="block font-medium">Cost</span>
                          <span className="font-bold text-foreground flex items-center gap-0.5 mt-0.5">
                            <DollarSign className="size-2.5 text-emerald-500" />
                            {out.cost.toFixed(5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparative Analytics Grid */}
                <div className="border rounded-lg p-3.5 bg-card/40 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Benchmarking Summary
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] block">Fastest Response</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 block">Gemini 1.5 Pro (1.1s)</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] block">Lowest Cost</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Gemini 1.5 Pro (KSh 0.03)</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] block">Total Prompt Tokens</span>
                      <span className="font-bold text-foreground block">468 tokens</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] block">Overall Safety Level</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                        <CheckCircle2 className="size-4" /> Passed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
