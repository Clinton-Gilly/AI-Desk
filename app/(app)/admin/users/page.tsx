"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Users,
  Search,
  Mail,
  Shield,
  ShieldAlert,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
  const users = useQuery(api.admin.listUsers);
  const [search, setSearch] = useState("");

  const filtered = users?.filter((u) => {
    const queryStr = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(queryStr) ||
      u.email.toLowerCase().includes(queryStr) ||
      u.workspaceName.toLowerCase().includes(queryStr) ||
      u.role.toLowerCase().includes(queryStr) ||
      u.status.toLowerCase().includes(queryStr)
    );
  });

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge variant="destructive" className="text-[10px] gap-1 font-semibold px-2 py-0.5 border-red-500/20">
          <Shield className="size-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] gap-1 font-semibold px-2 py-0.5 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Users className="size-3" />
        Support
      </Badge>
    );
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "active") {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8 bg-muted/10 h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
            User Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A centralized directory of all registered organization administrators and support operators.
          </p>
        </div>
      </div>

      {/* Directory Table Card */}
      <Card className="border-border bg-card/60 backdrop-blur-md shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, workspace..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Showing {filtered?.length ?? 0} of {users?.length ?? 0} operators
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {users === undefined ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered?.length === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Users className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground">No operators found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                No system members match your search criteria. Check spelling or try a different query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Operator</TableHead>
                    <TableHead>Workspace Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((u) => (
                    <TableRow key={u._id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border shadow-soft">
                            {u.imageUrl ? <AvatarImage src={u.imageUrl} /> : null}
                            <AvatarFallback className="bg-brand/10 text-xs font-bold text-brand">
                              {u.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-foreground font-semibold truncate max-w-[200px]">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                              <Mail className="size-3 shrink-0" />
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                          <Building className="size-3.5 shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{u.workspaceName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(u.role)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-[10px] px-2 py-0.5 ${getStatusBadgeColor(u.status)}`}
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground" />
                          {new Date(u._creationTime).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
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
