# AI-Desk — AI Customer Support Desk for Teams

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-ff6b35?logo=convex)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth%20%2B%20Billing-6c47ff?logo=clerk)](https://clerk.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-AI%20Agent-412991?logo=openai)](https://platform.openai.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)

A full-stack, real-time **customer support desk** — a B2B multi-tenant SaaS where teams can embed a chat and helpdesk **widget** on any website, let an **AI agent** answer questions directly from their own knowledge base, capture leads, and seamlessly **hand off to a human** in a shared team inbox.

> **What makes it different?**
> Every message is **real-time** (no page refreshes, no socket server to run). Auth, organizations, AND billing are handled seamlessly by **Clerk**. The backend is powered by **Convex** — a reactive database that pushes changes to every connected client instantly. And there's a fully working **AI agent** (Convex Agent + OpenAI) that answers strictly from your knowledge base with vector search, citations, lead capture, and human escalation.

---

## ✨ Features

### Embeddable Widget
- 🧩 **One-snippet embed** — A framework-free, dependency-free snippet a customer pastes onto any site. It renders the launcher bubble + chat iframe inside a **Shadow DOM**.
- 🌍 **True cross-origin embedding** — Can be loaded on any external domain seamlessly.
- 💬 **Chat + Helpdesk tabs** — Live AI/human chat and a searchable help center in one widget.
- 👋 **Proactive messages** — Configure proactive nudge messages after a visitor spends time on the page.
- 📝 **Lead capture form** — Configure required fields to capture leads right in the chat.
- 🎨 **Customizable Design** — Change colors, logo, corner radius, position, and title.

### AI Agent
- 🤖 **Grounded RAG answers** — Answers questions based only on your workspace's knowledge base using `text-embedding-3-small`. Refuses to hallucinate and escalates when unsure.
- 🧰 **Smart Tools** — The AI can search the helpdesk, capture leads, escalate to humans, and suggest relevant articles.
- 🔁 **Streaming + Human Takeover** — Real-time streaming responses that stop immediately the moment a human agent takes over the conversation.

### Knowledge Base
- 🕷️ **Website crawler** — Point it at a root URL; it crawls, chunks, and embeds pages into retrievable knowledge automatically.
- 📄 **Helpdesk articles** — Write rich Markdown articles with categories, cover images, and full-text search.
- 📎 **File ingestion** — Extract text from PDFs and HTML directly into the Knowledge Base.

### Inbox & Collaboration
- 📥 **Shared team inbox** — Every conversation in one reactive list with live unread/unassigned counts.
- 🙋 **Human takeover** — Switch a conversation from AI → human and back seamlessly.
- 🟢 **Live presence** — See who's online and viewing, powered by live real-time presence.
- 🧲 **Leads pipeline** — View and manage captured leads with statuses.

### Billing & Multi-Tenancy
- 🏢 **Organizations** — Every workspace is its own organization; memberships and roles sync automatically.
- 💳 **B2B Billing** — Fully integrated pricing and plan management.
- 🚦 **Usage metering & Rate Limiting** — AI messages and KB documents are metered per billing period.

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** or **pnpm**
- A **Clerk** account
- A **Convex** account
- An **OpenAI** API key

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd <your-repo>
npm install
```

### 2. Set up environment variables

Copy the example and fill it in:

```bash
cp .env.local.example .env.local
```

### 3. Run the development server

Run Convex and Next.js at the same time:

```bash
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) to see the app running!
