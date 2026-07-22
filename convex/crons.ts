// ─────────────────────────────────────────────────────────────────────────────
// Convex Cron Jobs
//
// whatsappTokenRefresh: Runs daily at 03:00 UTC.
//   Checks all connected WhatsApp channels; schedules a token refresh for any
//   that expire within 7 days. Meta long-lived tokens last 60 days. Refreshing
//   with 7-day headroom ensures no downtime if cron skips a day.
// ─────────────────────────────────────────────────────────────────────────────

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 03:00 UTC — check WhatsApp token expiry across all workspaces.
crons.cron(
  "whatsapp-token-refresh",
  "0 3 * * *", // every day at 03:00 UTC
  internal.whatsapp.checkTokenExpiry,
  {}, // no args
);

export default crons;
