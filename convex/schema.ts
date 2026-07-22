import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reconciled application schema. All NEW tenant/AI/status fields are added as
// `v.optional(...)` and STAY optional permanently — presence is enforced in
// code (e.g. `requireOrgMember` throws if claims/org are absent), never by a
// schema-tightening re-push that would race live widget writes.
//
// NOTE: `@convex-dev/agent` owns its own threads/messages/streamDeltas tables
// internally (registered in convex.config.ts). We do NOT redefine them here.
// Our `conversations` row bridges to an agent thread via the optional
// `threadId` field (wired up in Phase 4). Our `messages` table remains the
// tenant-facing transcript the live widget already subscribes to.
//
// `@convex-dev/rate-limiter` also owns its own tables, so there is no custom
// rate-limit table in this schema.
export default defineSchema({
  // ── TENANT ────────────────────────────────────────────────────────────────
  workspaces: defineTable({
    name: v.string(),
    ownerClerkUserId: v.string(), // kept: creator convenience, NOT the auth boundary
    clerkOrgId: v.optional(v.string()), // Clerk Organization id — REAL tenant key (enforced in code)
    slug: v.optional(v.string()),
    aiProvider: v.optional(v.union(v.literal("openai"), v.literal("gemini"))),
  })
    .index("by_owner", ["ownerClerkUserId"])
    .index("by_org", ["clerkOrgId"]),

  // Mirror of Clerk org memberships (webhook-synced, idempotent upserts).
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("support")),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // Clerk CDN URL (string, NOT _storage)
    // Admin-set widget avatar (Convex _storage). When present it overrides the
    // Clerk `imageUrl` everywhere the member's avatar is shown (widget header,
    // inbox, team roster). Cleared by setting back to undefined.
    customAvatarStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("active"), v.literal("removed")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_org_user", ["clerkOrgId", "clerkUserId"]) // webhook upsert key
    .index("by_workspace_role", ["workspaceId", "role"]),

  // ── CONVERSATIONS / MESSAGES ───────────────────────────────────────────────
  conversations: defineTable({
    workspaceId: v.id("workspaces"),
    visitorId: v.string(), // anonymous id minted client-side, stored in localStorage
    visitorName: v.string(),
    lastMessageAt: v.number(),
    mode: v.optional(v.union(v.literal("ai"), v.literal("human"))), // default "ai" (set in code on create)
    status: v.optional(v.union(v.literal("open"), v.literal("closed"))), // ("snoozed" deferred)
    assignedClerkUserId: v.optional(v.string()), // undefined = unassigned queue
    assignedAt: v.optional(v.number()),
    lastVisitorMessageAt: v.optional(v.number()),
    lastReadByAgentAt: v.optional(v.number()),
    pendingAgentJobId: v.optional(v.id("_scheduled_functions")), // debounce/idempotency lock (opportunistic cancel only)
    agentRunEpoch: v.optional(v.number()), // bumped on takeover/new-msg to abort in-flight runs
    threadId: v.optional(v.string()), // bridge to @convex-dev/agent thread (set in Phase 4)
    // ── OMNICHANNEL (additive, optional, fully backward-compatible) ─────────
    // provider = which channel created this conversation. Legacy widget rows
    // have provider=undefined; treat as "website" everywhere in code.
    provider: v.optional(v.union(
      v.literal("website"),
      v.literal("whatsapp"),
      v.literal("instagram"),
      v.literal("messenger"),
      v.literal("telegram"),
      v.literal("email"),
    )),
    channelId: v.optional(v.id("channels")),     // → channels._id
    contactId: v.optional(v.id("contacts")),     // → contacts._id (null for anon widget)
    // Richer state machine: superset of mode+status for automation/analytics.
    conversationState: v.optional(v.union(
      v.literal("ai"),              // AI is handling
      v.literal("waiting_agent"),   // AI escalated, awaiting human pickup
      v.literal("human"),           // human agent owns it
      v.literal("waiting_customer"),// agent replied, awaiting customer
      v.literal("resolved"),        // resolved/closed
    )),
  })
    .index("by_workspace", ["workspaceId", "lastMessageAt"])
    .index("by_workspace_visitor", ["workspaceId", "visitorId"])
    .index("by_workspace_status", ["workspaceId", "status", "lastMessageAt"])
    .index("by_workspace_assignee", [
      "workspaceId",
      "assignedClerkUserId",
      "lastMessageAt",
    ])
    .index("by_workspace_mode", ["workspaceId", "mode", "lastMessageAt"])
    .index("by_workspace_provider", ["workspaceId", "provider", "lastMessageAt"])
    .index("by_channel", ["channelId", "lastMessageAt"]),

  // Tenant-facing transcript. The live widget reads this via `messages.list` —
  // KEEP intact. New fields are additive + optional.
  messages: defineTable({
    conversationId: v.id("conversations"),
    author: v.union(
      v.literal("visitor"),
      v.literal("agent"), // human OR AI text — disambiguate with isAi
      v.literal("system"), // "Sonny joined", "Returned to AI", assignment notices
    ),
    body: v.string(),
    isAi: v.optional(v.boolean()), // true ⇒ AI-authored agent message
    authorClerkUserId: v.optional(v.string()),
    pending: v.optional(v.boolean()), // streaming placeholder (token-batched updates)
    citations: v.optional(
      v.array(
        v.object({
          chunkId: v.optional(v.id("knowledgeChunks")), // best-effort: chunks re-minted on re-embed
          title: v.optional(v.string()), // resolved + authoritative (survives chunk deletion)
          url: v.optional(v.string()),
        }),
      ),
    ),
    // Rich action "widget" attached to an AI message — e.g. an upgrade card that
    // links to the billing page. Produced by the `send_upgrade_link` agent tool
    // and rendered as an interactive card in the widget transcript.
    upgradeCard: v.optional(
      v.object({
        title: v.string(),
        description: v.string(),
        ctaLabel: v.string(),
        url: v.string(),
      }),
    ),
    // ── DELIVERY TRACKING (WhatsApp and future channels) ───────────────────
    waMessageId: v.optional(v.string()),       // provider message id (for status callbacks)
    deliveryStatus: v.optional(v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    )),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_wa_message_id", ["waMessageId"]),

  // ── LEADS ──────────────────────────────────────────────────────────────────
  leads: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.optional(v.id("conversations")),
    visitorId: v.optional(v.string()), // dedupe a visitor's lead
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.string(), // required; server-validated + length-capped
    phone: v.optional(v.string()),
    source: v.string(), // "widget" | "proactive"
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("closed"),
    ),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId", "createdAt"])
    .index("by_workspace_email", ["workspaceId", "email"])
    .index("by_workspace_status", ["workspaceId", "status", "createdAt"])
    .index("by_workspace_visitor", ["workspaceId", "visitorId"])
    .index("by_conversation", ["conversationId"]),

  // ── KNOWLEDGE BASE ─────────────────────────────────────────────────────────
  helpdeskArticles: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    bodyMarkdown: v.string(), // rich content as markdown (<1 MiB)
    excerpt: v.optional(v.string()),
    searchableText: v.string(), // title + excerpt + stripped body — single searchField
    coverImageStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("draft"), v.literal("published")),
    isPopular: v.boolean(),
    order: v.number(),
    authorClerkUserId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId", "order"])
    .index("by_workspace_slug", ["workspaceId", "slug"])
    .index("by_workspace_category", ["workspaceId", "category", "order"])
    .index("by_workspace_status", ["workspaceId", "status", "order"])
    .index("by_workspace_popular", ["workspaceId", "isPopular", "order"])
    .searchIndex("search_articles", {
      searchField: "searchableText",
      filterFields: ["workspaceId", "status", "category"],
    }),

  knowledgeChunks: defineTable({
    workspaceId: v.id("workspaces"),
    source: v.union(
      v.literal("crawl"),
      v.literal("article"),
      v.literal("file"),
    ),
    articleId: v.optional(v.id("helpdeskArticles")),
    crawlJobId: v.optional(v.id("crawlJobs")),
    sourceUrl: v.optional(v.string()),
    title: v.string(),
    text: v.string(), // ~500–1500 tokens
    chunkIndex: v.number(),
    tokenCount: v.number(),
    contentHash: v.string(), // sha256(text) — dedupe/idempotency
    embedding: v.array(v.float64()), // length MUST equal 1536
  })
    .index("by_workspace_source", ["workspaceId", "source"]) // post-hydration source narrowing
    .index("by_article", ["articleId"])
    .index("by_crawlJob", ["crawlJobId"])
    .index("by_workspace_hash", ["workspaceId", "contentHash"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // text-embedding-3-small native — LOCKED
      filterFields: ["workspaceId"], // ONLY workspaceId — vector filter cannot AND two fields
    }),

  crawlJobs: defineTable({
    workspaceId: v.id("workspaces"),
    rootUrl: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    maxPages: v.number(),
    maxDepth: v.number(),
    pagesDiscovered: v.number(),
    pagesCrawled: v.number(),
    chunksCreated: v.number(),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  crawlQueue: defineTable({
    // per-job frontier (one row/URL; avoids 1-MiB doc)
    crawlJobId: v.id("crawlJobs"),
    workspaceId: v.id("workspaces"),
    url: v.string(),
    depth: v.number(),
    state: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
  })
    .index("by_job_state", ["crawlJobId", "state"])
    .index("by_job_url", ["crawlJobId", "url"]),

  // ── WIDGET CONFIG ──────────────────────────────────────────────────────────
  widgetAppearance: defineTable({
    workspaceId: v.id("workspaces"),
    themeColor: v.string(),
    buttonColor: v.string(),
    cornerRadius: v.number(),
    title: v.string(),
    titleColor: v.string(),
    logoStorageId: v.optional(v.id("_storage")), // validated MIME+size on finalize; SVG rejected
    position: v.union(v.literal("bottom-right"), v.literal("bottom-left")),
    bottomMargin: v.number(),
    sideMargin: v.number(),
    notificationSound: v.boolean(),
  }).index("by_workspace", ["workspaceId"]),

  widgetSettings: defineTable({
    workspaceId: v.id("workspaces"),
    proactiveMessage: v.object({
      enabled: v.boolean(),
      delaySeconds: v.number(),
      text: v.string(),
    }),
    leadCapture: v.object({
      enabled: v.boolean(),
      requiredFields: v.array(
        v.union(
          v.literal("firstName"),
          v.literal("lastName"),
          v.literal("email"),
          v.literal("phone"),
        ),
      ),
    }),
    faqEnabled: v.boolean(),
  }).index("by_workspace", ["workspaceId"]),

  // ── BILLING PLANS (dynamic plans) ───────────────────────────────────────────
  billingPlans: defineTable({
    key: v.string(), // e.g., "free_org", "pro", "scale"
    name: v.string(),
    priceMonthly: v.number(), // Price in KES
    priceYearly: v.optional(v.number()), // Price in KES for annual billing (0 or undefined = no annual option)
    trialDays: v.optional(v.number()), // Number of free trial days (0 or undefined = no trial)
    tagline: v.string(),
    highlighted: v.boolean(), // For the popular tier badge
    features: v.array(v.string()), // e.g., ["ai_messages", "website_crawl", ...]
    limits: v.object({
      aiMessagesPerMonth: v.number(),
      kbDocuments: v.number(),
      crawlPages: v.number(),
      seats: v.number(),
      conversationsPerMonth: v.optional(v.number()),
      dataRetentionDays: v.optional(v.number()),
    }),
  }).index("by_key", ["key"]),

  // ── BILLING MIRROR (webhook-written; read-only cache for Convex gating) ─────
  subscriptions: defineTable({
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    subscriptionId: v.string(),
    subscriptionItemId: v.optional(v.string()), // plan+status live here (subscriptionItem.* is primary signal)
    planSlug: v.string(), // "free_org" | "pro" | "scale"
    status: v.union(
      // normalized from Clerk camelCase events
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("ended"),
      v.literal("incomplete"),
      v.literal("expired"),
    ),
    seats: v.number(),
    features: v.array(v.string()),
    limits: v.object({
      aiMessagesPerMonth: v.number(),
      kbDocuments: v.number(),
      crawlPages: v.number(),
      seats: v.number(),
      conversationsPerMonth: v.optional(v.number()),
      dataRetentionDays: v.optional(v.number()),
    }),
    currentPeriodStart: v.optional(v.number()), // drives usage bucket window
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    annualBilling: v.optional(v.boolean()),
    couponCode: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
    overageAiMessages: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_org", ["clerkOrgId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_subscription_item", ["subscriptionItemId"]),

  usage: defineTable({
    // quota counters keyed to billing period, not calendar month
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    periodStart: v.number(), // = subscription currentPeriodStart (aligns quota to billing cycle)
    aiMessages: v.number(),
    kbDocuments: v.number(),
    conversations: v.optional(v.number()),
    overageAiMessages: v.optional(v.number()),
  }).index("by_workspace_period", ["workspaceId", "periodStart"]),

  coupons: defineTable({
    code: v.string(),
    discountPercent: v.number(),
    maxUses: v.number(),
    usedCount: v.number(),
    expiresAt: v.optional(v.number()),
    createdBy: v.string(), // Admin email
    active: v.boolean(),
  }).index("by_code", ["code"]),

  addOnPacks: defineTable({
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    type: v.union(v.literal("ai_messages"), v.literal("kb_documents")),
    quantity: v.number(),
    remainingQuantity: v.number(),
    purchasedAt: v.number(),
    expiresAt: v.optional(v.number()),
    mpesaReceiptNumber: v.string(),
  }).index("by_workspace", ["workspaceId"]),

  globalSettings: defineTable({
    guardrailsEnabled: v.boolean(),
    blockedKeywords: v.array(v.string()),
    piiRedactionEnabled: v.boolean(),
    systemSafetyPrompt: v.string(),
  }),

  mpesaTransactions: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    clerkOrgId: v.string(),
    phoneNumber: v.string(),
    amount: v.number(),
    checkoutRequestID: v.string(),
    merchantRequestID: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    mpesaReceiptNumber: v.optional(v.string()),
    planSlug: v.string(),
    isAnnual: v.optional(v.boolean()),
    couponCode: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_checkout_id", ["checkoutRequestID"])
    .index("by_workspace", ["workspaceId", "createdAt"]),

  // ── WHATSAPP CHANNEL (Meta Embedded Signup) ────────────────────────────────
  // One row per workspace. Created/updated when the owner completes the Meta
  // Embedded Signup flow. All credential fields are optional so the row can be
  // created in a "pending" state while the code→token exchange is in flight.
  whatsappChannels: defineTable({
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    // Meta identifiers
    wabaId: v.optional(v.string()),           // WhatsApp Business Account ID
    phoneNumberId: v.optional(v.string()),     // Phone Number object ID
    phoneNumber: v.optional(v.string()),       // Human-readable display number, e.g. "+1 555 123 4567"
    displayName: v.optional(v.string()),       // Business display name from Meta
    // Credentials
    accessToken: v.optional(v.string()),       // System-user / page access token
    // Lifecycle
    status: v.union(
      v.literal("pending"),     // code received, token exchange in-flight
      v.literal("connected"),   // credentials saved and active
      v.literal("error"),       // exchange failed
      v.literal("disconnected"),// user manually disconnected
    ),
    errorMessage: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_org", ["clerkOrgId"])
    .index("by_phone_number_id", ["phoneNumberId"]),

  // ── OMNICHANNEL: CHANNEL REGISTRY ─────────────────────────────────────────
  // Generic channel entity. One org can have multiple channels of different
  // providers ("WhatsApp Sales", "WhatsApp Support", "Instagram DMs", ...).
  // Provider-specific credentials live in companion tables (whatsappConnections).
  channels: defineTable({
    workspaceId: v.id("workspaces"),
    clerkOrgId: v.string(),
    provider: v.union(
      v.literal("website"),
      v.literal("whatsapp"),
      v.literal("instagram"),
      v.literal("messenger"),
      v.literal("telegram"),
      v.literal("email"),
    ),
    displayName: v.string(),       // e.g. "WhatsApp Sales", "Instagram DMs"
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("error"),
      v.literal("pending"),
    ),
    connectedAt: v.optional(v.number()),
    lastActivityAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_org", ["clerkOrgId"])
    .index("by_workspace_provider", ["workspaceId", "provider"]),

  // WhatsApp-specific credentials for a channel (keyed to channels._id).
  // Separated so credentials never leak through generic channel queries.
  whatsappConnections: defineTable({
    channelId: v.id("channels"),
    workspaceId: v.id("workspaces"),     // denormalized for index queries
    // Meta identifiers
    businessId: v.optional(v.string()),
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    displayName: v.optional(v.string()),
    // Credentials (accessToken excluded from all client-facing queries)
    accessToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    // Lifecycle
    status: v.union(
      v.literal("pending"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    errorMessage: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    lastSync: v.optional(v.number()),
    lastWebhookAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_phone_number_id", ["phoneNumberId"]),  // O(1) webhook lookup

  // ── CONTACTS + IDENTITIES ─────────────────────────────────────────────────
  // contacts: canonical person record — distinct from leads (which are
  // email-captured). Contacts are channel-identified provider users.
  contacts: defineTable({
    workspaceId: v.id("workspaces"),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId", "lastSeenAt"]),

  // contactIdentities: maps one Contact to many provider identities.
  // Example: John → WhatsApp +254..., Instagram @john, email john@gmail.com
  contactIdentities: defineTable({
    contactId: v.id("contacts"),
    workspaceId: v.id("workspaces"),   // denormalized for indexed queries
    provider: v.union(
      v.literal("website"),
      v.literal("whatsapp"),
      v.literal("instagram"),
      v.literal("messenger"),
      v.literal("telegram"),
      v.literal("email"),
    ),
    providerUserId: v.string(),        // phone, Instagram ID, email, visitorId, etc.
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastSeenAt: v.number(),
  })
    .index("by_workspace_provider_user", ["workspaceId", "provider", "providerUserId"])
    .index("by_contact", ["contactId"]),

  // ── ATTACHMENTS ─────────────────────────────────────────────────────────────
  // One message → many attachments. Avoids nullable field sprawl on messages.
  attachments: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),   // denormalized for efficient queries
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex Storage (after download)
    externalUrl: v.optional(v.string()),     // original provider URL (pre-download)
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),        // bytes
    duration: v.optional(v.number()),        // seconds (audio/video)
    thumbnailStorageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
    transcript: v.optional(v.string()),      // STT result (audio/voice)
    status: v.union(
      v.literal("pending"),   // queued for download from provider
      v.literal("stored"),    // safely in Convex Storage
      v.literal("failed"),
    ),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"])
    .index("by_workspace", ["workspaceId"]),

  // ── OUTGOING MESSAGE QUEUE ─────────────────────────────────────────────────
  // Every outbound message is written here before delivery. The Dispatcher
  // reads from this queue, delivers via the appropriate ChannelProvider, and
  // updates delivery status. Enables reliability, retry, and observability.
  outgoingMessages: defineTable({
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    workspaceId: v.id("workspaces"),
    channelId: v.id("channels"),
    provider: v.string(),
    // Delivery
    status: v.union(
      v.literal("queued"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    providerMessageId: v.optional(v.string()),  // e.g. Meta wamid
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"])
    .index("by_workspace_status", ["workspaceId", "status", "createdAt"]),

  // ── WEBHOOK LOGS ──────────────────────────────────────────────────────────
  // Observability: every inbound webhook event logged (truncated to 8 KB).
  webhookLogs: defineTable({
    channelId: v.optional(v.id("channels")),
    workspaceId: v.optional(v.id("workspaces")),
    provider: v.string(),
    event: v.string(),                  // e.g. "message.text", "status.delivered"
    payload: v.string(),                // JSON string, truncated to 8 KB
    processingStatus: v.union(
      v.literal("ok"),
      v.literal("error"),
      v.literal("ignored"),
    ),
    errorMessage: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId", "receivedAt"])
    .index("by_channel", ["channelId", "receivedAt"])
    .index("by_provider", ["provider", "receivedAt"]),
});
