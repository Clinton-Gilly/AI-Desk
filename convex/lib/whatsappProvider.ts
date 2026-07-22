// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Provider
//
// Pure API-client functions for the Meta WhatsApp Cloud API v20.0.
// No Convex context here — all functions are plain async functions that take
// credentials + data and return results. The Dispatcher action in
// dispatcherNode.ts calls these from its "use node" context.
//
// References:
//   https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
//   https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ChannelProvider,
  ReceivedMessage,
  SendMessageArgs,
  SendResult,
  RefreshResult,
  HealthResult,
} from "./channelProvider";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

// ── Send helpers ──────────────────────────────────────────────────────────────

/** Send a plain text message via the WhatsApp Cloud API. */
export async function sendWhatsAppText(
  phoneNumberId: string,
  to: string,
  body: string,
  accessToken: string,
): Promise<{ wamid: string }> {
  const cleanTo = to.replace(/\D/g, "");
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "text",
      text: { body, preview_url: false },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${err}`);
  }
  const json = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };
  if (json.error) throw new Error(`WhatsApp API error: ${json.error.message}`);
  const wamid = json.messages?.[0]?.id ?? "";
  return { wamid };
}

/** Send a media message (image, document, audio, video). */
export async function sendWhatsAppMedia(
  phoneNumberId: string,
  to: string,
  mediaType: "image" | "document" | "audio" | "video" | "sticker",
  mediaUrl: string,
  caption: string | undefined,
  filename: string | undefined,
  accessToken: string,
): Promise<{ wamid: string }> {
  const cleanTo = to.replace(/\D/g, "");
  const mediaObj: Record<string, unknown> = { link: mediaUrl };
  if (caption) mediaObj.caption = caption;
  if (filename && (mediaType === "document")) mediaObj.filename = filename;

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: mediaType,
      [mediaType]: mediaObj,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp media send failed (${res.status}): ${err}`);
  }
  const json = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };
  if (json.error) throw new Error(`WhatsApp API error: ${json.error.message}`);
  return { wamid: json.messages?.[0]?.id ?? "" };
}

// ── Media download ────────────────────────────────────────────────────────────

/** Fetch the temporary download URL for a WhatsApp media object. */
export async function getWhatsAppMediaUrl(
  mediaId: string,
  accessToken: string,
): Promise<{ url: string; mimeType: string; fileSize: number }> {
  const res = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Media URL fetch failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as {
    url: string;
    mime_type: string;
    file_size: number;
    error?: { message: string };
  };
  if (json.error) throw new Error(`WhatsApp media error: ${json.error.message}`);
  return { url: json.url, mimeType: json.mime_type, fileSize: json.file_size };
}

/** Download raw bytes from a WhatsApp media URL. */
export async function downloadWhatsAppMedia(
  mediaUrl: string,
  accessToken: string,
): Promise<{ data: ArrayBuffer; mimeType: string }> {
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Media download failed (${res.status})`);
  }
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const data = await res.arrayBuffer();
  return { data, mimeType };
}

// ── Token management ──────────────────────────────────────────────────────────

/** Exchange a short-lived token for a long-lived one (60 days). */
export async function exchangeForLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    error?: { message: string };
  };
  if (json.error) throw new Error(`Token exchange error: ${json.error.message}`);
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

/** Debug a token to extract WABA scopes and business ID. */
export async function debugToken(
  accessToken: string,
  appId: string,
  appSecret: string,
): Promise<{ wabaId: string | null; businessId: string | null }> {
  const appToken = `${appId}|${appSecret}`;
  const url = new URL(`${GRAPH_BASE}/debug_token`);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set("access_token", appToken);

  const res = await fetch(url.toString());
  if (!res.ok) return { wabaId: null, businessId: null };
  const json = (await res.json()) as {
    data?: {
      granular_scopes?: { scope: string; target_ids?: string[] }[];
    };
  };

  const scopes = json.data?.granular_scopes ?? [];
  const wabaScope = scopes.find(
    (s) => s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging",
  );
  const wabaId = wabaScope?.target_ids?.[0] ?? null;
  return { wabaId, businessId: null };
}

/** List phone numbers for a WABA. */
export async function listPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<{ id: string; displayPhoneNumber: string; verifiedName: string }[]> {
  const res = await fetch(
    `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: { id: string; display_phone_number: string; verified_name: string }[];
  };
  return (json.data ?? []).map((p) => ({
    id: p.id,
    displayPhoneNumber: p.display_phone_number,
    verifiedName: p.verified_name,
  }));
}

// ── HMAC signature verification (V8 Web Crypto) ───────────────────────────────

/**
 * Verify the X-Hub-Signature-256 header from Meta.
 * Uses Web Crypto API — compatible with both V8 and Node runtimes.
 */
export async function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  try {
    if (!signature.startsWith("sha256=")) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const expected = `sha256=${hashHex}`;

    // Timing-safe comparison
    if (signature.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

// ── Payload parsing ───────────────────────────────────────────────────────────

/** Parse a raw WhatsApp webhook message object into a normalised ReceivedMessage. */
export function parseWhatsAppMessage(
  msg: Record<string, unknown>,
): ReceivedMessage | null {
  const type = msg.type as string;
  const from = msg.from as string;
  const id = msg.id as string;
  const ts = parseInt(msg.timestamp as string, 10) || Date.now() / 1000;

  let body = "";
  let media: ReceivedMessage["media"] | undefined;
  let location: ReceivedMessage["location"] | undefined;
  let normType: ReceivedMessage["type"] = "unknown";

  switch (type) {
    case "text": {
      const t = msg.text as { body: string };
      body = t?.body ?? "";
      normType = "text";
      break;
    }
    case "image": {
      const m = msg.image as { id: string; mime_type?: string; caption?: string };
      body = m?.caption ? `📷 ${m.caption}` : "📷 Image";
      media = { id: m.id, mimeType: m.mime_type, caption: m.caption };
      normType = "image";
      break;
    }
    case "video": {
      const m = msg.video as { id: string; mime_type?: string; caption?: string };
      body = m?.caption ? `🎥 ${m.caption}` : "🎥 Video";
      media = { id: m.id, mimeType: m.mime_type, caption: m.caption };
      normType = "video";
      break;
    }
    case "audio": {
      const m = msg.audio as { id: string; mime_type?: string };
      body = "🎵 Audio message";
      media = { id: m.id, mimeType: m.mime_type };
      normType = "audio";
      break;
    }
    case "voice": {
      const m = msg.voice as { id: string; mime_type?: string };
      body = "🎤 Voice message";
      media = { id: m.id, mimeType: m.mime_type };
      normType = "voice";
      break;
    }
    case "document": {
      const m = msg.document as {
        id: string;
        mime_type?: string;
        filename?: string;
        caption?: string;
      };
      body = m?.filename ? `📄 ${m.filename}` : "📄 Document";
      media = {
        id: m.id,
        mimeType: m.mime_type,
        caption: m.caption,
        fileName: m.filename,
      };
      normType = "document";
      break;
    }
    case "sticker": {
      const m = msg.sticker as { id: string; mime_type?: string };
      body = "🎭 Sticker";
      media = { id: m.id, mimeType: m.mime_type };
      normType = "sticker";
      break;
    }
    case "location": {
      const l = msg.location as {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
      };
      body = l?.name
        ? `📍 ${l.name}${l.address ? `, ${l.address}` : ""}`
        : `📍 Location (${l?.latitude}, ${l?.longitude})`;
      location = {
        latitude: l.latitude,
        longitude: l.longitude,
        name: l.name,
        address: l.address,
      };
      normType = "location";
      break;
    }
    case "contacts": {
      const contacts = msg.contacts as { name?: { formatted_name?: string } }[];
      const name = contacts?.[0]?.name?.formatted_name ?? "Contact";
      body = `👤 Shared contact: ${name}`;
      normType = "contacts";
      break;
    }
    case "reaction": {
      const r = msg.reaction as { emoji?: string; message_id?: string };
      body = r?.emoji ? `Reacted ${r.emoji}` : "Reaction";
      normType = "reaction";
      break;
    }
    case "button": {
      const b = msg.button as { text?: string };
      body = b?.text ?? "Button reply";
      normType = "button";
      break;
    }
    case "interactive": {
      const i = msg.interactive as {
        type?: string;
        button_reply?: { title?: string };
        list_reply?: { title?: string };
      };
      body =
        i?.button_reply?.title ??
        i?.list_reply?.title ??
        "Interactive reply";
      normType = "interactive";
      break;
    }
    default:
      body = `[Unsupported message type: ${type}]`;
      normType = "unknown";
  }

  return {
    providerMessageId: id,
    senderProviderUserId: from,
    senderDisplayName: "",
    type: normType,
    body,
    media,
    location,
    timestamp: ts,
    raw: msg,
  };
}

// ── WhatsAppProvider class ────────────────────────────────────────────────────

/** Concrete ChannelProvider implementation for WhatsApp Cloud API. */
export class WhatsAppProvider implements ChannelProvider {
  async connect(_args: Record<string, unknown>): Promise<void> {
    // Connection is initiated via Embedded Signup (UI) → exchangeCodeAndSave.
    // This method is a no-op at the provider level.
  }

  async disconnect(_args: Record<string, unknown>): Promise<void> {
    // Credentials are cleared in the Convex mutation layer.
  }

  async refreshToken(credentials: Record<string, unknown>): Promise<{
    accessToken: string;
    expiresAt?: number;
  }> {
    const { appId, appSecret, currentToken } = credentials as {
      appId: string;
      appSecret: string;
      currentToken: string;
    };
    const { accessToken, expiresIn } = await exchangeForLongLivedToken(
      appId,
      appSecret,
      currentToken,
    );
    return {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  }

  async health(credentials: Record<string, unknown>): Promise<HealthResult> {
    const { accessToken, phoneNumberId } = credentials as {
      accessToken: string;
      phoneNumberId: string;
    };
    try {
      const res = await fetch(
        `${GRAPH_BASE}/${phoneNumberId}?fields=id,display_phone_number`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return { healthy: false, details: `HTTP ${res.status}` };
      return { healthy: true };
    } catch (e) {
      return { healthy: false, details: String(e) };
    }
  }

  async sendMessage(args: SendMessageArgs): Promise<SendResult> {
    const creds = args.credentials as { accessToken: string; phoneNumberId: string };
    if (args.mediaUrl) {
      const type = (args.mimeType?.split("/")[0] ?? "image") as
        | "image"
        | "document"
        | "audio"
        | "video"
        | "sticker";
      const { wamid } = await sendWhatsAppMedia(
        creds.phoneNumberId,
        args.to,
        type,
        args.mediaUrl,
        args.caption,
        undefined,
        creds.accessToken,
      );
      return { providerMessageId: wamid };
    }
    const { wamid } = await sendWhatsAppText(
      creds.phoneNumberId,
      args.to,
      args.body,
      creds.accessToken,
    );
    return { providerMessageId: wamid };
  }

  async receiveMessage(rawPayload: unknown): Promise<ReceivedMessage[]> {
    // Parsing is handled by the webhook handler (http.ts) before calling
    // handleIncomingMessage. This method exists for completeness.
    const msg = rawPayload as Record<string, unknown>;
    const parsed = parseWhatsAppMessage(msg);
    return parsed ? [parsed] : [];
  }

  async uploadMedia(_args: {
    file: ArrayBuffer;
    mimeType: string;
    credentials: Record<string, unknown>;
  }): Promise<string> {
    throw new Error("uploadMedia: not yet implemented");
  }

  async downloadMedia(args: {
    mediaId: string;
    credentials: Record<string, unknown>;
  }): Promise<{ data: ArrayBuffer; mimeType: string }> {
    const { accessToken } = args.credentials as { accessToken: string };
    const { url, mimeType } = await getWhatsAppMediaUrl(args.mediaId, accessToken);
    const { data } = await downloadWhatsAppMedia(url, accessToken);
    return { data, mimeType };
  }

  async typing(_args: {
    to: string;
    credentials: Record<string, unknown>;
  }): Promise<void> {
    // WhatsApp Cloud API does not have a native typing indicator endpoint.
    // This is a no-op until Meta adds it.
  }

  async markRead(args: {
    providerMessageId: string;
    credentials: Record<string, unknown>;
  }): Promise<void> {
    const { accessToken, phoneNumberId } = args.credentials as {
      accessToken: string;
      phoneNumberId: string;
    };
    await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: args.providerMessageId,
      }),
    }).catch(() => {
      // Non-fatal — best-effort read receipts.
    });
  }

  async validateWebhook(args: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): Promise<boolean> {
    const sig = args.headers["x-hub-signature-256"] ?? "";
    return verifyMetaWebhookSignature(args.rawBody, sig, args.secret);
  }
}

export const whatsAppProvider = new WhatsAppProvider();
