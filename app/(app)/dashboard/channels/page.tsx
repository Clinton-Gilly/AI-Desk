"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useEntitlements } from "@/lib/entitlement";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  Sparkles,
  CheckCircle2,
  Zap,
  Globe,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  Building2,
  Unplug,
  Copy,
  Check,
  Send,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Facebook JS SDK types (minimal)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    FB: {
      init: (opts: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (res: { authResponse?: { code?: string; accessToken?: string }; status: string }) => void,
        opts?: {
          config_id?: string;
          response_type?: string;
          override_default_response_type?: boolean;
          extras?: {
            setup?: Record<string, unknown>;
            featureType?: string;
            sessionInfoVersion?: string;
          };
        },
      ) => void;
      logout: (callback: () => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// ---------------------------------------------------------------------------
// SVG Logo Components
// ---------------------------------------------------------------------------

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function TikTokLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function ViberLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.398.002C8.865-.034 3.72.48 1.37 5.27c-1.35 2.79-1.25 6.44-1.01 9.06l.01.09c.25 2.31 1.09 4.35 2.65 5.78.44.4 1.09.41 1.53.01.44-.4.49-1.07.11-1.52-.28-.33-.52-.67-.73-1.04 1.08.74 2.27 1.2 3.44 1.33V22c0 .88.71 1.59 1.59 1.59.88 0 1.59-.71 1.59-1.59v-2.94c.94-.1 1.87-.4 2.73-.9.44-.25.59-.82.34-1.26-.25-.44-.82-.59-1.26-.34-.74.43-1.54.66-2.35.71a9.3 9.3 0 01-1.46-.12 7.97 7.97 0 01-5.88-5.78c-.03-.15-.06-.31-.08-.47C2.28 9.9 2.24 8.3 2.46 6.9c.56-3.61 3.36-4.58 5.08-4.82.93-.13 1.88-.17 2.84-.15 1.14.03 2.25.19 3.26.54 2.87.99 4.32 3.1 4.64 6.52.08.87.07 1.77-.03 2.67-.24 2.19-1.21 3.88-2.42 4.93-.44.38-.49 1.05-.11 1.49.38.44 1.05.49 1.49.11C18.44 16.65 19.7 14.51 20 11.9c.12-1.05.13-2.11.03-3.14-.39-4.23-2.39-7.07-5.96-8.27-1.28-.44-2.7-.65-3.94-.68L11.398.002z" />
    </svg>
  );
}

function LineLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function WeChatLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.601-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.064-6.088v.006zm-2.96 3.18c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.544.434-.983.969-.983zm5.909 0c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.544.434-.983.969-.983z" />
    </svg>
  );
}

function CustomChannelLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Channel catalog
// ---------------------------------------------------------------------------

type ChannelStatus = "available" | "coming_soon" | "beta";
type ChannelCategory = "messaging" | "social" | "custom";

type Channel = {
  id: string;
  name: string;
  description: string;
  status: ChannelStatus;
  category: ChannelCategory;
  logo: React.FC<{ className?: string }>;
  logoColor: string;
  popular?: boolean;
  /** If true, the real Meta Embedded Signup flow is used instead of a placeholder */
  metaEmbeddedSignup?: boolean;
};

const CHANNELS: Channel[] = [
  {
    id: "whatsapp-business",
    name: "WhatsApp Business Platform (API)",
    description:
      "Connect WhatsApp Business Messaging via Meta Embedded Signup to enable real-time customer conversations at scale.",
    status: "available",
    category: "messaging",
    logo: WhatsAppLogo,
    logoColor: "text-[#25D366]",
    popular: true,
    metaEmbeddedSignup: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Connect TikTok Business Messaging to engage with a whole new generation of customers.",
    status: "beta",
    category: "social",
    logo: TikTokLogo,
    logoColor: "text-foreground",
  },
  {
    id: "facebook-messenger",
    name: "Facebook Messenger",
    description: "Connect Facebook Messenger to engage with your customers on the world's largest social platform.",
    status: "available",
    category: "social",
    logo: FacebookLogo,
    logoColor: "text-[#0866FF]",
    popular: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Connect Instagram to reply to private messages and build strong brand relationships with followers.",
    status: "available",
    category: "social",
    logo: InstagramLogo,
    logoColor: "text-[#E1306C]",
    popular: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Connect Telegram Bot to provide real-time support when customers reach out through Telegram.",
    status: "available",
    category: "messaging",
    logo: TelegramLogo,
    logoColor: "text-[#2AABEE]",
  },
  {
    id: "viber",
    name: "Viber",
    description: "Connect Viber Bot to enable customer support and engagement on this popular messaging platform.",
    status: "available",
    category: "messaging",
    logo: ViberLogo,
    logoColor: "text-[#7360F2]",
  },
  {
    id: "line",
    name: "LINE",
    description: "Connect LINE Official Account to provide timely support to your customers on LINE.",
    status: "available",
    category: "messaging",
    logo: LineLogo,
    logoColor: "text-[#00C300]",
  },
  {
    id: "wechat",
    name: "WeChat",
    description: "Connect WeChat Service Account for customer engagement and brand building in China.",
    status: "available",
    category: "messaging",
    logo: WeChatLogo,
    logoColor: "text-[#07C160]",
  },
  {
    id: "whatsapp-cloud",
    name: "WhatsApp Cloud API",
    description: "Connect WhatsApp Cloud API and manage your messaging directly through Meta's infrastructure.",
    status: "available",
    category: "messaging",
    logo: WhatsAppLogo,
    logoColor: "text-[#25D366]",
  },
  {
    id: "custom-channel",
    name: "Custom Channel",
    description: "Connect any channels not natively available in MyChat using our flexible webhook API.",
    status: "available",
    category: "custom",
    logo: CustomChannelLogo,
    logoColor: "text-orange-500",
  },
];

const STATUS_BADGE: Record<ChannelStatus, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  beta: {
    label: "Beta",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  coming_soon: {
    label: "Coming Soon",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

// ---------------------------------------------------------------------------
// Hook: load Facebook JS SDK
// ---------------------------------------------------------------------------

function useFacebookSDK(appId: string | undefined) {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!appId || appId === "your_meta_app_id_here") return;
    if (typeof window === "undefined") return;

    if (window.FB) {
      setSdkReady(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v20.0",
      });
      setSdkReady(true);
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [appId]);

  return sdkReady;
}

// ---------------------------------------------------------------------------
// WhatsApp Connect Button (Meta Embedded Signup)
// ---------------------------------------------------------------------------

type WAConnectState = "idle" | "opening" | "exchanging" | "connected" | "error";

function WhatsAppConnectButton({
  workspaceId,
  onDisconnect,
}: {
  workspaceId: Id<"workspaces">;
  onDisconnect: () => void;
}) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const sdkReady = useFacebookSDK(appId);

  const channel = useQuery(api.whatsapp.getChannel, { workspaceId });
  const exchangeCodeAndSave = useAction(api.whatsappNode.exchangeCodeAndSave);
  const disconnectMutation = useMutation(api.whatsapp.disconnect);
  const simulateMutation = useMutation(api.whatsapp.simulateTestMessage);

  const [uiState, setUiState] = useState<WAConnectState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // Manual editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editPhoneId, setEditPhoneId] = useState("");
  const [editWabaId, setEditWabaId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const updateCredsMutation = useMutation(api.whatsapp.updateConnectionCredentials);

  // Simulation UI state
  const [simText, setSimText] = useState("Hello, this is a simulated message!");
  const [simPhone, setSimPhone] = useState("+254715329007");
  const [simLoading, setSimLoading] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync uiState from DB
  useEffect(() => {
    if (!channel) return;
    if (channel.status === "connected") setUiState("connected");
    else if (channel.status === "error") {
      setUiState("error");
      setErrorMsg(channel.errorMessage ?? "Unknown error");
    } else if (channel.status === "pending") {
      setUiState("exchanging");
    }
  }, [channel]);

  // Sync manual credentials from DB when not editing
  useEffect(() => {
    if (channel && !isEditing) {
      setEditPhoneId(channel.phoneNumberId ?? "");
      setEditWabaId(channel.wabaId ?? "");
      setEditPhone(channel.phoneNumber ?? "");
      setEditName(channel.displayName ?? "");
    }
  }, [channel, isEditing]);

  const handleSaveCredentials = async () => {
    setEditLoading(true);
    try {
      await updateCredsMutation({
        phoneNumberId: editPhoneId,
        wabaId: editWabaId,
        phoneNumber: editPhone,
        displayName: editName,
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save credentials:", e);
    } finally {
      setEditLoading(false);
    }
  };

  // Clean up message listener on unmount
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener("message", listenerRef.current);
      }
    };
  }, []);

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/channels/whatsapp/callback`
      : "";

  const handleConnect = useCallback(() => {
    const isHttp = typeof window !== "undefined" && window.location.protocol === "http:";
    if (isHttp || !sdkReady || !window.FB) {
      openMetaPopupDirect();
      return;
    }

    setUiState("opening");
    setErrorMsg(null);

    if (listenerRef.current) {
      window.removeEventListener("message", listenerRef.current);
    }

    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; code?: string; error?: string; errorDescription?: string };
      if (!data || typeof data !== "object") return;

      if (data.type === "META_WHATSAPP_CODE" && data.code) {
        window.removeEventListener("message", listener);
        listenerRef.current = null;
        handleCodeReceived(data.code);
      } else if (data.type === "META_WHATSAPP_ERROR") {
        window.removeEventListener("message", listener);
        listenerRef.current = null;
        const msg = data.errorDescription ?? data.error ?? "Auth cancelled or failed";
        setUiState("error");
        setErrorMsg(msg);
      }
    };

    listenerRef.current = listener;
    window.addEventListener("message", listener);

    window.FB.login(
      (response) => {
        if (response.status === "connected" && response.authResponse?.accessToken) {
          window.removeEventListener("message", listener);
          listenerRef.current = null;
        } else if (!response.authResponse) {
          window.removeEventListener("message", listener);
          listenerRef.current = null;
          setUiState("idle");
        }
      },
      {
        config_id: appId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "2",
        },
      },
    );
  }, [sdkReady, appId, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openMetaPopupDirect = useCallback(() => {
    if (!appId || appId === "your_meta_app_id_here") {
      setUiState("error");
      setErrorMsg("META_APP_ID not configured. Add NEXT_PUBLIC_META_APP_ID to .env.local");
      return;
    }

    setUiState("opening");
    setErrorMsg(null);

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "whatsapp_business_management",
        "whatsapp_business_messaging",
        "business_management",
      ].join(","),
    });

    const popupUrl = `https://www.facebook.com/dialog/oauth?${params.toString()}`;
    const popup = window.open(
      popupUrl,
      "meta_whatsapp_signup",
      "width=700,height=700,left=200,top=100",
    );

    if (!popup) {
      setUiState("error");
      setErrorMsg("Popup was blocked. Please allow popups for this site.");
      return;
    }

    if (listenerRef.current) {
      window.removeEventListener("message", listenerRef.current);
    }

    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; code?: string; error?: string; errorDescription?: string };
      if (!data || typeof data !== "object") return;

      if (data.type === "META_WHATSAPP_CODE" && data.code) {
        window.removeEventListener("message", listener);
        listenerRef.current = null;
        handleCodeReceived(data.code);
      } else if (data.type === "META_WHATSAPP_ERROR") {
        window.removeEventListener("message", listener);
        listenerRef.current = null;
        const msg = data.errorDescription ?? data.error ?? "Auth cancelled or failed";
        setUiState("error");
        setErrorMsg(msg);
      }
    };

    listenerRef.current = listener;
    window.addEventListener("message", listener);

    const pollClose = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClose);
        if (uiState === "opening") {
          window.removeEventListener("message", listener);
          listenerRef.current = null;
          setUiState("idle");
        }
      }
    }, 500);
  }, [appId, redirectUri, uiState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCodeReceived = useCallback(
    async (code: string) => {
      setUiState("exchanging");
      try {
        const result = await exchangeCodeAndSave({
          code,
          workspaceId,
          redirectUri,
        });
        if (result.success) {
          setUiState("connected");
          setErrorMsg(null);
        } else {
          setUiState("error");
          setErrorMsg(result.error ?? "Token exchange failed");
        }
      } catch (e) {
        setUiState("error");
        setErrorMsg(e instanceof Error ? e.message : "Unexpected error");
      }
    },
    [exchangeCodeAndSave, workspaceId, redirectUri],
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectMutation();
      setUiState("idle");
      setErrorMsg(null);
      onDisconnect();
    } catch (e) {
      console.error("Disconnect failed:", e);
    }
  }, [disconnectMutation, onDisconnect]);

  const handleSimulateMessage = async () => {
    if (!simText.trim()) return;
    setSimLoading(true);
    setSimSuccess(false);
    try {
      await simulateMutation({
        body: simText,
        fromNumber: simPhone.trim() || undefined,
      });
      setSimSuccess(true);
      setTimeout(() => setSimSuccess(false), 3000);
    } catch (e) {
      console.error("Simulation failed:", e);
    } finally {
      setSimLoading(false);
    }
  };

  const getWebhookUrl = () => {
    const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
    const siteUrl = cloudUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");
    return `${siteUrl}/meta-webhook`;
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatRelativeTime = (ms: number | undefined | null): string => {
    if (!ms) return "Never";
    const sec = Math.floor((Date.now() - ms) / 1000);
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  };

  const isConnected = uiState === "connected" || channel?.status === "connected";
  const isLoading = uiState === "opening" || uiState === "exchanging";
  const isError = uiState === "error";

  if (isConnected && channel) {
    const expiresMs = channel.tokenExpiresAt;
    const daysLeft = expiresMs ? Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000))) : null;

    return (
      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
        {/* Connected Details Grid */}
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-3 text-xs flex flex-col gap-2">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[10px]">WABA Name</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-card border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[10px]">Phone Number</span>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-card border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[10px]">Phone ID</span>
                <input
                  type="text"
                  value={editPhoneId}
                  onChange={(e) => setEditPhoneId(e.target.value)}
                  className="bg-card border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 font-mono text-[10px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[10px]">WABA ID</span>
                <input
                  type="text"
                  value={editWabaId}
                  onChange={(e) => setEditWabaId(e.target.value)}
                  className="bg-card border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 font-mono text-[10px]"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleSaveCredentials}
                  disabled={editLoading}
                  className="flex-1 bg-brand text-[var(--brand-text)] hover:opacity-90 disabled:opacity-50 py-1.5 px-2 rounded-lg font-medium text-[11px] cursor-pointer"
                >
                  {editLoading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-muted border border-border text-foreground hover:bg-card py-1.5 px-2 rounded-lg font-medium text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {channel.displayName && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">WABA Name</span>
                  <span className="font-semibold text-foreground truncate max-w-[150px]">{channel.displayName}</span>
                </div>
              )}
              {channel.phoneNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-mono font-medium text-foreground">{channel.phoneNumber}</span>
                </div>
              )}
              {channel.phoneNumberId && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Phone ID</span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={channel.phoneNumberId}>
                    {channel.phoneNumberId}
                  </span>
                </div>
              )}
              {channel.wabaId && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">WABA ID</span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={channel.wabaId}>
                    {channel.wabaId}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-emerald-500/10 pt-1.5 mt-0.5">
                <span className="text-muted-foreground">Last Webhook Activity</span>
                <span className="font-medium text-foreground">{formatRelativeTime(channel.lastWebhookAt)}</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] text-brand hover:underline font-medium text-left mt-1 cursor-pointer w-fit"
              >
                Edit details manually
              </button>
            </>
          )}
        </div>

        {/* Token Expiry Alert */}
        {daysLeft !== null && (
          <div className={[
            "flex items-start gap-2 rounded-xl border p-2.5 text-xs",
            daysLeft < 7 
              ? "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400"
              : daysLeft < 15
                ? "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-muted/40 border-border text-muted-foreground"
          ].join(" ")}>
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {daysLeft < 7 
                  ? `Token expires soon! (${daysLeft} days left)` 
                  : `Token expires in ${daysLeft} days`}
              </p>
              {daysLeft < 15 && (
                <p className="text-[10px] opacity-90 mt-0.5">
                  Click Reconnect to refresh credentials without disconnecting.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Webhook Configuration Details */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1">
              Webhook URL
            </span>
            <button
              onClick={handleCopyWebhook}
              className="text-brand hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              {copied ? (
                <>
                  <Check className="size-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" /> Copy URL
                </>
              )}
            </button>
          </div>
          <input
            readOnly
            value={getWebhookUrl()}
            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground outline-none"
          />
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            Verify Token: Configure <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">META_WEBHOOK_VERIFY_TOKEN</code> in your Facebook developer settings.
          </div>
        </div>

        {/* Webhook Simulation Tool */}
        <div className="rounded-xl border border-dashed border-border p-3 flex flex-col gap-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            Simulate Webhook Message
          </span>
          <p className="text-[10px] text-muted-foreground">
            Trigger a simulated message to verify webhook reception, inbox loading, and AI agent auto-responses.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-medium">Customer Phone Number</span>
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                placeholder="e.g. +254715329007"
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-medium">Message Body</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Test message body..."
                  className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                />
                <button
                  onClick={handleSimulateMessage}
                  disabled={simLoading || !simText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-brand text-[var(--brand-text)] hover:opacity-90 disabled:opacity-50 text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {simLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : simSuccess ? (
                    <Check className="size-3" />
                  ) : (
                    <Send className="size-3" />
                  )}
                  {simSuccess ? "Sent" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-2">
          <button
            onClick={sdkReady ? handleConnect : openMetaPopupDirect}
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-all duration-150 hover:bg-brand/5 hover:text-brand hover:border-brand/20 cursor-pointer"
          >
            <span className="flex items-center justify-center gap-1.5">
              <RefreshCw className="size-3" />
              Reconnect
            </span>
          </button>
          <button
            onClick={handleDisconnect}
            className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.02] px-3 py-2 text-xs font-medium text-red-600 transition-all duration-150 hover:bg-red-500/10 dark:text-red-400 cursor-pointer"
          >
            <span className="flex items-center justify-center gap-1.5">
              <Unplug className="size-3" />
              Disconnect
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-auto flex flex-col gap-2">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="size-3.5 shrink-0 text-red-500 mt-0.5" />
            <p className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">
              {errorMsg ?? "Connection failed"}
            </p>
          </div>
        </div>
        <button
          onClick={sdkReady ? handleConnect : openMetaPopupDirect}
          className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all duration-150 hover:bg-brand/10 hover:text-brand hover:border-brand/30 cursor-pointer"
        >
          <span className="flex items-center justify-center gap-1.5">
            <RefreshCw className="size-3.5" />
            Retry
          </span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-auto">
        <button
          disabled
          className="w-full rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium text-brand cursor-not-allowed"
        >
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" />
            {uiState === "opening" ? "Opening Meta…" : "Connecting…"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto">
      <button
        onClick={sdkReady ? handleConnect : openMetaPopupDirect}
        className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all duration-150 hover:bg-brand/10 hover:text-brand hover:border-brand/30 cursor-pointer"
      >
        <span className="flex items-center justify-center gap-1.5">
          <span className="text-[#25D366]">
            <WhatsAppLogo className="size-3.5" />
          </span>
          Connect via Meta
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel card
// ---------------------------------------------------------------------------

function ChannelCard({
  channel,
  locked,
  workspaceId,
}: {
  channel: Channel;
  locked: boolean;
  workspaceId: Id<"workspaces"> | undefined;
}) {
  const [simConnected, setSimConnected] = useState(false);
  const statusBadge = STATUS_BADGE[channel.status];
  const Logo = channel.logo;

  // showConnectedBadge: WhatsApp uses the real DB state via WhatsAppConnectButton's own query;
  // we track the connected badge separately here only for non-WA channels.
  const showConnectedBadge = simConnected;

  return (
    <div
      className={[
        "group relative flex flex-col rounded-2xl border border-border bg-card transition-all duration-200",
        locked
          ? "opacity-60"
          : showConnectedBadge
            ? "border-emerald-500/30 bg-emerald-500/[0.02] hover:shadow-lg hover:-translate-y-0.5"
            : "hover:shadow-lg hover:border-brand/30 hover:-translate-y-0.5",
      ].join(" ")}
    >
      {channel.popular && !locked && (
        <div className="absolute -top-2.5 left-4 z-10">
          <Badge className="gap-1 bg-gradient-to-br from-brand to-brand-2 px-2 py-0.5 text-[10px] text-[var(--brand-text)] shadow-sm">
            <Sparkles className="size-2.5" />
            Popular
          </Badge>
        </div>
      )}

      {locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-1.5">
            <Lock className="size-5 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
            <Logo className={`size-6 ${channel.logoColor}`} />
          </div>
          <div className="flex flex-col items-end gap-1.5 mt-0.5">
            <Badge
              className={`text-[10px] font-semibold border ${statusBadge.className}`}
              variant="outline"
            >
              {statusBadge.label}
            </Badge>
            {showConnectedBadge && (
              <Badge
                className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                variant="outline"
              >
                <CheckCircle2 className="size-2.5" />
                Connected
              </Badge>
            )}
          </div>
        </div>

        <h3 className="text-sm font-semibold tracking-tight leading-snug mb-1.5">
          {channel.name}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
          {channel.description}
        </p>

        {/* WhatsApp: real Meta Embedded Signup flow */}
        {channel.metaEmbeddedSignup && !locked && workspaceId ? (
          <WhatsAppConnectButton
            workspaceId={workspaceId}
            onDisconnect={() => {}}
          />
        ) : (
          /* All other channels: placeholder toggle */
          <button
            onClick={() => !locked && setSimConnected((prev) => !prev)}
            disabled={channel.status === "coming_soon" || locked}
            className={[
              "mt-auto w-full rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-150",
              locked
                ? "cursor-not-allowed opacity-50 border-border bg-muted text-muted-foreground"
                : simConnected
                  ? "cursor-pointer border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                  : channel.status === "coming_soon"
                    ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                    : "cursor-pointer border-border bg-card text-foreground hover:bg-brand/10 hover:text-brand hover:border-brand/30",
            ].join(" ")}
          >
            {simConnected
              ? "Disconnect"
              : channel.status === "coming_soon"
                ? "Coming Soon"
                : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upgrade Banner
// ---------------------------------------------------------------------------

function UpgradeBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-brand/5 to-brand-2/10 p-6 mb-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-brand/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Lock className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Channels require a Pro or Scale plan
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-lg">
              Connect WhatsApp, Telegram, Instagram, Facebook Messenger and more to centralise all
              your customer conversations in one place. Upgrade to unlock multi-channel support.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="shrink-0 gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-2 text-[var(--brand-text)] shadow-[0_4px_16px_-4px_var(--brand)] hover:opacity-95"
          size="sm"
        >
          <Link href="/pricing">
            <Zap className="size-3.5" />
            Upgrade to Pro
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: "all" as const, label: "All Channels" },
  { id: "messaging" as const, label: "Messaging" },
  { id: "social" as const, label: "Social Media" },
  { id: "custom" as const, label: "Custom" },
];

type CategoryId = "all" | ChannelCategory;

export default function ChannelsPage() {
  const { isLoaded, hasPlan } = useEntitlements();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");

  // Resolve workspace for the current org
  const workspaceResult = useQuery(api.workspaces.getActiveWorkspace);
  const workspaceId =
    workspaceResult?.ok === true
      ? (workspaceResult.workspace._id as Id<"workspaces">)
      : undefined;

  const isPro = hasPlan("pro");
  const isScale = hasPlan("scale");
  const hasAccess = isPro || isScale;

  const filtered =
    activeCategory === "all"
      ? CHANNELS
      : CHANNELS.filter((c) => c.category === activeCategory);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="size-5 text-brand" />
            <h1 className="text-xl font-semibold tracking-tight">Channels</h1>
            <Badge
              className="gap-1 bg-gradient-to-br from-brand/20 to-brand-2/20 text-brand border-brand/20 text-[10px]"
              variant="outline"
            >
              <Sparkles className="size-2.5" />
              Pro &amp; Scale
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Connect your social media and messaging accounts to handle all customer conversations
            from one unified inbox.
          </p>
        </div>

        {/* Upgrade banner for free users */}
        {isLoaded && !hasAccess && <UpgradeBanner />}

        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {isLoaded && (
          <>
            {/* Category tabs */}
            <div className="mb-6 flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    activeCategory === cat.id
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  locked={!hasAccess}
                  workspaceId={workspaceId}
                />
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              More channels coming soon &mdash;{" "}
              <a href="mailto:support@mychat.com" className="text-brand hover:underline">
                request a channel
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
