// ─────────────────────────────────────────────────────────────────────────────
// Channel Provider Interface
//
// Every communication channel (WhatsApp, Instagram, Messenger, Telegram, Email,
// Website) implements this interface. Nothing outside the provider layer needs
// to know which channel it is dealing with — the AI, inbox, automations, and
// dispatcher all speak to this contract only.
//
// Convention: methods that are no-ops for a given provider return void silently
// rather than throwing (e.g. WebsiteProvider.typing is a no-op because the
// widget polls; WhatsAppProvider.typing sends a typing indicator to Meta).
// ─────────────────────────────────────────────────────────────────────────────

import type { Id } from "../_generated/dataModel";

// ── Shared types ─────────────────────────────────────────────────────────────

export type ProviderType =
  | "website"
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "telegram"
  | "email";

export type DeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/** Credentials/config needed to send a message via WhatsApp. */
export interface WhatsAppSendCredentials {
  accessToken: string;
  phoneNumberId: string;
}

/** A message received from a provider (normalised from raw webhook payload). */
export interface ReceivedMessage {
  /** The provider's own message ID (e.g. Meta wamid). */
  providerMessageId: string;
  /** The sender's provider-specific user ID (phone, Instagram ID, etc.). */
  senderProviderUserId: string;
  /** Display name reported by the provider (may be empty). */
  senderDisplayName: string;
  /** Message type. */
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "voice"
    | "document"
    | "sticker"
    | "location"
    | "contacts"
    | "reaction"
    | "button"
    | "interactive"
    | "unknown";
  /** Plain text body (or synthesized text for non-text types). */
  body: string;
  /** Media info, populated for image/video/audio/voice/document/sticker. */
  media?: {
    id: string;           // provider media ID (needs download)
    mimeType?: string;
    caption?: string;
    fileName?: string;
    duration?: number;    // seconds (audio/video)
  };
  /** Location data for location messages. */
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  /** Unix timestamp (seconds) from provider. */
  timestamp: number;
  /** Raw provider-specific data (for debugging / future enrichment). */
  raw: Record<string, unknown>;
}

/** Arguments to send a text or media message. */
export interface SendMessageArgs {
  /** Customer's provider-specific user ID (phone number for WA). */
  to: string;
  body: string;
  /** Optional Convex Storage ID for media attachment. */
  mediaStorageId?: Id<"_storage">;
  mediaUrl?: string;
  mimeType?: string;
  caption?: string;
  /** Credentials required by the provider. */
  credentials: WhatsAppSendCredentials | Record<string, unknown>;
}

/** Result of a successful send. */
export interface SendResult {
  /** Provider's message ID (e.g. wamid for WhatsApp) */
  providerMessageId: string;
}

/** Result of refreshing an access token. */
export interface RefreshResult {
  accessToken: string;
  /** Unix ms timestamp of expiry (if known). */
  expiresAt?: number;
}

/** Health check result. */
export interface HealthResult {
  healthy: boolean;
  details?: string;
}

// ── Interface ─────────────────────────────────────────────────────────────────

/**
 * ChannelProvider — the contract every communication channel implements.
 *
 * WhatsAppProvider, WebsiteProvider, InstagramProvider, etc. all implement
 * this interface so the rest of the platform (AI, dispatcher, automations,
 * analytics) never has to know which channel it is dealing with.
 */
export interface ChannelProvider {
  // Lifecycle
  connect(args: Record<string, unknown>): Promise<void>;
  disconnect(args: Record<string, unknown>): Promise<void>;
  refreshToken(credentials: Record<string, unknown>): Promise<RefreshResult>;
  health(credentials: Record<string, unknown>): Promise<HealthResult>;

  // Messaging
  sendMessage(args: SendMessageArgs): Promise<SendResult>;
  receiveMessage(rawPayload: unknown): Promise<ReceivedMessage[]>;

  // Media
  uploadMedia(args: {
    file: ArrayBuffer;
    mimeType: string;
    credentials: Record<string, unknown>;
  }): Promise<string>;
  downloadMedia(args: {
    mediaId: string;
    credentials: Record<string, unknown>;
  }): Promise<{ data: ArrayBuffer; mimeType: string }>;

  // UX signals
  typing(args: { to: string; credentials: Record<string, unknown> }): Promise<void>;
  markRead(args: {
    providerMessageId: string;
    credentials: Record<string, unknown>;
  }): Promise<void>;

  // Security
  validateWebhook(args: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): Promise<boolean>;
}
