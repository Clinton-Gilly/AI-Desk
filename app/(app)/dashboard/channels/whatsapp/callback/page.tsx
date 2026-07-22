"use client";

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/channels/whatsapp/callback
//
// Meta redirects here after the user completes Embedded Signup.
// URL shape: ?code=...&state=...   (success)
//            ?error=...&error_description=...  (failure)
//
// This page:
//   1. Reads the code (or error) from the URL
//   2. Posts the result to the opener window via window.opener.postMessage
//   3. Closes itself
//
// IMPORTANT: this page must be reachable at the exact same origin as the
// opener. The redirect_uri registered in Meta must match exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function CallbackInner() {
  const params = useSearchParams();
  const didPost = useRef(false);

  useEffect(() => {
    if (didPost.current) return;
    didPost.current = true;

    const code = params.get("code");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    const message = code
      ? { type: "META_WHATSAPP_CODE", code }
      : {
          type: "META_WHATSAPP_ERROR",
          error: error ?? "unknown_error",
          errorDescription: errorDescription ?? "Unknown error from Meta",
        };

    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
    }

    // Give the message a moment to be received before closing
    setTimeout(() => window.close(), 300);
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-brand" />
        <p className="text-sm text-muted-foreground">
          Completing WhatsApp connection…
        </p>
      </div>
    </div>
  );
}

export default function WhatsAppCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-brand" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
