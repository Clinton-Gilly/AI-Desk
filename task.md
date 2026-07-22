# WhatsApp Omnichannel Implementation Tasks

## Foundation
- `[x]` `convex/schema.ts` — 7 new tables + extend conversations + messages
- `[x]` `convex/lib/channelProvider.ts` — ChannelProvider interface + types
- `[x]` `convex/lib/websiteProvider.ts` — WebsiteProvider stub
- `[x]` `convex/lib/whatsappProvider.ts` — WhatsApp API client functions
- `[x]` `convex/dispatcher.ts` — enqueueOutbound helper + internal mutations
- `[x]` `convex/dispatcherNode.ts` — "use node" processOutboundMessage action (with retry)

## Backend
- `[x]` `convex/channels.ts` — Channel CRUD (admin-gated)
- `[x]` `convex/contacts.ts` — Contacts + ContactIdentities (resolveOrCreate)
- `[x]` `convex/whatsapp.ts` — Rewrite: new tables, all message types, contact resolution
- `[x]` `convex/whatsappNode.ts` — Add downloadMedia, sendViaWhatsApp, refreshToken, migrate helper
- `[x]` `convex/messages.ts` — Hook dispatcher after sendFromAgent
- `[x]` `convex/agent/runHelpers.ts` — Hook dispatcher in finalizeAgentMessage
- `[x]` `convex/http.ts` — HMAC security + all WA message types + status webhooks + logging
- `[x]` `convex/crons.ts` — Daily token refresh cron

## UI
- `[x]` `app/(app)/dashboard/channels/page.tsx` — Reconnect, Test Webhook, Last Sync, Token expiry warning
