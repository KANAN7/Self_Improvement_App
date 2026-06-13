# Inward — Knowledge Repo

A living reference for the concepts, vocabulary, and architecture decisions behind the Inward app. Skim it, jump around, come back when something feels foggy. Pairs with `CLAUDE.md` (the build spec) — that one says *what* to build; this one explains *why* and what the words mean.

> Tip: this file is meant to be read out of order. Use the table of contents to jump to what you need.

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Where data physically lives](#where-data-physically-lives)
3. [How AI is tailored to the user](#how-ai-is-tailored-to-the-user)
4. [Voice modes (reflective / coach / direct)](#voice-modes)
5. [API costs & budget](#api-costs--budget)
6. [Are we doing something novel?](#are-we-doing-something-novel)
7. [Foundations vocabulary](#section-1--foundations)
8. [Our specific stack vocabulary](#section-2--our-specific-stack)
9. [LLM / Agentic vocabulary](#section-3--the-agentic--llm-world)
10. [DevOps / Git / Tooling vocabulary](#section-4--devops--git--tooling)
11. [The 12 most important terms to memorize](#the-12-terms-most-worth-memorizing)
12. [Beginner Q&A](#beginner-qa)

---

## Architecture overview

> **Inward is a local-first, cross-platform journaling app.** Data lives on the user's device. The backend is a stateless proxy that exists only so AI calls can use a server-side API key.

### Diagram (today, Phases 1–2)

```
┌──────────────────────────────────────────────────┐
│                  Your phone / browser            │
│                                                  │
│   React Native UI (screens, forms, components)   │
│              │                                   │
│              ▼                                   │
│   React Query (cache + async state)              │
│              │                                   │
│              ▼                                   │
│   Drizzle ORM (typed query builder)              │
│              │                                   │
│              ▼                                   │
│   ┌────────────────┬─────────────────┐           │
│   │  Native:       │  Web:           │           │
│   │  expo-sqlite   │  localStorage   │           │
│   │  (real DB)     │  (mock for dev) │           │
│   └────────────────┴─────────────────┘           │
└──────────────────────────────────────────────────┘
```

Today there is **no backend at all**. Everything is local. When you write a diary entry:

1. The form submits to a React Query mutation
2. The mutation calls a typed Drizzle query (`db.insert().values().returning()`)
3. Drizzle compiles that to SQL
4. `expo-sqlite` writes it to a local SQLite file (`inward.db`) inside the app's private data folder
5. The mutation invalidates the list cache, the list re-queries, the new entry appears

Nothing leaves your phone. No internet required.

### Diagram (Phases 5+ with AI)

```
┌─────────────────────────┐         ┌────────────────────────┐
│   Phone (React Native)  │         │   Hono backend (Node)  │
│                         │         │                        │
│   Local SQLite (always) │  HTTPS  │   Stateless proxy      │
│         │               │ ───────►│   - Adds API key       │
│   Build context payload │         │   - Forwards to Claude │
│   from recent entries   │         │   - Streams response   │
│         │               │ ◄─────── │   - No DB, no logs of │
│   Display AI response   │         │     entry contents     │
└─────────────────────────┘         └────────────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────────┐
                                    │  api.anthropic.com   │
                                    │  (Claude Sonnet 4)   │
                                    └──────────────────────┘
```

### What the backend will actually do (Phase 5 spec)

Three endpoints, total. Stateless. No database.

| Endpoint | What it does |
|---|---|
| `POST /enrich` | `{ url }` → `{ title, thumbnailUrl, contentType }` (Open Graph / oEmbed scraping for the Vault) |
| `POST /ai/chat` | `{ messages, context, mode }` → **streaming** Claude response |
| `POST /ai/analyze` | `{ entry, recentContext }` → `{ summary, question, tone }` (post-save diary observation) |

That's the entire backend surface. No accounts, no sessions, no user database.

### Why a backend at all?

Three things the client physically can't do safely:

1. **Hold the Anthropic API key.** If we shipped it in the app, anyone could decompile the APK and steal it.
2. **Scrape arbitrary URLs.** CORS blocks browsers from fetching most sites; mobile User-Agents get blocked too. Server-side fetching avoids both.
3. **Rate-limit per device.** Without a backend, a bug or abuse could blow up your Anthropic bill.

---

## Where data physically lives

### Today (Phases 1–2)

- **Android (Expo Go now):** `/data/data/host.exp.exponent/databases/inward.db`
- **Standalone Android (later):** `/data/data/com.yourname.inward/databases/inward.db` — sandboxed; only your app can read it
- **Web (dev only):** browser localStorage under the key `inward.diary_entries.v1`
- **iOS (if we ever ship):** the app's `Documents` directory

### When AI features arrive

```
Phone reads entries from local SQLite
    ↓
Phone packages a context payload in memory
    ↓
Phone sends it to our Hono backend over HTTPS
    ↓
Hono backend forwards to api.anthropic.com (with API key)
    ↓
Anthropic returns response
    ↓
Hono streams it back to phone
    ↓
Phone stores Anthropic's response in local SQLite
    ↓
[Backend forgets everything — no logs, no DB writes]
```

Entries pass *through* the backend's RAM for milliseconds. Never written to disk on the server.

### Why not MongoDB / Postgres / Firebase?

Those make sense when data needs to be *shared across devices, users, or sessions*. None of those apply here:

- One user, one device
- No social features
- No cross-device sync (yet)
- No analytics on content

A central database would be:
- Costly to run (servers, backups, scaling)
- A privacy attack surface (leaks, insider access, subpoenas)
- Architectural overkill

This local-first stance is *the* differentiator versus Day One (cloud), Reflectly (cloud + analytics), Replika (cloud + AI training on your chats).

### What we lose

- If you uninstall the app, data is gone
- If you switch phones, data doesn't follow
- If the phone dies, data is gone

Phase 8 partial answer: **export all data as JSON.** Manual but private. Real cross-device sync is a v2 problem (encrypted iCloud/Drive sync, end-to-end encrypted server, or CRDT-based local sync).

---

## How AI is tailored to the user

> **The phone doesn't ship raw entries to a server profile. Context travels with each request.**

### One round-trip in detail

```
1. User types: "I keep avoiding writing my report. Why?"
   ↓
2. Phone reads from local SQLite:
   • Last 14 days of non-excluded diary entries
   • Last 20 non-excluded thoughts
   • Last 30 chat messages from this session
   • User's selected mode (reflective / coach / direct)
   ↓
3. Phone packages it into a Claude API payload:
   {
     "system": "<Inward base prompt + mode modifier>",
     "messages": [
       { "role": "user", "content":
           "Recent entries:\n[2026-06-09] Tired again, work felt heavy...\n
            Recent thoughts:\n- 'I avoid hard things when I'm tired'\n
            Current message: 'I keep avoiding writing my report. Why?'"
       }
     ]
   }
   ↓
4. Phone POSTs this to our Hono backend
   ↓
5. Hono adds Anthropic API key header, forwards to Claude
   ↓
6. Claude responds, grounded in those specific entries:
   "You've mentioned twice this week that mornings are when you have
    momentum, and yesterday you noted you avoid hard things when tired.
    What would it look like to give the report your morning energy
    tomorrow, before anything else?"
   ↓
7. Backend streams response → phone displays it
   ↓
8. Phone stores both messages in local chat_messages table
   ↓
9. Backend forgets the conversation entirely
```

### Why this works

Claude has a **200K-token context window** (~150,000 words). A year of diary entries is well under that. We can send relevant chunks of your entire history with every request and Claude will use it.

### Selective context (smart filtering)

Older context is filtered out client-side. Excluded entries (`ai_excluded = 1`) are filtered out client-side. Locked entries are filtered out client-side. **The user has full control because filtering happens on their phone.**

| AI feature | Context sent |
|---|---|
| Diary analysis (Phase 6) | New entry + last 5 non-excluded entries |
| Chat opening (Phase 7) | Last 14 days entries + last 20 thoughts |
| Chat follow-up (Phase 7) | Same + last 30 messages of current chat |
| Pattern observation (Phase 9, weekly) | Last 7 days only |

### What about long-term memory?

Once a user has 10,000+ entries, we can't send all of them. Two post-MVP options:

1. **Client-side summarization** — once a month, the phone summarizes older entries into themes. Stored in a new `entry_summaries` table on the phone. Sent as compact context for chat.
2. **Local embeddings + semantic search** — phone builds a vector index of all entries, retrieves the most relevant ones per query.

Both stay local-first.

---

## Voice modes

> Same context, same model, three different system-prompt modifiers. **One persona, three communication styles.**

### The three modes (CLAUDE.md §6)

```
reflective: Curious, open-ended, philosophical. Asks more than it tells.
coach:      Action-oriented, structured, gently accountable.
direct:     Honest and concise. Names patterns plainly but kindly.
```

### Mechanism

```
Every AI request →  [shared base prompt] + [mode modifier] + [user context] + [user message]
                          ↑                    ↑
                  CLAUDE.md §6 base    one of three short blocks
                  (the "Inward DNA")    (the "Inward voice")
```

**Base prompt** sets unchanging principles: observational, non-judgmental, grounds in user's words, no diagnosis, no therapy claims, transparency required, crisis handling. **Doesn't change between modes.**

**Mode modifier** changes the *voice*. Same underlying values, different way of speaking.

### Where the mode lives in code

1. `app_settings.default_ai_mode` — the user's preferred starting mode (already in Phase 1 schema)
2. `chat_messages.mode` — every assistant message records its mode (already in schema)
3. Mode picker UI — built in Phase 7 as a small segmented control in the chat header

### Modifier prompts (drafts)

**Reflective:**
```
You are in REFLECTIVE mode.
- Ask more than you tell. Most replies should end with one open-ended question.
- Mirror back what the user wrote in their own language before extending it.
- Lean into the philosophical and the felt. Avoid prescriptions.
- It's okay to sit with discomfort. You don't need to resolve it.
```

**Coach:**
```
You are in COACH mode.
- Be action-oriented and structured. Identify the one thing that matters most.
- Offer a small, doable next step (10 minutes or less, today if possible).
- Hold the user gently accountable to commitments they made in past entries.
- Stay warm — this is coaching, not drill-sergeant talk.
```

**Direct:**
```
You are in DIRECT mode.
- Be honest and concise. No softening filler ("just", "maybe", "I wonder if").
- Name patterns plainly when you see them, citing the entries they came from.
- Trust the user to handle real observations. Don't sandwich critique in praise.
- Stay kind. Direct ≠ harsh.
```

### Worked example — same context, three replies

> **User**: "I keep telling myself I'll work on the report tomorrow."
> **Context**: Last 5 entries mention low energy, two mention avoiding "the report", one says "mornings feel possible."

**Reflective (~50 words):**
> *"You've used the word 'tomorrow' three times this week — each time about the same report. What is tomorrow holding for you that today isn't? Sometimes 'tomorrow' is hope; sometimes it's a quiet way of saying 'not yet.' What does it feel like for you?"*

**Coach (~45 words):**
> *"You've named this report twice and put it off twice. On Sunday you wrote that mornings feel possible. Try this: tomorrow, before opening anything else, give the report 15 focused minutes — just the first paragraph. Then journal a sentence about how it felt. Will you?"*

**Direct (~30 words):**
> *"You've avoided this report twice this week. The pattern won't break itself. You wrote on Sunday that mornings feel possible — that's the window. Don't negotiate with yourself tonight. Open the doc tomorrow, 8am."*

### UX rules

- **Default mode** picked in onboarding (Phase 9). Defaults to `reflective`.
- **Per-conversation switcher** — segmented control at top of chat. Existing messages keep their original mode label.
- **Per-entry diary analysis (Phase 6)** always uses **reflective** mode regardless of user setting. Action items would feel pushy after just-finished writing.
- **Crisis handling overrides all modes.** Coach mode does NOT respond to crisis with action steps. Handled at the base-prompt layer.

### Open design decisions (revisited in Phase 7)

- **No user-customized modes in MVP.** Three good voices > infinite mediocre ones.
- **AI never silently switches modes.** It can suggest *"Want me to switch to coach mode for this?"* — user is in control.
- **No fourth mode.** Three is the Goldilocks number.

---

## API costs & budget

### Anthropic Claude Sonnet 4 pricing (June 2026)

| Token type | Price |
|---|---|
| Input | $3.00 per 1M tokens |
| Output | $15.00 per 1M tokens |
| Cached input | $0.30 per 1M tokens (10× cheaper for re-used context) |

A token ≈ ¾ of an English word. No monthly minimum, no per-seat cost. Pay-as-you-go.

### Per-call cost estimates

| Feature | Input | Output | Cost |
|---|---|---|---|
| Diary analysis | 2,050 tok | 150 tok | **~$0.0085** (under 1¢) |
| Chat — opening message | 5,900 tok | 200 tok | **~$0.021** (~2¢) |
| Chat — follow-up (with prompt caching) | 800 fresh + 5,900 cached | 200 tok | **~$0.0072** (~0.7¢) |

### Per-user, per-month modeled

For an "engaged user" (1 entry/day, chat every other day, 4 follow-ups on chat days):

| Frequency | Cost |
|---|---|
| Daily total | ~$0.033 |
| Weekly | ~$0.23 |
| Monthly | ~$1.00 |
| Yearly | ~$12 |

Casual users (3 entries/week, weekly chat): **~$0.30–0.50/month.**
Power users (multi-entry/day, daily chat): **~$2–3/month.**

### Your dev budget

| Phase | Realistic spend |
|---|---|
| Phases 5–6 dev | $10–15 |
| Phase 7 (chat) dev | $15–20 |
| **Total to ship MVP** | **$30–50** |

### When real users arrive

Costs scale linearly with users. There's no "fixed cost / unlimited users" stage like classic SaaS.

| Users | Monthly cost to you |
|---|---|
| You + 5 friends | ~$6 |
| 50 beta users | ~$25–40 |
| 500 active users | ~$300–500 |
| 5,000 active users | ~$3,000–5,000 |

This is why journaling AI apps **all charge subscriptions.** Day One: $3/mo. Reflectly: $10/mo. Stoic: $5/mo.

Rule of thumb: **charge ~3× your variable cost per user.**

### Safety steps before Phase 5

1. Sign up at console.anthropic.com
2. Add **$20 in starter credits**
3. **Set monthly hard limit at $50** in Anthropic console — caps blast radius if anything spikes
4. API key in `backend/.env` only — never client, never git

### Cost optimizations available later

- **Aggressive prompt caching** — already planned, ~40–60% chat savings
- **Use Haiku for non-critical calls** — ~10× cheaper than Sonnet
- **Smart context truncation** — summarize older entries instead of sending verbatim

---

## Are we doing something novel?

### Mainstream self-improvement apps are cloud-first

| App | Architecture |
|---|---|
| Day One | Cloud sync, encrypted server-side |
| Reflectly | Cloud + analytics, AWS |
| Stoic | Cloud (Firebase + own servers) |
| Daylio | Local-first* with optional cloud backup |
| Journey | Cloud sync (iCloud/Drive) |
| Replika / Pi.ai | Heavy cloud, chats stored & analyzed |
| Headspace / Calm | Cloud, analytics-heavy |
| Finch | Cloud, gamified, daily streak nudges |

Of the top 50 self-improvement apps by download, maybe 2–3 are local-first.

### The local-first movement

Inspired by *Local-first software* (Kleppmann + Ink & Switch, 2019) → https://www.inkandswitch.com/local-first/

Apps in this lineage:
- **Bear** (notes, macOS/iOS) — local SQLite
- **Obsidian** — local Markdown files
- **Logseq** — local files, open-source
- **Standard Notes** — E2E encrypted
- **Apple Health, Apple Journal** — local-first by design
- **Linear** — uses local-first internally for sync-engine perf
- **Reflect** (notes, not Reflectly) — has local-first AI proxy

### What's genuinely novel about Inward

1. **Transparency requirement** — every AI reply shows which entries were used (`context_basis`). Most apps hide this.
2. **Per-entry AI exclusion** as a first-class data field.
3. **Three explicit voice modes** with the same context.
4. **Combination**: local-first + transparent AI + per-entry consent + non-engagement product values is rare.

### Honest market reality

- ✅ Real, growing audience for privacy-conscious AI journals
- ❌ Smaller than the engagement-driven mass market
- ❌ Will not become Replika-scale
- ✅ Will be a high-quality, principled niche, like Bear or Obsidian

---

## Section 1 — Foundations

Vocabulary you'll hear every day.

### App / mobile / native / web

- **Native app**: code that runs directly on the phone's OS using its native UI primitives. Faster, can access hardware (camera, biometrics).
- **Web app**: code that runs in a browser. Universal but with hardware limits.
- **Cross-platform**: one codebase that ships to both. **React Native + Expo (our stack) is cross-platform.**
- **PWA (Progressive Web App)**: a web app that *behaves* like an installed app.

### Frontend / Backend / Full-stack

- **Frontend**: what the user sees. Our React Native code. Runs on the phone.
- **Backend**: server code the user never sees. Handles secrets, talks to external APIs. Ours will be Hono on Node.js (Phase 5).
- **Client/Server**: same idea, more old-school. Phone = client; backend = server.

### Frameworks vs. libraries

- **Framework**: opinionated structure that says "build the app this way." Hard to opt out of. **React Native, Expo, Hono.**
- **Library**: a tool you call when you need it. **Drizzle, Zustand, React Query.**
- **Rule of thumb**: a framework calls *your* code; *your* code calls a library.

### Build / Bundle / Compile

- **Compile**: convert source code to runnable form. TypeScript → JavaScript.
- **Bundle**: combine all your files into one for shipping. Metro does this.
- **Build**: the whole pipeline — compile + bundle + assets + optimization.

### Hot reload / Fast refresh

When you save a file, the app on your phone updates **without losing state**. Metro handles this in dev mode.

---

## Section 2 — Our specific stack

### Expo

A managed wrapper around React Native that hides native build complexity. *Expo Go* is the test app on your phone; *EAS Build* is for production builds. **SDK version** must match between project and Expo Go (we're on **SDK 54**).

### Expo Router

**File-based routing**: the file system *is* the navigation. `src/app/diary/index.tsx` becomes the `/diary` route. Same idea Next.js uses on the web.

### TypeScript / strict mode

- **TypeScript**: JavaScript with types. Declare what shape data has; TS catches mistakes at compile time.
- **Strict mode**: refuses cheating with `any`, untyped variables, or null mistakes. CLAUDE.md §8 mandates it.

### NativeWind / Tailwind

- **Tailwind CSS**: instead of `style="color: gold"` you write class names like `text-yellow-500`. Looks ugly at first, becomes addictive.
- **NativeWind**: makes Tailwind work in React Native (which natively uses inline `style={}` objects).

### Zustand vs. React Query

Both manage "state" but for different jobs:
- **Zustand**: synchronous global state. UI toggles, current selected mode, theme settings. *Things that live in memory.*
- **React Query (TanStack Query)**: asynchronous data state. Database queries, AI responses — anything with loading/error/cached states. *Things that come from elsewhere.*

(See deep dive in [Q2 below](#q2-go-more-basic--explain-zustand-react-query-asynchronous-state).)

### Drizzle ORM

- **ORM (Object-Relational Mapper)**: write database queries in TypeScript instead of raw SQL. `db.select().from(diaryEntries)` instead of `SELECT * FROM diary_entries`.
- **Why**: type safety. The compiler knows your schema, catches typos before runtime.

(See deep dive in [Q3 below](#q3-what-is-drizzle-and-how-does-it-work-in-our-case).)

### SQLite / WASM

- **SQLite**: a self-contained, file-based database. Whole DB is one file on the phone. No server, no setup. Powers WhatsApp, Firefox, every iOS app.
- **WASM (WebAssembly)**: runs binary code in browsers. `expo-sqlite` *can* run as WASM in browsers, but we sidestepped that and used localStorage on web.

### localStorage / IndexedDB

- **localStorage**: browser-native key-value store. Simple, ~5MB limit, synchronous. Our web fallback DB. (See [Q4](#q4-where-is-localstorage-data-stored).)
- **IndexedDB**: more powerful browser DB. We don't use it.

### React Native primitives

- **Component**: a reusable piece of UI. `<Button />`, `<Card />`. Composes like Lego.
- **View**: the universal container, like `<div>` on the web.
- **Text**: every piece of text *must* be wrapped in `<Text>`. (Trips everyone up at first.)
- **Pressable / Touchable**: handles taps. We use Pressable.
- **Hook**: a function that starts with `use*` and gives a component access to React's features. (See [Q5](#q5-is-a-hook-an-action-enabler-for-components).)

### Metro

The bundler that powers React Native. Combines all your `.tsx` files + node_modules + assets into one JS bundle the phone can run. Scanning the QR makes your phone connect to Metro and download the bundle.

---

## Section 3 — The Agentic / LLM world

### Models, providers, APIs

- **LLM (Large Language Model)**: a neural network trained on huge text corpora that predicts the next word. **Claude, GPT-4, Gemini, Llama** are LLMs.
- **Foundation model / Frontier model**: the same idea, with "frontier" implying state-of-the-art. **Claude Opus 4, Sonnet 4, Haiku 4.**
- **Model provider**: company that hosts and sells access. **Anthropic** (Claude), **OpenAI** (GPT), **Google** (Gemini), **Meta** (Llama).
- **API**: the contract for how your code talks to a service over the network. *"The Anthropic API"* = the URL endpoints Anthropic exposes.
- **API key**: a secret string proving it's *you* making the request. Treat like a credit card number.

### Tokens

- **Token**: the unit a model reads and writes. ≈ ¾ of an English word.
- **Tokenizer**: the function that splits text into tokens.
- **Context window**: the maximum tokens a model can see at once. Sonnet 4 has **200K**, Opus 4 has **1M**.
- **Input/Output tokens**: input = what you send; output = what the model writes. Output is usually 5–10× more expensive per token.

### Prompts

- **Prompt**: the text you send to the model. The whole input.
- **System prompt**: instructions that set the model's role/behavior. *"You are a calm reflection companion..."* (See [Q7](#q7-where-and-when-is-the-system-prompt-passed).)
- **User prompt / message**: what the user typed.
- **Assistant message**: what the model said. Becomes part of the next prompt's history.
- **Few-shot prompting**: showing 2–3 examples before asking. *"Here's input A → output B; now do this: input E."*
- **Zero-shot**: just asking, no examples.
- **Chain-of-thought (CoT)**: prompting the model to "think step by step."
- **Prompt engineering**: the craft of writing prompts that produce reliable results.

### How models actually run

- **Inference**: running the model to produce output. Costs money.
- **Streaming**: tokens arrive one at a time as generated, instead of waiting for the whole reply. Why ChatGPT/Claude feel "alive."
- **Latency**: time from request to first response token.
- **Throughput**: tokens/second once started.
- **Temperature**: 0 to 1+ randomness setting. 0 = deterministic. 1 = creative. 0.7 = common default.

### Tool use / Agents

- **Function calling / Tool use**: the model can decide to call a function in your code. *"Hmm, the user asked the weather; I'll call `get_weather('Mumbai')`."*
- **Tool / Function**: the actual code the model can choose to call.
- **Agent**: an LLM that operates in a loop, calling tools and using their outputs to decide what to do next.
- **Agentic loop**: {LLM thinks → calls tool → reads result → thinks → calls another tool → ...}. Claude Code (the CLI you're using) is an agent.
- **ReAct pattern**: an early agent design — Reasoning + Acting interleaved.
- **Multi-agent**: multiple LLMs collaborating with different roles.
- **Subagent**: an agent invoked by another agent for a specific subtask.

### What Inward is and isn't

| Pattern | Description | Are we using it? |
|---|---|---|
| Single-turn LLM call | One prompt in, one response out | ✅ Phase 6 diary analysis |
| Multi-turn chat | Back-and-forth with history | ✅ Phase 7 chat |
| Tool use | LLM calls functions | ❌ Not in MVP |
| Agentic loop | LLM autonomously runs tools | ❌ Not appropriate here |

We're building a **single-turn analyzer + multi-turn chat**, not an agent. Agents are powerful but unpredictable, and unpredictability is the opposite of what a calm reflection app needs.

### Claude-specific

- **Anthropic** (company), **Claude** (model family).
- **Versions**: Opus (top capability, top cost), Sonnet (balanced — what we use), Haiku (fastest, cheapest).
- **Messages API**: the modern Anthropic endpoint.
- **Prompt caching**: marking parts of a prompt as cacheable; re-using them costs 10% of normal price. We'll use this heavily.
- **Citations**: a Claude feature where the model can cite which input it used. Powers our `context_basis`.

### RAG — Retrieval-Augmented Generation

- Fetch relevant data from a database/document store and stuff it into the prompt before sending.
- **Inward uses light RAG**: we retrieve recent entries from local SQLite and include them in the prompt. No embeddings yet (that's vector RAG).

### Embeddings & vector search

- **Embedding**: a number array (vector) representing the *meaning* of text. Similar meanings → similar vectors.
- **Vector database**: stores embeddings for similarity search. Pinecone, Weaviate, Chroma, pgvector.
- **Vector RAG**: retrieves context by semantic similarity instead of keyword matching.
- **Are we using it?** Not in MVP. Maybe v1.5+ for long-term memory.

### Fine-tuning vs. prompting

- **Fine-tuning**: re-training a model on specific data. Expensive, locks you to a model version.
- **Prompting**: just writing better prompts. Cheap, fast, no commitment.
- **Modern wisdom**: prompt first, fine-tune almost never. We do prompting only.

### Hallucination / Grounding

- **Hallucination**: when a model confidently says something false.
- **Grounding**: forcing the model to base output on real data you provide. *"Reference specifics from the entry. Do not be generic."* (CLAUDE.md §6 mandates.)
- **Why care**: ungrounded reflection AI would invent details about the user's life — catastrophic for trust.

### Safety / Alignment

- **Alignment**: making AI behave in line with human intent.
- **Guardrails**: rules in the system prompt to prevent specific bad outputs. *"Never diagnose. Never claim to be a therapist."*
- **Refusal**: when the model declines something.
- **Jailbreak**: a prompt that tricks the model into ignoring guardrails. Mostly relevant for public-facing products.
- **Red-teaming**: trying to break your system to find weaknesses.

### Operational

- **Rate limiting**: capping requests per device. Prevents abuse and runaway costs.
- **API quota**: total monthly budget. Set hard limits in Anthropic console.
- **Latency budget**: time before users feel it's slow. Mobile target: <500ms.
- **Token budget**: cap on tokens per request.
- **Telemetry / Observability**: logging what your system did. We'll log AI request *counts*, not contents.
- **Eval / Evaluation**: a test suite for AI quality. We'll write a small one in Vitest.

### Inward-specific

- **Local-first**: data lives on the device.
- **Stateless backend**: server holds no user data between requests.
- **Proxy / BFF (Backend-for-Frontend)**: a thin server layer that mediates between client and external services. (See [Q8](#q8-how-exactly-does-proxy--bff-work).)
- **Per-call context**: send fresh context with every API call, instead of building a server-side profile.
- **End-to-end encryption (E2EE)**: encrypted on sender's device, decrypted on receiver's. Servers see only ciphertext. Not needed for MVP since data doesn't travel between devices.

---

## Section 4 — DevOps / Git / Tooling

### Git

- **Repo / Repository**: the project's code history.
- **Commit**: a saved snapshot with a message.
- **Branch**: a parallel line of work. `main` is canonical.
- **Push / Pull**: send commits to/from GitHub.
- **Merge / Rebase**: combine branches. Rebase rewrites history; merge preserves both.
- **PR / Pull Request**: a proposal to merge one branch into another, usually with review.

### Package management

- **Dependencies**: libraries your code needs (`package.json` "dependencies").
- **Dev dependencies**: tools needed only during development (TypeScript, drizzle-kit). Smaller production bundles.
- **Lockfile (`package-lock.json`)**: pins exact versions so other machines install the same. Always commit it.
- **Peer dependencies**: a library says *"I need version X of Y alongside me, but I won't install it myself."* Source of pain when versions don't align.

### Environments

- **Dev / Local**: your machine, debugging mode, hot reload.
- **Staging**: production-like for testing. We won't have one for MVP.
- **Production / Prod**: what real users use.
- **Env vars (`.env`)**: secrets and config that change per environment. Never commit `.env` to git.

### Mobile-specific

- **Expo Go**: the test app for unbuilt React Native code. SDK must match.
- **Development build**: a custom build that includes any native modules Expo Go doesn't have.
- **APK / AAB**: Android formats. APK = old installable; AAB = newer Play Store format.
- **IPA**: iOS app file.
- **Code signing**: cryptographically signing your app so the OS trusts it.
- **EAS Build**: Expo's cloud service that builds APKs/IPAs for you.
- **OTA updates**: pushing JS-only changes to users without going through app stores.

---

## The 12 terms most worth memorizing

If you absorb only these, you can read 80% of docs/blogs/HN threads in this space:

1. **Token** — what you pay for
2. **Context window** — what the model can see at once
3. **Prompt** (system / user / assistant) — what you send
4. **Inference** — running the model = the cost
5. **Streaming** — tokens arriving live
6. **API key** — secret, never client-side
7. **RAG** — fetch context, stuff in prompt
8. **Hallucination / Grounding** — making things up vs. staying real
9. **Tool use / Agent** — LLMs that call functions / loop
10. **Hook** (React) — `use*` functions
11. **ORM** (Drizzle) — typed DB queries
12. **Local-first / Stateless backend** — our architectural stance

---

## Beginner Q&A

### Q1: Knowledge repo

> *"Get all the information you gave to a md file as knowledge repo."*

Done — this file. Read top-down or jump via the table of contents. Living document; we'll keep adding as the project evolves.

---

### Q2: Go more basic — explain Zustand, React Query, asynchronous state

The cleanest way to understand these is to see them as solutions to **two different "where does data live?" problems** in a UI app.

#### What is "state"?

State = data that changes while the app is running. The current user input, whether a sheet is open, the diary entries you've fetched — all "state."

There are two flavors:

| Flavor | Source | Examples |
|---|---|---|
| **Synchronous state** | Lives in memory; instant access; you set it directly | "Is the menu open?" "What mode is selected?" "What did the user type?" |
| **Asynchronous state** | Lives elsewhere (DB, server, API); you have to *wait* for it | "Give me all diary entries." "Save this entry." "Get AI response." |

The two require very different tools. Mixing them is where most bugs happen.

#### Synchronous global state — that's what Zustand handles

**The problem:** sometimes you need data shared across many components. The "current selected AI mode" needs to be read by both the chat header (showing which mode is active) and the chat input (sending messages with that mode).

Without a tool, you'd pass the value through every layer of components — "prop drilling." Painful.

**Zustand's answer:** a tiny global "store." Components subscribe to whatever piece they need; the store updates, only those components re-render.

```ts
// Define a store
const useUIStore = create((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((s) => ({ isMenuOpen: !s.isMenuOpen })),
}));

// Use it in any component
const isOpen = useUIStore((s) => s.isMenuOpen);
```

**Mental model**: Zustand is "shared variables across components, with automatic re-renders when they change." That's it.

We will use Zustand in Phase 7 for things like "current AI mode," "is the privacy modal open," etc.

#### Asynchronous state — that's what React Query handles

**The problem:** when data lives in a database or comes from a server, you need to handle:

- **Loading**: the request is in flight; show a spinner / skeleton
- **Error**: it failed; show what happened
- **Success**: it worked; display the data
- **Cache**: keep the result so we don't re-fetch the same thing
- **Invalidation**: this data is now stale; re-fetch
- **Mutation**: changing data on the server, then updating local cache

If you write all this by hand (using `useState` and `useEffect`), it's hundreds of lines per feature, and the bugs are subtle.

**React Query's answer:** a hook that wraps your async function and handles all six concerns automatically.

```ts
// In our diary feature
export function useDiaryEntries() {
  return useQuery({
    queryKey: ['diary', 'entries'],
    queryFn: () => listEntries(),  // returns Promise<DiaryEntry[]>
  });
}

// In a screen
const { data: entries, isLoading, error } = useDiaryEntries();
if (isLoading) return <Loading />;
if (error) return <Oops />;
return <List items={entries} />;
```

**Mental model**: React Query is "useState, but for data that lives somewhere else." It memorizes results, refetches when needed, and gives you loading/error states for free.

It also handles **mutations** (creating/updating/deleting):

```ts
const createEntry = useMutation({
  mutationFn: (input) => createEntryDb(input),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['diary', 'entries'] });
    // ↑ "the list is now stale; React Query, please refetch"
  },
});
```

When you write a new diary entry, the list automatically updates because we invalidate its cache.

#### So why two libraries instead of one?

- Zustand for **synchronous, ephemeral, in-memory** state (does the menu show?)
- React Query for **asynchronous, persistent, fetched-or-fetched-from-DB** state (what entries does the user have?)

Trying to use Zustand for diary entries means you'd manually rebuild loading/error/cache/invalidation. Trying to use React Query for "is the menu open" is overkill — there's no async, no caching needed.

The right tool for the right job. They coexist peacefully — Zustand handles UI memory, React Query handles data flowing in/out.

---

### Q3: What is Drizzle and how does it work in our case?

#### The problem Drizzle solves

We have SQLite on the phone. SQLite speaks SQL — text strings like:

```sql
INSERT INTO diary_entries (id, content, mood) VALUES ('abc123', 'Today was calm', 4);
```

Writing SQL in your TypeScript app has problems:
- **No type safety.** Typo in column name? Found at runtime, not compile time.
- **Manual mapping.** SQLite returns `mood: 1` (integer); you wanted `mood: number`. SQLite returns `created_at: 1718456789000` (number); you wanted `Date`. You convert manually for every query.
- **Schema drift.** You renamed a column in the DB but forgot to update three queries. They silently break.
- **SQL injection** if you're not careful with string concatenation.

#### What Drizzle gives us

Drizzle is a **TypeScript-first ORM** ("Object-Relational Mapper"). It lets you describe your schema in TypeScript and write queries as TypeScript expressions, with the compiler watching your back.

#### Step 1 — Define the schema (in TypeScript)

In `src/lib/db/schema.ts`:

```ts
export const diaryEntries = sqliteTable('diary_entries', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  mood: integer('mood'),                                    // nullable number
  aiExcluded: integer('ai_excluded', { mode: 'boolean' })   // stored as 0/1, typed as boolean
    .notNull()
    .default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  // ...
});

export type DiaryEntry = typeof diaryEntries.$inferSelect;  // ← magic
```

That last line is the killer feature. `DiaryEntry` is now a precisely-typed TypeScript type generated from the schema. If you misuse a field, TypeScript yells at you at compile time.

#### Step 2 — Write queries (still TypeScript)

In `src/features/diary/db.ts`:

```ts
// Get all entries, newest first
return db.select().from(diaryEntries).orderBy(desc(diaryEntries.createdAt));

// Get one by id
return db.select().from(diaryEntries).where(eq(diaryEntries.id, id)).limit(1);

// Insert a new one
const [row] = await db
  .insert(diaryEntries)
  .values({ id, content, mood, ... })
  .returning();
```

No raw SQL. Drizzle compiles these expressions to SQL strings and sends them to SQLite at runtime.

If you typo a column name (`diaryEntries.mod` instead of `mood`), TypeScript catches it. If you try to insert a string into the `mood` column, TypeScript catches it. If you forget a required field, TypeScript catches it.

#### Step 3 — Run on a real DB

In `src/lib/db/client.native.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('inward.db');
export const db = drizzle(sqlite, { schema });
```

That's it — `db` is now a typed Drizzle client backed by a real SQLite file.

#### How automatic conversions help

We described `aiExcluded` as `mode: 'boolean'`. SQLite has no native booleans (it stores 0/1), but Drizzle automatically:
- Converts `false` → `0` on insert
- Converts `0` → `false` on select

Same with timestamps: we store milliseconds as integers but read/write `Date` objects in TypeScript. Drizzle handles the conversion.

#### How it composes with React Query

```
[React Query hook]
       ↓ calls
[feature/db.ts function]
       ↓ uses
[Drizzle ORM]
       ↓ compiles queries to SQL and runs against
[expo-sqlite]
       ↓ which is just
[A real SQLite file on disk]
```

Each layer has one job. React Query handles the loading/error/cache UX. Drizzle handles the type-safe queries. expo-sqlite handles the file. You can swap any layer without rewriting the others — that's why we could swap Drizzle out for `localStorage` on web (`db.web.ts`) without changing the React Query hooks at all.

#### Why not just write raw SQL?

You can! Some projects do. But the TypeScript safety net is huge for a complex schema — and ours is going to grow (thoughts, vault items, chat messages, settings, AI summaries, eventually entry summaries). Drizzle pays for itself the first time it catches a bad query at compile time.

---

### Q4: Where is localStorage data stored?

#### What it is

localStorage is a built-in browser feature — every browser (Chrome, Edge, Firefox, Safari) provides it as a key-value store. **JavaScript on a web page can read/write small strings to it, and they persist across page refreshes.**

```js
localStorage.setItem('inward.diary_entries.v1', JSON.stringify(entries));
const data = localStorage.getItem('inward.diary_entries.v1');
```

Both the key and value are strings. To store an object, you `JSON.stringify` on the way in and `JSON.parse` on the way out. Our `db.web.ts` does exactly this.

#### Where the actual bytes live

Each browser has its own format and location, but the principle is identical: **a small SQLite file or LevelDB folder buried in your user profile, scoped to the origin (the website's domain).**

| Browser | Path on Windows |
|---|---|
| Chrome | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb\` |
| Firefox | `%APPDATA%\Mozilla\Firefox\Profiles\<profile>\storage\default\<origin>\ls\` |

You don't normally touch these. The browser manages them.

#### Critical concept: origin scoping

localStorage is **scoped per-origin**. An "origin" = scheme + host + port — for example, `http://localhost:8098` is one origin, and `http://localhost:8099` is a *different* origin even though it's the same machine. They cannot read each other's data.

Practical implications for Inward:

- Open the dev server on port 8098 → write 5 entries → switch to port 8099 → entries are **gone** (different origin)
- Open the same URL in Chrome and Edge → each has its own separate copy
- Open in a regular Chrome window vs. Incognito → separate copies (Incognito wipes on close)
- Clear browser data ("cookies and other site data") → entries are wiped

#### Capacity & shape

- **Limit**: ~5–10 MB per origin in modern browsers. Plenty for diary entries (each entry is a few hundred bytes).
- **Type**: strings only. No binary. No nested objects without JSON.
- **Sync vs async**: localStorage is *synchronous*, which is fine on a UI thread because reads/writes are tiny.
- **Persistent**: yes, across refresh, browser restart, OS reboot. Until the user clears site data or the browser evicts (rare).

#### Inspecting our data live

In Chrome DevTools (F12) → **Application tab** → **Storage** → **Local Storage** → click `http://localhost:8098`. You'll see our key `inward.diary_entries.v1` with a JSON string value. Edit it directly there if you want to test edge cases.

#### Important caveats for Inward

- **Web data does not sync with phone data.** Our SQLite file on Android and our localStorage in the browser are separate stores. If you write entries on web, they won't appear on Android, and vice versa. (Local-first principle still holds — data is local to the device, just to a different "device".)
- **Clearing browser data wipes the journal.** Tell future-you not to "reset Chrome" without exporting first.
- **Not encrypted.** Anyone with access to your browser profile folder can read it. For the kind of journal entries Inward stores, that's a non-issue (your phone is the real target). But it's why we don't put real privacy guarantees on the web build — the web is dev/preview only.

---

### Q5: Is a hook an action enabler for components? Components are functions and hooks utilize them — is it like that?

You're close — let me flip the relationship around because it's actually the other way.

> **Components don't enable hooks. Hooks enable components.**

#### The mental model that works

- A **component** is a function that returns UI. Plain TypeScript function. No magic.
- A **hook** is a function whose name starts with `use*` that gives a component access to React's powers — memory, side effects, context, refs, etc.

Without hooks, components are *dead*. They render once and then forget everything. Hooks are how components remember things, react to changes, talk to the outside world.

#### The minimal example

```tsx
// A component that's just a function
function Greeting() {
  return <Text>Hello</Text>;
}
```

That works, but it's stuck — pure output, no state, no behavior.

```tsx
function Counter() {
  // ← This is a hook. It gives the component memory.
  const [count, setCount] = useState(0);

  return (
    <Pressable onPress={() => setCount(count + 1)}>
      <Text>Tapped {count} times</Text>
    </Pressable>
  );
}
```

Now the component remembers a number across re-renders. The `useState` hook gave it that ability.

#### What hooks unlock

| Hook | What it gives a component |
|---|---|
| `useState` | Memory — values that survive between renders and trigger re-renders when changed |
| `useEffect` | Side effects — "run this code when the component mounts / when X changes" |
| `useContext` | Access to data passed down a tree (theme, etc.) |
| `useRef` | A mutable container that *doesn't* trigger re-renders. Used for refs to DOM elements, etc. |
| `useMemo` / `useCallback` | Performance — memoize expensive calculations |
| `useReducer` | Like `useState` but for complex state logic |

And then **custom hooks** — functions you write yourself by combining the built-in hooks. Examples we wrote in Phase 2:

| Custom hook | What it does |
|---|---|
| `useDiaryEntries()` | Calls React Query under the hood; returns `{ data, isLoading, error }` for the diary list |
| `useCreateEntry()` | Returns a mutation function and its loading/error state |
| `useRouter()` | (from Expo Router) gives the component access to navigation |

A custom hook is just a function. The only magic is the **`use*` naming convention** — when React sees a function call starting with `use`, it knows to track its hooks correctly.

#### The rules (a.k.a. why hooks feel weird at first)

1. **Only call hooks from components or other hooks.** Don't call `useState` from a regular utility function.
2. **Always call hooks in the same order.** Don't put a hook inside an `if` or a loop. React tracks hooks by call order, not name.

Example of a forbidden thing:

```tsx
function Bad({ shouldRemember }) {
  if (shouldRemember) {
    const [count, setCount] = useState(0); // ❌ conditional
  }
  // ...
}
```

This breaks because React would lose track of which call belongs to which state slot.

#### So… components are "powered by" hooks, not the other way around

If you see code like:

```tsx
function DiaryList() {
  const router = useRouter();              // ← hook
  const { data: entries } = useDiaryEntries(); // ← hook
  // ...
}
```

That's the component **borrowing capabilities** from hooks: navigation from one, async data from another. Each hook is an "imported power."

You can think of hooks as **plugins** for components. The component is the host; hooks are the plugins that give it memory, async access, navigation, theme, etc.

#### A last analogy

If a component is a chef, hooks are the kitchen tools. The chef can't cook without the tools. The tools don't decide what to cook; the chef does. Different chefs can use different combinations of tools depending on the dish.

---

### Q6: What is `context_basis`?

#### The short answer

`context_basis` is a **single text string** that every AI message in our app must show — a sentence saying *"here's what your entries told me before I replied."*

It's stored as a column on the `chat_messages` table (`context_basis: text (nullable)` in CLAUDE.md §3) and rendered as a small grayed line **right under the AI's message** in the chat UI.

#### Why it exists

CLAUDE.md §6 (the AI instructions section):

> *"You ground every statement in the user's own words and always make your reasoning transparent."*

> **Transparency requirement: Every chat reply must populate `context_basis`, e.g. "Based on your last 7 entries where you mentioned feeling tired."**

The product principle behind it: **the user should never wonder "where did the AI get that idea about me?"** Most AI chat apps (ChatGPT, Replika) feel like the AI just *knows* things. Magic. That's intentional — they want the AI to feel omniscient. We're explicitly not doing that.

We want the AI to feel **observant**, not omniscient. There's a huge difference. An observant friend says *"I noticed yesterday you mentioned…"* — they're showing their work. An omniscient AI just produces wisdom out of thin air, which is great for engagement metrics but bad for trust.

#### What it actually looks like in the UI

```
┌────────────────────────────────────────────────────┐
│ AI: You've used the word "tomorrow" three times    │
│     this week — each time about the same report.   │
│     What is tomorrow holding for you that today    │
│     isn't?                                          │
│                                                    │
│  ℹ Based on your last 7 entries, two of which      │
│    mentioned avoiding "the report"                 │
└────────────────────────────────────────────────────┘
```

The italic gray line at the bottom is the `context_basis`. The user can read it and immediately know: this AI didn't make stuff up; it referenced specific entries I wrote.

#### How it's produced

We don't write it manually — Claude generates it as part of its response, prompted by our system prompt. Two ways to wire this:

**Approach A** — instruct the model to return JSON:

```
Reply in JSON:
{
  "reply": "...your message to the user...",
  "context_basis": "Based on your last X entries where you mentioned Y..."
}
```

The phone parses the JSON, displays `reply` as the bubble, stores `context_basis` separately.

**Approach B** — use Claude's native **citations** feature (newer, cleaner):

```
Set up the messages with each diary entry as a citable document.
Claude returns the response with structured citations to which docs it used.
We assemble the context_basis line from those citations.
```

We'll likely use Approach A in Phase 6 (simpler, works everywhere) and consider Approach B later for the chat phase.

#### What this enables for users

The transparency line isn't just a comfort blanket — it's **functional**:

1. **Trust calibration.** *"It said something insightful — let me check what it based that on. Oh, it's reading my Sunday entry; that's fair."* vs. *"This feels off — what is it referencing? Oh, it's grounded in something I wrote three weeks ago that I've moved past."*
2. **Privacy control.** If a user sees the AI cited an entry they're now uncomfortable with, they can mark it "exclude from AI" (Phase 8 toggle), and future replies will provably not see it.
3. **Calibration of generic-vs-specific.** If `context_basis` says "based on no specific entries," the user knows the AI is being generic. That's a signal to give it more to work with, or trust the reply less.

#### What it is NOT

- It's not a list of full quotes (that'd be too much).
- It's not the AI's *internal reasoning* (that's the model's "thinking," and showing it would be noisy).
- It's not a privacy policy.

It's a **one-sentence summary of which entries the model just consulted to produce this reply.** Nothing more. The simplest possible transparency mechanism.

---

### Q7: Where and when is the system prompt passed?

The **system prompt** is the always-present instructions that tell Claude *how to behave* — its role, its rules, its guardrails. It's not user-visible. Let me trace exactly where it travels.

#### Layer 1 — At rest, in our backend code

In Phase 5, we'll build the Hono backend. It'll have a constants file roughly like:

```ts
// backend/src/prompts/base.ts
export const INWARD_BASE_SYSTEM_PROMPT = `
You are the reflective companion inside Inward, a private self-awareness journal.
You are observational, non-judgmental, and emotionally intelligent. You NEVER
diagnose, NEVER claim to be a therapist, and NEVER use language implying failure,
weakness, or comparison. You ground every statement in the user's own words and
always make your reasoning transparent. You surface patterns; you do not give orders.
If a user expresses crisis or self-harm, gently encourage them to reach out to a
professional or a crisis line, and do not attempt to counsel the crisis yourself.
`;
```

This text **lives only on the backend**, never in the phone app. The phone never sees it. (Why? If it lived on the phone, anyone with a decompiled APK could read our prompts and craft attacks. Server-side is the only safe place.)

#### Layer 2 — Mode modifier (composed per-request)

Same file:

```ts
// backend/src/prompts/modes.ts
export const MODE_MODIFIERS = {
  reflective: `You are in REFLECTIVE mode. Ask more than you tell...`,
  coach:      `You are in COACH mode. Be action-oriented and structured...`,
  direct:     `You are in DIRECT mode. Be honest and concise...`,
};
```

#### Layer 3 — Per-request assembly

When the phone calls `POST /ai/chat`, the backend takes the `mode` parameter from the request body and assembles the full system prompt:

```ts
// In Hono handler for POST /ai/chat
app.post('/ai/chat', async (c) => {
  const { messages, context, mode } = await c.req.json();

  const systemPrompt = [
    INWARD_BASE_SYSTEM_PROMPT,
    MODE_MODIFIERS[mode],
    `Here is the user's recent context to ground your reply:\n${context}`,
  ].join('\n\n');

  // Now send to Claude...
});
```

So the system prompt is **assembled fresh per request**, combining:
- Base prompt (always)
- Mode modifier (one of 3, picked from user's setting)
- A formatted block of recent diary entries / thoughts (different per user, per moment)

#### Layer 4 — Sent to Anthropic with the user message

Anthropic's Messages API takes a structured payload:

```ts
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4',
  max_tokens: 1000,
  system: systemPrompt,           // ← here it goes
  messages: [
    { role: 'user', content: 'I keep avoiding writing my report...' }
  ],
});
```

The `system` field is treated specially by Claude — it's loaded with stronger weighting than user messages. You can put guardrails there and trust Claude to respect them more reliably than if you put them in user messages.

#### Layer 5 — Claude generates a response within the rules

Claude reads the system prompt, the user message, the context, and produces output that follows the instructions. If the prompt says "never diagnose," Claude's training reinforces that constraint and refuses to diagnose even if asked.

#### When does the system prompt get sent?

**Every single AI request.** It's stateless. Claude doesn't "remember" past system prompts from previous conversations. We send it again every time.

That sounds wasteful but it's actually fine because:
1. **Prompt caching** (Anthropic feature): we mark the system prompt as cacheable. Anthropic stores it for 5 minutes; subsequent requests within that window pay 10% of the normal price for those tokens.
2. The system prompt is short (~200–300 tokens). Even uncached, it's pennies per call.

#### What about Phase 6 (diary analysis)?

Same pattern, different file. The diary analyzer has its own system prompt (CLAUDE.md §6 spells it out — return JSON with `tone / summary / question`). Backend assembles base + analyzer-specific instructions + the entry being analyzed.

#### Where the guardrails live

Notice from the base prompt above:

- *"NEVER diagnose"*
- *"NEVER claim to be a therapist"*
- *"NEVER use language implying failure, weakness, or comparison"*
- *"If a user expresses crisis or self-harm, gently encourage them to reach out to a professional"*

These are **guardrails** baked into the system prompt. They apply to *all modes, all features*. Coach mode does not get to override "don't diagnose." Direct mode does not get to override "don't use harsh language."

We could in theory make these enforceable via post-processing (scan the AI response for forbidden phrases and reject it), but in practice Claude is well-behaved if you put strong guardrails in the system prompt and run experiments to verify. Belt-and-suspenders comes later if needed.

#### Visual summary

```
┌────────────────────┐
│ Backend (Hono)     │  Holds the system prompt text. NEVER on phone.
│ /ai/chat handler   │
└────────┬───────────┘
         │
         │ Assembles per request:
         │  1. Base prompt (always)
         │  2. Mode modifier
         │  3. Context block
         ▼
┌────────────────────┐
│ Anthropic API call │  payload = { system: assembled, messages: [user msg] }
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Claude responds    │  obeys the system prompt's rules
└────────────────────┘
```

---

### Q8: How exactly does Proxy / BFF work?

#### Definitions, then mechanism

- **Proxy** — a server that *stands in front of* another server, intercepting requests and forwarding them with modifications. Originally a network concept; broadly used in software now.
- **BFF (Backend-for-Frontend)** — a pattern where each frontend (web app, mobile app, etc.) has its own thin backend that serves its specific needs. Distinct from a "general-purpose API" that tries to serve everyone.

For Inward, **our backend is both**: it's a proxy (forwarding to Anthropic + URL targets) and a BFF (purpose-built for the phone app's needs).

#### Why we need one

The Anthropic API key cannot live on the phone. If it did:
1. Anyone could decompile the APK and extract the key
2. Use our Anthropic credits for free
3. Run up bills until we noticed

So we need *something* to hold the key. That something is the backend. The backend's job: receive a request from the phone, add the key, forward to Anthropic.

#### Step-by-step request flow

Let's trace one diary-analysis call.

**1. The phone constructs a request to its own backend (NOT to Anthropic):**

```ts
// In src/lib/ai/client.ts (Phase 5+)
async function analyzeEntry(entry, recentContext) {
  const response = await fetch('https://api.inward.app/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry, recentContext }),
  });
  return response.json();
}
```

Notice what's missing: **no Anthropic API key.** The phone doesn't have one and doesn't need one.

**2. The phone's request lands on our Hono backend:**

```ts
// backend/src/index.ts
app.post('/ai/analyze', async (c) => {
  const { entry, recentContext } = await c.req.json();

  // Validate, rate limit, etc.
  if (!entry) return c.json({ error: 'Missing entry' }, 400);

  // Check per-device rate limit (e.g., 50 calls/day)
  const allowed = await checkRateLimit(c.req.headers.get('x-device-id'));
  if (!allowed) return c.json({ error: 'Rate limited' }, 429);

  // Build the system prompt
  const systemPrompt = INWARD_BASE_SYSTEM_PROMPT + ANALYZE_SYSTEM_PROMPT;

  // ← THIS is where the BFF adds the secret
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,  // ← from backend env
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Recent context:\n${recentContext}\n\nNew entry:\n${entry}`,
      }],
    }),
  });

  const data = await response.json();

  // Reshape Claude's response to match what our phone expects
  return c.json({
    summary: data.content[0].text.summary,
    question: data.content[0].text.question,
    tone: data.content[0].text.tone,
  });
});
```

The key line: `headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY }`. This is where the API key — known only to the backend, loaded from `backend/.env` — is added to the outgoing request. **The phone's request did not have this header.**

**3. Anthropic processes the request and returns a response:**

Anthropic doesn't know who the user is. It sees a request signed with our backend's key, processes it, returns the answer. As far as Anthropic is concerned, all our users are "us."

**4. The backend reshapes the response and forwards to the phone:**

The response comes back to our backend. We can:
- Strip out fields the phone doesn't need
- Reformat to a shape the phone expects
- Add metadata (cost tracking, etc.)

Then we send a clean response back to the phone over the original connection.

**5. The phone displays the result:**

```ts
const { summary, question, tone } = await analyzeEntry(entry, recentContext);
// Update local DB, show in UI
```

The phone never knew Anthropic was involved.

#### What "stateless" means in our context

After the request finishes, the backend **forgets everything**:
- The diary entry contents are not logged
- They're not written to a database
- They're not cached longer than the request lifecycle (a few hundred ms in RAM)

Compare to a stateful backend (e.g., a typical SaaS) which would:
- Log every request and response
- Store user data in Postgres for analytics
- Build a user profile over time

We could log **request counts** (for rate limiting and billing visibility) — that's metadata, not content. We never log entry text.

#### What "BFF" gives us beyond a generic proxy

A generic proxy is dumb — it just relays bytes. A BFF is purpose-built:

| Generic proxy | Inward's BFF |
|---|---|
| Forwards any request | Validates request shape per endpoint |
| Returns whatever upstream said | Reshapes responses to match phone's expected schema |
| No domain logic | Knows what "diary analysis" vs "chat" mean |
| Server-agnostic | Can swap models (Sonnet → Opus) without phone-side changes |
| One key per user | One key for the whole app |

A practical example: in Phase 6, if Anthropic releases Claude Sonnet 5 and we want to upgrade, we change one line in our backend. The phone keeps calling `/ai/analyze` with the same shape. Phone version changes are slow (App Store review); backend changes are instant. The BFF is the *fast adapter layer* that makes upgrades safe.

#### Where the backend physically runs

Phase 5 dev:
- `localhost:3000` on your PC (Node.js)
- Phone hits `http://192.168.1.4:3000` (your LAN IP)

Production:
- Cloudflare Workers, Fly.io, Railway, or similar
- Costs ~$0–10/month for low traffic

Hono is good for this because it runs on all of those without code changes — runtime-portable.

#### What if the backend is down?

The phone can't reach AI features. Diary CRUD, thoughts, vault — all keep working (they're local-first). The chat icon shows "offline" or queues messages for retry. **No feature except AI features depends on the backend.**

This is the reward for local-first design: backend reliability is "nice to have," not "the app is broken if it's down."

#### Picture summary

```
PHONE                    OUR BACKEND (Hono)              ANTHROPIC
─────                    ──────────────────              ─────────
                                                              ▲
1. POST /ai/analyze ────► 2. Receive request                  │
   (entry text)              + Validate, rate-limit           │
                             + Add API key                    │
                             + Reshape payload                │
                                                              │
                          3. POST to Anthropic ───────────────┘
                                                              │
                          5. ◄────────────────── 4. Generate ─┘
                             Receive response
                             + Strip noise
                             + Reshape to phone schema
                                                              
6. ◄──── Receive simple,                                     
   typed JSON                                                 
   { summary, question, tone }                               
```

The phone, the backend, and Anthropic are three separate parties. **The backend is the trusted broker** — it has the key, the rules, the rate limits. The phone trusts it; Anthropic trusts the key. Users trust the architecture because nothing identifies them upstream.

---

*End of Q&A. Bring more questions whenever they come up — this file is meant to grow.*
