"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/app/_components/brand-mark";

// ─────────────────────────────────────────────────────────────────────────────
// /accept-invite — Landing page for Clerk organization invitation links.
//
// Flow (@clerk/nextjs v7.5 / Core 3 Signal API):
//   - useSignIn() → { signIn: SignInFutureResource, fetchStatus }
//   - useSignUp() → { signUp: SignUpFutureResource, fetchStatus }
//
//   1. Clerk sends invitation email → user clicks link → lands here with
//      ?__clerk_ticket=<token>&__clerk_status=sign_in|sign_up
//
//   2. sign_in (existing user):
//        signIn.ticket({ ticket })  →  signIn.finalize({ navigate })
//
//      sign_up (new user):
//        signUp.ticket({ ticket })  →  signUp.finalize({ navigate })
//
//      no __clerk_status: try sign-in first, fall back to sign-up.
//
//   3. finalize() calls navigate() which sets the session + active org.
//   4. Redirect → /onboarding (provisions workspace) → /dashboard.
//
// IMPORTANT: Stay PUBLIC (no auth.protect for this route in proxy.ts).
// IMPORTANT: In Clerk Dashboard → User & auth → Email invitations →
//   set "Invitation redirect URL" to your /accept-invite page URL.
// ─────────────────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteInner />
    </Suspense>
  );
}

type Stage = "loading" | "success" | "error";

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket");
  // Clerk appends __clerk_status=sign_in for existing users, sign_up for new
  const accountStatus = searchParams.get("__clerk_status");

  // v7 Signal API returns { signIn: SignInFutureResource, fetchStatus }
  const { signIn, fetchStatus: siStatus } = useSignIn();
  const { signUp, fetchStatus: suStatus } = useSignUp();

  // Ready when both resources have loaded (fetchStatus transitions from
  // 'fetching' → 'idle' once Clerk has initialised)
  const isLoaded = siStatus === "idle" && suStatus === "idle";

  const [stage, setStage] = useState<Stage>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // No ticket at all — surface error immediately
    if (!ticket) {
      setStage("error");
      setErrorMsg(
        "No invitation token found. Please use the link from your invitation email.",
      );
      return;
    }

    let cancelled = false;

    // Helper: called by finalize()'s navigate callback to redirect after
    // Clerk sets the session + org active.
    async function goToOnboarding(decorateUrl: (u: string) => string) {
      if (cancelled) return;
      setStage("success");
      const url = decorateUrl("/onboarding");
      await new Promise<void>((r) => setTimeout(r, 800)); // brief success flash
      if (cancelled) return;
      if (url.startsWith("http")) {
        window.location.href = url;
      } else {
        router.replace(url);
      }
    }

    // ── Sign-in path (existing user) ────────────────────────────────────
    async function acceptViaSignIn(): Promise<boolean> {
      const { error } = await signIn!.ticket({ ticket: ticket! });
      if (error) throw error;

      if (signIn!.status === "complete") {
        await signIn!.finalize({
          navigate: ({ decorateUrl }) => goToOnboarding(decorateUrl),
        });
        return true;
      }
      return false;
    }

    // ── Sign-up path (new user) ─────────────────────────────────────────
    async function acceptViaSignUp(): Promise<boolean> {
      const { error } = await signUp!.ticket({ ticket: ticket! });
      if (error) throw error;

      if (signUp!.status === "complete") {
        await signUp!.finalize({
          navigate: ({ decorateUrl }) => goToOnboarding(decorateUrl),
        });
        return true;
      }

      // sign-up needs more steps (password / email verification) →
      // hand off to the hosted sign-up page with the ticket attached
      router.replace(
        `/sign-up?__clerk_ticket=${encodeURIComponent(ticket!)}&__clerk_status=sign_up`,
      );
      return true;
    }

    async function accept() {
      try {
        if (accountStatus === "sign_in") {
          await acceptViaSignIn();
        } else if (accountStatus === "sign_up") {
          await acceptViaSignUp();
        } else {
          // No __clerk_status — optimistically try sign-in, fall back to sign-up
          let didSignIn = false;
          try {
            didSignIn = await acceptViaSignIn();
          } catch (err: unknown) {
            const clerkErr = err as {
              code?: string;
              errors?: { code: string }[];
            };
            const codes =
              clerkErr?.errors?.map((e) => e.code) ??
              (clerkErr?.code ? [clerkErr.code] : []);
            const isNewUser = codes.some(
              (c) =>
                c === "form_identifier_not_found" ||
                c === "strategy_for_user_invalid",
            );
            if (!isNewUser) throw err; // unexpected error → re-throw
          }
          if (!didSignIn) await acceptViaSignUp();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { message?: string })?.message ??
          (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
          "Could not accept the invitation. The link may have expired.";
        setStage("error");
        setErrorMsg(msg);
      }
    }

    void accept();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Soft brand backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-dotgrid absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(60%_45%_at_50%_30%,black,transparent)]" />
        <div className="absolute -top-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="flex justify-center">
          <BrandMark />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card text-center space-y-4">
          {stage === "loading" && (
            <>
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_8px_24px_-8px_var(--brand)]">
                <Loader2 className="size-6 animate-spin" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold tracking-tight">
                  Accepting your invitation
                </h1>
                <p className="text-sm text-muted-foreground">
                  Signing you in and joining the workspace…
                </p>
              </div>
            </>
          )}

          {stage === "success" && (
            <>
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-6" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold tracking-tight">
                  Invitation accepted!
                </h1>
                <p className="text-sm text-muted-foreground">
                  Taking you to your dashboard…
                </p>
              </div>
            </>
          )}

          {stage === "error" && (
            <>
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-6" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold tracking-tight">
                  Invitation failed
                </h1>
                <p className="text-sm text-muted-foreground">
                  {errorMsg ?? "Something went wrong. Please try again."}
                </p>
              </div>
              <a
                href="/sign-in"
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_var(--brand)] hover:opacity-95 transition-opacity"
              >
                Go to sign in
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
