"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  Bot,
  Globe,
  Terminal,
  MessageSquareDashed,
  Activity,
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
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/app/_components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

type AdminSidebarProps = {
  setupNeeded: boolean;
};

const ADMIN_NAV = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { title: "AI Behavior", href: "/admin/ai-behavior", icon: Bot },
  { title: "Crawler Jobs", href: "/admin/crawler", icon: Globe },
  { title: "Safety & Guardrails", href: "/admin/guardrails", icon: ShieldAlert },
  { title: "Evaluation Playground", href: "/admin/playground", icon: Terminal },
  { title: "Escalation Hub", href: "/admin/escalations", icon: MessageSquareDashed },
  { title: "System Telemetry", href: "/admin/telemetry", icon: Activity },
  { title: "Workspaces", href: "/admin/workspaces", icon: Building2 },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Billing & Plans", href: "/admin/billing", icon: CreditCard },
];

export function AdminSidebar({ setupNeeded }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex h-14 items-center justify-between px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            href="/admin"
            className="flex items-center rounded-lg outline-none transition-opacity hover:opacity-90"
          >
            <BrandMark
              showWord
              className="gap-2.5 group-data-[collapsible=icon]:gap-0"
              wordClassName="group-data-[collapsible=icon]:hidden"
            />
          </Link>
        </div>

        {/* Global Admin Label Badge */}
        <div className="mx-3 mb-3 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-500 group-data-[collapsible=icon]:hidden">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span>Platform Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        {setupNeeded && (
          <div className="mx-2 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] leading-normal text-amber-500 group-data-[collapsible=icon]:hidden">
            <div className="flex gap-1.5 font-medium">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>Dev Mode Access</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              Configure <code className="font-mono text-amber-600 dark:text-amber-400">SUPER_ADMIN_EMAILS</code> in your env variables to secure this view in production.
            </p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
            Analytics & Audits
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {ADMIN_NAV.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-9 gap-2.5 rounded-lg font-medium text-sidebar-foreground/80 transition-colors data-[active=true]:bg-destructive/10 data-[active=true]:text-destructive data-[active=true]:[&>svg]:text-destructive"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Return to App"
                  className="h-9 gap-2.5 rounded-lg font-medium text-sidebar-foreground/60 hover:text-foreground"
                >
                  <Link href="/dashboard">
                    <ArrowLeft className="size-4" />
                    <span>Return to App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-between gap-2.5 rounded-lg px-1.5 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2.5">
            <UserButton appearance={{ elements: { rootBox: "shrink-0" } }} />
            <span className="truncate text-sm font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
              System Admin
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
