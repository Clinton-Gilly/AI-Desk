"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Inbox,
  Users,
  BookOpen,
  Palette,
  UsersRound,
  CreditCard,
  Settings,
  ShieldCheck,
  Globe,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/app/_components/brand-mark";
import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Exact-match only (e.g. the index route) vs prefix-match for sub-routes. */
  exact?: boolean;
};

const NAV: NavItem[] = [
  { title: "Inbox", href: "/dashboard", icon: Inbox, exact: true },
  { title: "Leads", href: "/dashboard/leads", icon: Users },
  { title: "Knowledge", href: "/dashboard/knowledge", icon: BookOpen },
  { title: "Channels", href: "/dashboard/channels", icon: Globe },
  { title: "Customizer", href: "/dashboard/customizer", icon: Palette },
  { title: "Team", href: "/dashboard/team", icon: UsersRound },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

const SECONDARY_NAV: NavItem[] = [
  { title: "Setup", href: "/dashboard/setup", icon: Settings },
];

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();

  // The sidebar renders OUTSIDE OrgGuard, so we must not fire workspace-scoped
  // queries until the workspace is confirmed to exist — otherwise queueCounts
  // throws WORKSPACE_NOT_FOUND (e.g. before OrgGuard's self-heal lands) and the
  // uncaught error crashes the whole layout. Gate on getActiveWorkspace first.
  const active = useQuery(
    api.workspaces.getActiveWorkspace,
    isAuthenticated ? {} : "skip",
  );
  const adminCheck = useQuery(
    api.admin.isAdminCheck,
    isAuthenticated ? {} : "skip",
  );
  const isAdmin = adminCheck?.isAdmin === true;
  const workspaceReady = active?.ok === true;

  // Live sidebar badges. `queueCounts` is reactive + workspace-scoped. We surface
  // the "needs attention" signal on the Inbox item: unread takes priority, with
  // unassigned as the fallback so an admin sees the team queue depth at a glance.
  const counts = useQuery(api.inbox.queueCounts, workspaceReady ? {} : "skip");
  const inboxBadge = counts
    ? counts.unread > 0
      ? counts.unread
      : counts.unassigned > 0
        ? counts.unassigned
        : 0
    : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
        {/* Brand lockup — mirrors the marketing BrandMark for cohesion. Collapses
            to just the glyph when the sidebar is in icon mode. */}
        <div className="flex h-14 items-center px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            href="/dashboard"
            aria-label="MyChat dashboard"
            className="flex items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <BrandMark
              showWord
              className="gap-2.5 group-data-[collapsible=icon]:gap-0"
              wordClassName="group-data-[collapsible=icon]:hidden"
            />
          </Link>
        </div>
        <div className="flex items-center px-2 pb-2 group-data-[collapsible=icon]:hidden">
          {/* hidePersonal: B2B — all work happens inside an org. Switching/
              creating an org sets the active org, which emits the org claims
              into the Convex JWT. The OrgGuard re-resolves reactively. */}
          <ClerkLoading>
            <div className="h-9 w-full animate-pulse rounded-lg bg-sidebar-accent/50" />
          </ClerkLoading>
          <ClerkLoaded>
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/dashboard"
              afterCreateOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/onboarding"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full justify-start rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-2 hover:bg-sidebar-accent",
                },
              }}
            />
          </ClerkLoaded>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV.map((item) => {
                const isActive = isItemActive(pathname, item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-9 gap-2.5 rounded-lg font-medium text-sidebar-foreground/80 transition-colors data-[active=true]:bg-brand/10 data-[active=true]:text-brand data-[active=true]:[&>svg]:text-brand"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/dashboard" && inboxBadge > 0 ? (
                      <SidebarMenuBadge className="bg-brand text-[var(--brand-text)] peer-data-[active=true]/menu-button:text-white">
                        {inboxBadge > 99 ? "99+" : inboxBadge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {SECONDARY_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isItemActive(pathname, item)}
                    tooltip={item.title}
                    className="h-9 gap-2.5 rounded-lg font-medium text-sidebar-foreground/80 transition-colors data-[active=true]:bg-brand/10 data-[active=true]:text-brand data-[active=true]:[&>svg]:text-brand"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
              Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Admin Dashboard"
                    className="h-9 gap-2.5 rounded-lg font-medium text-sidebar-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive hover:[&>svg]:text-destructive"
                  >
                    <Link href="/admin">
                      <ShieldCheck className="size-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-between gap-2.5 rounded-lg px-1.5 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2.5">
            <ClerkLoading>
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-sidebar-accent/50" />
            </ClerkLoading>
            <ClerkLoaded>
              <UserButton appearance={{ elements: { rootBox: "shrink-0" } }} />
            </ClerkLoaded>
            <span className="truncate text-sm font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
              Account
            </span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
