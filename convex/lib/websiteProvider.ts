// ─────────────────────────────────────────────────────────────────────────────
// Website Provider (stub)
//
// The Website Widget is pull-based: the widget subscribes to the Convex
// `messages.list` reactive query and gets updates in real-time. There is no
// need to "push" a reply — the message row in the database IS the delivery.
//
// Every method here is a deliberate no-op or unsupported marker so that the
// Dispatcher gracefully skips the external delivery step for website conversations.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ChannelProvider,
  ReceivedMessage,
  SendMessageArgs,
  SendResult,
  RefreshResult,
  HealthResult,
} from "./channelProvider";

export class WebsiteProvider implements ChannelProvider {
  async connect(_args: Record<string, unknown>): Promise<void> {
    // Website channels are always connected (no external service).
  }

  async disconnect(_args: Record<string, unknown>): Promise<void> {
    // No-op.
  }

  async refreshToken(_credentials: Record<string, unknown>): Promise<RefreshResult> {
    // No tokens to refresh.
    return { accessToken: "" };
  }

  async health(_credentials: Record<string, unknown>): Promise<HealthResult> {
    return { healthy: true, details: "Website provider is always healthy." };
  }

  /**
   * Website conversations are delivered via Convex reactive queries — the
   * message row itself is the delivery mechanism. No external push needed.
   * The Dispatcher skips this provider's sendMessage for website conversations.
   */
  async sendMessage(_args: SendMessageArgs): Promise<SendResult> {
    // The message is already in the DB when this is called.
    return { providerMessageId: "" };
  }

  async receiveMessage(_rawPayload: unknown): Promise<ReceivedMessage[]> {
    return [];
  }

  async uploadMedia(_args: {
    file: ArrayBuffer;
    mimeType: string;
    credentials: Record<string, unknown>;
  }): Promise<string> {
    throw new Error("WebsiteProvider: media upload not supported");
  }

  async downloadMedia(_args: {
    mediaId: string;
    credentials: Record<string, unknown>;
  }): Promise<{ data: ArrayBuffer; mimeType: string }> {
    throw new Error("WebsiteProvider: media download not supported");
  }

  async typing(_args: {
    to: string;
    credentials: Record<string, unknown>;
  }): Promise<void> {
    // Typing indicators for the website widget are handled via @convex-dev/presence.
  }

  async markRead(_args: {
    providerMessageId: string;
    credentials: Record<string, unknown>;
  }): Promise<void> {
    // No-op — read status is tracked client-side via lastReadByAgentAt.
  }

  async validateWebhook(_args: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): Promise<boolean> {
    // Widget messages arrive via Convex mutations (already authenticated by Convex auth).
    return true;
  }
}

export const websiteProvider = new WebsiteProvider();
