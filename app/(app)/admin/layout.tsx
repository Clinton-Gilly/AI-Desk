"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Loader2, ShieldAlert, Home, Settings } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminSidebar } from "./AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  const adminCheck = useQuery(
    api.admin.isAdminCheck,
    isAuthenticated ? {} : "skip"
  );

  // 1. Loading State (Glassmorphic Spinner)
  if (authLoading || adminCheck === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-radial from-background to-muted/20">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-soft">
            <span className="absolute inset-0 size-full animate-ping rounded-2xl bg-brand/10 opacity-75" />
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Authenticating Admin Access
            </h3>
            <p className="text-xs text-muted-foreground">
              Checking credentials on the platform...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Access Denied State (Premium visual representation of ShieldAlert)
  if (!adminCheck.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-radial from-background to-destructive/5 px-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-lg shadow-destructive/10 animate-bounce">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">
            Access Denied
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You do not have global administrator permissions. This area is reserved exclusively for platform operations.
          </p>
          {adminCheck.error && (
            <div className="mt-4 w-full rounded-lg bg-muted/60 p-3 text-left font-mono text-xs text-destructive border border-border/80 break-all">
              Debug details: {adminCheck.error}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand/90 hover:shadow-soft"
            >
              <Home className="size-4" />
              Back to Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/50"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Admin Layout (Sidebar + Content Shell)
  return (
    <SidebarProvider>
      <AdminSidebar setupNeeded={adminCheck.setupNeeded} />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 backdrop-blur-md lg:hidden">
          <SidebarTrigger className="-ml-1.5 text-muted-foreground" />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-5"
          />
          <span className="text-sm font-semibold tracking-tight">
            Admin
          </span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
