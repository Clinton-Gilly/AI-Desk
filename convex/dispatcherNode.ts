"use node";
// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher — Node.js runtime
//
// processOutboundMessage: reads an outgoingMessages row, loads credentials,
// calls the correct ChannelProvider.sendMessage(), and calls back into V8
// mutations (dispatcher.markSent / dispatcher.markFailed) with the result.
//
// Retry policy:
//   Attempt 1 → immediate (scheduled from enqueueOutbound)
//   Attempt 2 → 30 seconds after attempt 1 failure
//   Attempt 3 → 5 minutes after attempt 2 failure
//   After 3 failures → mark as "failed", stop retrying
// ─────────────────────────────────────────────────────────────────────────────

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  sendWhatsAppText,
  getWhatsAppMediaUrl,
  downloadWhatsAppMedia,
} from "./lib/whatsappProvider";

const RETRY_DELAYS_MS = [30_000, 300_000]; // 30s, 5min
const MAX_ATTEMPTS = 3;

/** Process one outgoing message from the queue. */
export const processOutboundMessage = internalAction({
  args: { outgoingMessageId: v.id("outgoingMessages") },
  returns: v.null(),
  handler: async (ctx, { outgoingMessageId }) => {
    // ── 1. Load the queue row + conversation + credentials directly via V8 Query ──
    const outgoing = await ctx.runQuery(
      internal.dispatcher.getOutgoingDetails,
      { outgoingMessageId },
    );
    if (!outgoing) return null; // already processed or deleted

    const { provider, attempts } = outgoing;

    // ── 2. Skip website (pull-based, no external push) ─────────────────────
    if (provider === "website") {
      await ctx.runMutation(internal.dispatcher.markSent, {
        outgoingMessageId,
        providerMessageId: "",
      });
      return null;
    }

    // ── 3. WhatsApp delivery ────────────────────────────────────────────────
    if (provider === "whatsapp") {
      const { accessToken, phoneNumberId, to, body } = outgoing as {
        accessToken: string;
        phoneNumberId: string;
        to: string;
        body: string;
      };

      if (!accessToken || !phoneNumberId || !to) {
        await ctx.runMutation(internal.dispatcher.markFailed, {
          outgoingMessageId,
          error: "Missing credentials or recipient phone number",
        });
        return null;
      }

      try {
        const { wamid } = await sendWhatsAppText(
          phoneNumberId,
          to,
          body,
          accessToken,
        );
        await ctx.runMutation(internal.dispatcher.markSent, {
          outgoingMessageId,
          providerMessageId: wamid,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const nextAttempt = attempts + 1;

        if (nextAttempt >= MAX_ATTEMPTS) {
          // Final failure — stop retrying.
          await ctx.runMutation(internal.dispatcher.markFailed, {
            outgoingMessageId,
            error: errorMsg,
          });
        } else {
          // Schedule retry with backoff.
          const delay = RETRY_DELAYS_MS[attempts] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
          await ctx.runMutation(internal.dispatcher.markFailed, {
            outgoingMessageId,
            error: errorMsg,
            retryDelayMs: delay,
          });
        }
      }
      return null;
    }

    // ── 4. Unknown provider — mark failed ───────────────────────────────────
    await ctx.runMutation(internal.dispatcher.markFailed, {
      outgoingMessageId,
      error: `Unsupported provider: ${provider}`,
    });
    return null;
  },
});

/** Download a media file from WhatsApp and store it in Convex Storage. */
export const downloadAndStoreMedia = internalAction({
  args: {
    attachmentId: v.id("attachments"),
    mediaId: v.string(),
    accessToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { attachmentId, mediaId, accessToken }) => {
    try {
      const { url, mimeType } = await getWhatsAppMediaUrl(mediaId, accessToken);
      const { data } = await downloadWhatsAppMedia(url, accessToken);
      const blob = new Blob([data], { type: mimeType });
      const storageId = await ctx.storage.store(blob);
      await ctx.runMutation(internal.dispatcher.patchAttachment, {
        attachmentId,
        storageId,
        status: "stored",
      });
    } catch (err) {
      await ctx.runMutation(internal.dispatcher.patchAttachment, {
        attachmentId,
        status: "failed",
        errorNote: err instanceof Error ? err.message : String(err),
      });
    }
    return null;
  },
});
