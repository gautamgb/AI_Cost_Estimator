# LLM Agentic Cost Calculator

**The pricing page is lying to you.**

A single Claude Sonnet call costs $0.003. But an agentic workflow that uses Sonnet — with 8 steps, tool calls, reflection passes, and a growing context window — costs $0.15. That's a 50x gap between what the pricing page says and what your invoice shows.

Every AI product leader I've worked with hits the same wall: they model costs with `tokens × price`, ship an agent, and get a bill that breaks their unit economics. The gap isn't the model price — it's everything the pricing page doesn't tell you about how agentic systems actually consume tokens.

**[Try it live →](https://www.seekgb.com/ai-cost-estimator)**

---

## The Problem

Agentic workflows have cost dynamics that simple token calculators can't model:

| Cost Driver | What Actually Happens | Impact |
|---|---|---|
| **Context accumulation** | Each agent step sends the full conversation history. Step 10 sends 10x more input tokens than Step 1. | Arithmetic series growth: N steps = N×(N-1)/2 extra input tokens |
| **Tool call overhead** | Tool definitions are injected into every system prompt, every call | 12 tools × 150 tokens each = 1,800 tokens added to every single LLM call |
| **Orchestration patterns** | Parallel fan-out multiplies worker costs. Hierarchical delegation grows orchestrator context. | A 3-branch parallel workflow costs 3x what sequential does for worker agents |
| **Reflection & retry** | Self-critique passes re-send the full context + previous output | Each reflection pass at step N costs as much as step N itself |
| **Model mixing** | Expensive models for reasoning, cheap models for routing — but the cheap model runs 10x more often | The "cheap" classifier can dominate total cost at high volume |

No existing calculator models any of this. They all do `input tokens × price + output tokens × price` and call it a day.

---

## What This Does

A cost calculator built for the way agentic systems actually work:

- **Context accumulation modeling** — simulates token growth across multi-step agent loops (full-history, sliding window, summary compression, stateless)
- **Orchestration pattern multipliers** — sequential chains, parallel fan-out, hierarchical manager/worker, iterative loops
- **Per-component stack breakdown** — see exactly where every fraction of a cent goes: embedding → search → reranking → generation → tool calls → guardrails
- **3-level drill-down** — headline cost → stack breakdown → token-level detail (cached vs uncached, Bedrock markup)
- **Dual pricing** — direct API vs AWS Bedrock for every model
- **Prompt caching & batch API** — models the real savings from caching system prompts and tool definitions across repeated calls
- **22 models** across OpenAI, Anthropic, Google, DeepSeek, Meta, Mistral, and Cohere

### Interview-Ready Presets

Eight presets based on real enterprise scenarios, each with pre-populated stack components:

| Preset | Pattern | What It Models |
|---|---|---|
| Payments Data Copilot (RAG) | Sequential | Embedding → vector search → reranking → generation with 12 tools → guardrails |
| Context-Aware Semantic Router | Sequential | Cheap classifier → routed generation — shows routing overhead vs savings |
| Zero-Trust PII Proxy | Sequential | PII detection → sanitized generation → unmasking — isolates compliance overhead |
| Multi-Agent Research | Hierarchical | Planner → parallel researchers → synthesizer — models fan-out cost multiplication |
| Code Review Agent | Iterative | File reading → review → test suggestions — shows context growth across iterations |
| Customer Support Bot | Sequential | Intent classification (Haiku) → response generation (Sonnet) — model mixing economics |
| Simple RAG Chatbot | Sequential | Embedding → search → generation — baseline for comparison |
| Autonomous SW Engineer | Hierarchical + Iterative | Architect → coder → reviewer → tester — the expensive end of the spectrum |

---

## Why I Built This

I kept getting asked the same question in product reviews and interviews: *"What will this cost to run at scale?"*

The honest answer was always "I don't know, because the cost model for agentic systems is fundamentally different from simple API calls, and no existing tool models it correctly."

So I built the tool I wished existed — one that accounts for context accumulation, tool overhead, orchestration patterns, and caching dynamics. One that gives me a number I can put in a business case and defend.

---

## Tech Stack

- Next.js 16 / React 19 / TypeScript 5 (strict)
- Tailwind CSS 4 — light Apple-ish theme
- All calculation logic is client-side pure functions (instant feedback, zero latency)
- Recharts for visualization
- localStorage + URL state for persistence
- No database, no backend (except optional Claude-powered auto-estimator)

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

**[Live Demo](https://www.seekgb.com/ai-cost-estimator)** · **[Portfolio](https://www.seekgb.com)** · **[LinkedIn](https://linkedin.com/in/gautamgb)**
