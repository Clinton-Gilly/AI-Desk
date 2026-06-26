"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Globe,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";

export default function AdminCrawlerPage() {
  const crawlJobs = useQuery(api.admin.listAllCrawlJobs);
  const retryCrawl = useMutation(api.admin.retryCrawlJobAdmin);
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filtered = crawlJobs?.filter((job) => {
    const queryStr = search.toLowerCase();
    return (
      job.workspaceName.toLowerCase().includes(queryStr) ||
      job.rootUrl.toLowerCase().includes(queryStr) ||
      job.status.toLowerCase().includes(queryStr)
    );
  });

  const handleRetry = async (jobId: any) => {
    setRetryingId(jobId);
    try {
      await retryCrawl({ jobId });
      toast.success("Crawl job re-scheduled successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry crawl");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1">
            <CheckCircle2 className="size-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold gap-1">
            <XCircle className="size-3" />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold gap-1 animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold gap-1">
            <Clock className="size-3" />
            Queued
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
          Crawl & Indexing Monitor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor platform-wide web crawler runs, verify generated vector chunks, and re-trigger indexing jobs.
        </p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Crawler Jobs
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {crawlJobs ? crawlJobs.length : <Skeleton className="h-9 w-20" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Runs initiated across all tenants</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
              Active Crawlers
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-500 flex items-center gap-2">
              {crawlJobs ? (
                crawlJobs.filter((j) => j.status === "running").length
              ) : (
                <Skeleton className="h-9 w-20" />
              )}
              {crawlJobs && crawlJobs.filter((j) => j.status === "running").length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Crawl routines actively scraping</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Total Crawled Pages
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-500">
              {crawlJobs ? (
                crawlJobs.reduce((acc, j) => acc + (j.pagesCrawled ?? 0), 0)
              ) : (
                <Skeleton className="h-9 w-20" />
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Indexed HTML pages added to KB</p>
          </CardContent>
        </Card>
      </div>

      {/* Crawl List Table */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by workspace, domain..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Showing {filtered?.length ?? 0} of {crawlJobs?.length ?? 0} jobs
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {crawlJobs === undefined ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered?.length === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Globe className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground">No crawl jobs found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                No active or historical crawling data matches your search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Root Domain</TableHead>
                    <TableHead className="text-center font-medium">Pages Crawled</TableHead>
                    <TableHead className="text-center font-medium">KB Chunks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((job) => (
                    <TableRow key={job._id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        {job.workspaceName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <a
                          href={job.rootUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-brand flex items-center gap-1 max-w-[280px] truncate"
                        >
                          {job.rootUrl}
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground text-xs">
                        {job.pagesCrawled} / {job.maxPages}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-foreground text-xs">
                        {job.chunksCreated}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(job.status)}
                          {job.error && (
                            <span className="text-[10px] text-red-500 flex items-center gap-1 font-medium max-w-[150px] truncate" title={job.error}>
                              <AlertTriangle className="size-3 shrink-0" />
                              {job.error}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3" />
                          {job.startedAt
                            ? new Date(job.startedAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs font-semibold px-2.5 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                          onClick={() => handleRetry(job._id)}
                          disabled={retryingId === job._id || job.status === "running"}
                        >
                          {retryingId === job._id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Play className="size-3" />
                          )}
                          Re-run
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
    </div>
  );
}
