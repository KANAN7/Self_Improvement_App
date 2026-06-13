# CLAUDE.md — "Inward" MVP Build Instructions

## 0. PROJECT IDENTITY

**App name (working):** Inward
**Slogan:** "If you want to, you will."
**One-line description:** A private, AI-powered self-reflection app for journaling, capturing thoughts, saving growth content, and talking to a companion that learns from your entries.

**Core principle for every decision:** Calm, private, intelligent, non-judgmental. NOT a productivity app. NOT a social feed. No gamification, no streaks-as-pressure, no dark patterns.

---

## 1. TECH STACK (LOCKED — DO NOT SUBSTITUTE WITHOUT ASKING)

| Layer | Choice |
|---|---|
| Framework | React Native + Expo (SDK 51+), TypeScript (strict mode) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind for RN) |
| State | Zustand (global) + React Query (server/async) |
| Local DB | Expo SQLite via Drizzle ORM |
| Secure storage | expo-secure-store (passcode, encryption keys) |
| Auth (optional, V1.1) | Skip for MVP — local-only mode |
| Backend | Node.js + Hono (TypeScript) — only needed for AI proxy |
| AI | Anthropic Claude API (claude-sonnet-4) via backend proxy |
| Content metadata | Open Graph scraping (backend) + YouTube oEmbed |
| Testing | Vitest (logic) + Maestro (E2E flows) |

**Critical:** AI keys must NEVER live on the client. All Claude calls go through the Hono backend proxy.

---

## 2. ARCHITECTURE OVERVIEW

/app → Expo Router screens /components → Reusable UI components /features /diary → Diary feature (screens, hooks, db, logic) /thoughts → Thoughts capture /vault → Content vault /chat → AI companion /privacy → Locking, exclusion, export /lib /db → Drizzle schema + migrations /ai → AI client (calls backend) /encryption → AES helpers /stores → Zustand stores /theme → Colors, typography, spacing tokens /backend → Hono server (AI proxy + content scraper)


**Local-first rule:** Every feature must work fully offline EXCEPT AI chat/analysis (requires network). When offline, queue AI requests and show graceful state.

---

## 3. DATA MODELS (Drizzle Schema)

Implement these tables in `/lib/db/schema.ts`:

```typescript
// diary_entries
id: string (uuid)
content: text
mood: integer (1-5, nullable)
energy: integer (1-5, nullable)
focus: integer (1-5, nullable)
what_helped: text (nullable)
ai_excluded: boolean (default false)
is_locked: boolean (default false)
ai_summary: text (nullable)      // AI's observation
ai_question: text (nullable)     // AI's gentle follow-up
created_at: timestamp
updated_at: timestamp

// thoughts
id: string (uuid)
content: text
type: enum ('realization','idea','observation','question','gratitude','other')
ai_excluded: boolean (default false)
linked_entry_id: string (nullable, FK to diary_entries)
created_at: timestamp

// vault_items
id: string (uuid)
url: text
title: text (nullable)
thumbnail_url: text (nullable)
content_type: enum ('youtube','article','podcast','reel','other')
category: enum ('motivation','spirituality','mental_health','focus','identity','other')
why_saved: text (nullable)
created_at: timestamp

// chat_messages
id: string (uuid)
role: enum ('user','assistant')
content: text
mode: enum ('reflective','coach','direct')
context_basis: text (nullable)   // what the AI used to ground its reply
created_at: timestamp

// app_settings (single row)
passcode_enabled: boolean
biometric_enabled: boolean
default_ai_mode: enum ('reflective','coach','direct')
4. BUILD PHASES — EXECUTE IN ORDER
Complete and verify each phase before moving to the next. Run the app and confirm it works after every phase.

PHASE 1 — Foundation (Setup + Theme)
Initialize Expo project with TypeScript strict mode + Expo Router.
Install and configure NativeWind, Zustand, React Query, Drizzle + Expo SQLite, expo-secure-store.
Build the theme system in /theme:
Colors (see Section 7 — Design Tokens)
Typography scale
Spacing scale
Create base UI components: Screen, Card, Button, TextInput, MoodPicker, Slider, BottomSheet.
Set up DB schema + run first migration.
Verify: App launches, shows a themed empty home screen.
PHASE 2 — Diary (No AI yet)
Diary list screen (chronological, newest first, calm card layout).
New/edit entry screen with:
Soft prompt placeholder: "How did today go?"
Mood picker (5 emoji), energy slider, focus slider
Optional "What helped today?" field
"Keep private" toggle (sets ai_excluded)
CRUD via Drizzle. Full offline support.
Verify: Can create, edit, delete, view entries; data persists across restarts.
PHASE 3 — Thoughts
One-tap quick capture screen (text-first, opens instantly).
Optional type tagging chips.
Browse/search list. Link a thought to a diary entry (optional).
Verify: Capture is fast (<2 taps from home), data persists.
PHASE 4 — Content Vault
Paste-URL flow. On paste, call backend /enrich endpoint to fetch title + thumbnail + type.
Category tagging + optional "why saved?" note.
Grid/list view. Tap to open URL in browser.
Verify: Pasting a YouTube link auto-fills title/thumbnail; saving works offline (enrichment retries when online).
PHASE 5 — Backend (Hono AI Proxy + Scraper)
Hono server with two endpoints:
POST /enrich → takes URL, returns Open Graph / oEmbed metadata.
POST /ai/chat → takes messages + context + mode, streams Claude response.
POST /ai/analyze → takes a diary entry + recent context, returns { summary, question, tone }.
Claude API key in backend env only. Rate limit per device ID.
Verify: Endpoints return correct shapes; key never exposed to client.
PHASE 6 — AI Diary Analysis
After saving a non-excluded entry, call /ai/analyze.
Store ai_summary + ai_question on the entry.
Display AI observation softly below the entry (with "ℹ Based on your recent entries" transparency line).
Use the system prompt in Section 6.
Verify: New entry produces one observation + one gentle question, grounded in the user's words.
PHASE 7 — AI Chat Companion
Chat screen with streaming responses.
Mode selector: Reflective / Coach / Direct.
Build context from last 14 non-excluded diary entries + recent thoughts.
Each AI message shows a context_basis transparency line.
Persistent disclaimer in header: "Reflection tool — not a substitute for professional support."
Verify: AI references the user's actual entries; modes produce distinctly different tones.
PHASE 8 — Privacy & Locking
App-level passcode + biometric lock (expo-local-authentication).
Per-entry lock (biometric to view).
Per-entry "Exclude from AI" toggle (already in schema — wire up enforcement so excluded entries never enter AI context).
Export all data as JSON.
Verify: Locked entries require auth; excluded entries are provably absent from AI context payloads.
PHASE 9 — Polish
Onboarding flow (3 philosophy screens — see slogan/principles).
Home dashboard: warm time-aware greeting, last thought echoed back, subtle weekly mood trend.
Micro-animations (fade-ins, streaming text cursor), haptic feedback on mood select.
Skeleton loaders (no spinners).
Verify: App feels calm and cohesive end-to-end.
5. UI/UX RULES (NON-NEGOTIABLE)
Max 3 bottom-nav items: Reflect (diary+thoughts), Vault, Chat. Home is a gesture/logo tap.
Extreme whitespace. Nothing competes for attention.
No red error states for user behavior. No guilt language. No streak pressure.
Gentle nudges only: "You haven't written today" — never "You broke your streak!"
Buttons are soft, full-width primary CTAs. Cards float with subtle shadow, no harsh borders.
Never show raw engagement metrics (likes, views, counts) in the vault.
6. AI SYSTEM PROMPTS
Shared base prompt (prepend to all AI calls):

You are the reflective companion inside Inward, a private self-awareness journal.
You are observational, non-judgmental, and emotionally intelligent. You NEVER
diagnose, NEVER claim to be a therapist, and NEVER use language implying failure,
weakness, or comparison. You ground every statement in the user's own words and
always make your reasoning transparent. You surface patterns; you do not give orders.
If a user expresses crisis or self-harm, gently encourage them to reach out to a
professional or a crisis line, and do not attempt to counsel the crisis yourself.
Diary analysis prompt (/ai/analyze):

Read this diary entry and the user's recent context. Return JSON:
{
  "tone": "positive|neutral|negative|mixed",
  "summary": "<one warm, specific observation grounded in their words, max 2 sentences>",
  "question": "<one gentle, open-ended question to sit with, max 1 sentence>"
}
Reference specifics from the entry. Do not be generic. Do not give advice.
Chat mode modifiers:

reflective: Curious, open-ended, philosophical. Asks more than it tells.
coach: Action-oriented, structured, gently accountable. Suggests small doable steps.
direct: Honest and concise. Names patterns plainly but kindly. No softening filler.
Transparency requirement: Every chat reply must populate context_basis, e.g. "Based on your last 7 entries where you mentioned feeling tired."

7. DESIGN TOKENS
export const colors = {
  bg:           '#111111',
  surface:      '#1E1C1B',
  accentGold:   '#C8A97E',
  accentSage:   '#7C9E8A',
  textPrimary:  '#F0EDE8',
  textSecondary:'#8A8680',
  moodAmber:    '#D9A441',
  moodRose:     '#C98B8B',
  moodSlate:    '#7E8AA0',
  moodSage:     '#7C9E8A',
};

export const fonts = {
  display: 'Canela',          // or fallback serif (Lora)
  body:    'Inter',
  journal: 'Lora',
};

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 };
export const radius  = { sm:8, md:14, lg:20, pill:999 };
8. CODING STANDARDS
TypeScript strict; no any. Define explicit types/interfaces for all data.
Feature-folder structure; keep DB logic, hooks, and screens co-located per feature.
All DB access through typed Drizzle queries — no raw SQL in components.
Components must be small and composable. Extract anything reused twice.
No secrets in client code. Backend env vars only.
Write a Vitest unit test for any non-trivial logic (context-building, AI exclusion filter, date grouping).
Use React Query for all async; Zustand only for synchronous global UI state.
Accessibility: all interactive elements labeled; respect reduced-motion.
9. DEFINITION OF DONE (MVP)
 Diary: create/edit/delete + mood/energy/focus + AI observation
 Thoughts: fast capture + tagging + search + linking
 Vault: URL paste + auto-enrich + categorize
 AI Chat: 3 modes, 14-day context, transparency line, disclaimer
 Privacy: app lock, per-entry lock, AI-exclusion enforced, JSON export
 Onboarding + calm home dashboard
 Fully offline except AI features
 No keys on client; backend proxy working
 App feels calm, private, non-judgmental throughout
10. INSTRUCTIONS FOR CLAUDE CODE
Start with Phase 1 and proceed sequentially. Do NOT skip ahead.
After each phase, summarize what you built and how to run/verify it.
If a decision is ambiguous, default to the calmest, most private option — or ask me.
Never introduce a new major dependency without flagging it first.
Prioritize correctness and emotional tone of UX over feature quantity.
At the end of each phase, run the app and confirm no errors before continuing.