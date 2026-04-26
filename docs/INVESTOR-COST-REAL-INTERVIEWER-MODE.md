# Full cost breakdown — “real life interviewer” vs today’s Aria Live (in £)

**Last updated:** 9 Apr 2026  
**Purpose:** A **detailed** run-cost view for investors and planning, including what changes if you replace today’s **voice + text coach** stack with a **true live, conversational interviewer** (closer to a real hiring conversation).

**Important:** This is a **model**, not a quote. OpenAI and other vendors **bill in USD**; we show **£** using **£1 = $1.25** (replace with the spot rate at diligence). [OpenAI list pricing](https://openai.com/api-pricing) changes; **re-verify** before a funding round or launch.

---

## 1) Two different products (clarify the ask)

| Idea | What it is | Tech shape (simplified) |
|------|------------|----------------------------|
| **Today (Aria Live — current app path)** | Fast **chat** coach; voice is **TTS** of model text; user speaks and it becomes **text** in the app; API uses `liveVoice` → by default **lighter chat model** + **separate TTS** calls. | **HTTP** requests: coach (`/api/aria-coach`, often **`gpt-4o-mini`** when live) + **speech** (`/api/aria-tts`). |
| **“Real life interviewer” (this document’s upgrade)** | An **in-character hiring manager** who **listens, interrupts, follows up, probes, time-boxes** — more like a **sustained** mock interview, not a generic coach. | Best implemented as **Realtime / speech-to-speech** (audio in, audio out, low-latency turn-taking) *or* a very heavy **4o/5.x text** loop with **STT+TTS** and **very long** instructions + tools. Both are **10×–100×** more “AI £ per minute” than a simple mock+grade. |

**Investor one-liner:** the **cost ceiling** is not your database — it is **continuous multimodal (audio) + long rubric** at scale. Pricing and **session limits** for this mode are **non-optional**.

---

## 2) Fixed and semi-fixed costs (per month) — *excluding* OpenAI “by usage”

What you pay **before** a single extra interview—**order of magnitude in £** (US vendor prices converted at **$1.25/£1**; confirm on invoices).

| Line | What you’re paying for | “Lean prod” (typical) | “Serious + growth” (typical) |
|------|------------------------|------------------------|---------------------------------|
| **1** | **Vercel** (site + serverless `api/`) | ~**£12–20** (base seat/credit) | **+ usage**: often **£40–200+** when invocations, CPU, and transfer grow |
| **2** | **Supabase** (auth + DB + RLS) | **£0** (risky) / **~£20** (Pro) | **£20–200+** with **compute, egress, storage, MAU** add-ons as you scale |
| **3** | **Domain** | **~£1** effective/mo (annual) | +mail if you use a provider: **~£0–20**/mo |
| **4** | **Sentry** (optional) | **£0** (small usage) | **~£20–100+** at volume |
| **5** | **Stripe** (when you charge) | *Not infra* — **~2.9% + ~£0.24** per **successful** card charge (UK can vary) | same rule — include in **Gross margin**, not “hosting” |

**Rough fixed stack for early commercial:** **~£30–80/month** in platform **before** heavy AI. At **scale**, treat **(1)+(2)** as the ones that can step up first.

---

## 3) OpenAI: how your *current* app works (so you see the gap)

*Aligned with `api/aria-coach.js` in this repo.*

| Mode | Default model in code (live flag) | Role |
|------|------------------------------------|------|
| **Non-live** coach / teach / mock | `gpt-4o` (or `ARIA_COACH_MODEL`) | Richer text; higher £ per token. |
| **Live voice session** | `ARIA_LIVE_COACH_MODEL` or **`gpt-4o-mini`** | Cheaper, shorter replies — *not* “full” multimodal. |
| **TTS** | e.g. `tts-1` / env | **Billed on speech length**, not “per interview” flat. |
| **Core mock (questions + grade)** | `gpt-4o-mini` | **Very cheap** per full mock in £ (pennies of AI in normal CV/JD sizes). |

**“Cheap vs expensive” in the product today (planning, not a quote):**

| User action | AI cost *shape* in £ (typical) |
|-------------|---------------------------------|
| One full **text mock** (generate + grade, mini model) | About **1p to 2½p** in model fees only (in our [simple model](./INVESTOR-OPERATING-COST-MODEL.md)) |
| One **Aria Live** session (many coach turns + TTS) | **£0.30 to £1.50+** in *bad* (long, chatty) cases; short sessions lower |

That is **“voice agent + coach”** economics, **not** full “live interviewer in the room for 30 minutes” every time.

---

## 4) The “real life interviewer” build — **three** engineering tiers and **£/minute** bands

You can ship “stricter, more real” at different **cost** levels. Below is a **sensible** ladder for *investor* discussion.

### Tier 1 — **“Strong simulated interviewer” (still mostly HTTP, no Realtime)**

- **What:** Bigger system prompt, **hiring rubric**, role play, **adaptive follow-up questions** in **text**; **grokable** TTS. Optionally **`gpt-4o`** (or a newer top model) for *every* turn when the user is on Pro.
- **What it is not:** truly natural **barge-in**, sub-second backchanneling, and native **audio** reasoning in one model (you’re still *chaining* STT + LLM + TTS or similar).
- **Indicative AI variable:** **2× to 5×** today’s *per session* for the same **wall-clock** vs current live-mini defaults — highly sensitive to model choice and **max tokens**.

**Indicative band (illustrative):** **~£0.10–£0.40** of AI **per minute of session** in a 20–30 minute loop if you use **4o-class** and frequent TTS — **measure on staging**.

### Tier 2 — **“Realtime (mini) interviewer” (speech-to-speech, but smaller model)**

- **What:** [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)–style session: **audio in / audio out**, VAD, natural turn-taking. Often **`gpt-4o-mini-realtime`**-class in vendor docs. Third-party tests often show **$0.05–$0.40 per minute of conversation** for various configs — **huge** variance (prompt length, tools, caching, voice activity).
- **In £ (apply $1.25/£1):** roughly **£0.04–£0.32** per **minute** in those published ballparks, **before** your long “interviewer persona” and safety layers (they **increase** tokens and cost).

**Example (math only):** 25-minute session × **£0.15/min** (mid band) = **~£3.75** in Realtime *API* fees alone — *not* your whole Vercel bill, not Supabase, not your margin. That **one session** is already **>100×** the *mini mock* in §3 for the *core* loop.

### Tier 3 — **“Flagship live interviewer” (highest quality — **audio**-priced flagship stack)**

- **What:** e.g. **`gpt-realtime-1.5`**-class: OpenAI’s public page lists **audio** token prices that are **much higher** than text-only chat (e.g. **$32/1M input** and **$64/1M output** **audio** tokens, plus text and image where used — [OpenAI](https://openai.com/api-pricing)). A **sustained** 30–45 min interview with a **long** system prompt, **tools**, and **frequent** assistant audio can reach **full flagship** *audio* price territory.
- **In £:** **hundreds to low thousands of £ per 1000 hours of connected audio** is a **credible** planning *range* until you measure — the **right** way is: **one production pilot**, export usage, **per-session** average in £.

**Investor takeaway:** “Real interviewer, flagship” is **a different P&L line** from “we run cheap mocks.” You either **(a)** **price** it (Pro+ add-on, minutes bundling) or **(b)** **limit** it (per month minutes, by subscription tier) or both.

---

## 5) “Full on” Aria: **monthly** all-in (platform + **OpenAI**), in £

We extend the three scenarios in `INVESTOR-OPERATING-COST-MODEL.md` with a **new row** for **“Live interviewer mode (Tier 2–3 mix)”**.

**Assumptions (for the table only — you will replace with telemetry):**  
- Each “heavy” user does **2 long sessions/month**; **N** = active heavy users.  
- **Tier 2 ballpark session:** **20 min** × **£0.20/min** ≈ **£4** in Realtime *API* variable + **+25%** buffer = **~£5/session** (illustrative).  
- **Tier 3 (flagship audio):** **10×+** of Tier 2 per minute is *possible* — we show a **separate** ceiling line.

| Scenario (monthly) | Mocks (core product) + light Aria (as in the simple doc) | + **“Real interviewer”** (Tier 2-style: **50k** users/mo on **1× 20 min** at **~£5** API+buf) | **+ Tier 3 pressure test** (same 50k users but **2×** cost vs Tier 2 *per minute*) |
|---------------------|------------------------------------------------------------------|--------------------------------------|----------------------------------|
| **A – Steady** | **~£2.3k–2.5k** | *Usually not* 50k heavy at once — at **1k** heavy sessions/mo: **+£5k** → **~£7.5k/mo** | **+£20k+** to same base if you force flagship use |
| **B – High growth** | **~£54k–58k** | + **~£250k** (50k sessions × **~£5**) = **~£300k+**/mo in **AI+buf** to platform | **~£0.5M+**/mo *possible* if you double £/min |
| **C – Stress ceiling** | **~£200k–250k** | *Same logic:* cost **dominates** from **“live”**; **+£500k–2M+**/mo is **mathematically possible** if you put **hundreds of thousands of hours** of flagship **audio** on platform without caps | **Diligence required** — build a cap table of **$/£ per minute** for your *exact* prompt+tools+model. |

**Plain English for investors:** a **nationwide-scale** “always-on flagship real interviewer for everyone with no limits” is **incompatible** with a **consumer** price point unless you have **huge** ARPU, **B2B** contracts, or **tight** metering.

**What to fund:** **Tier 1–2** with **minute bundles**, **gating**, and a **pilot** that outputs **per-minute £** in **your** app.

---

## 6) Full **line-item** list (checklist for your own spreadsheet)

Copy into Excel / Google Sheets as rows:

1. **Vercel** — Pro seat + on-demand: **£** (bill)  
2. **Supabase** — Pro + compute + egress: **£** (bill)  
3. **OpenAI —**  
   3.1 `gpt-4o-mini` (mocks, cheap paths)  
   3.2 `gpt-4o` (strong text paths)  
   3.3 `tts-1` / TTS (Aria speech)  
   3.4 `whisper` / `gpt-4o-transcribe` (if you transcribe in pipeline)  
   3.5 **Realtime** session line (if you go Tier 2–3)  
4. **Stripe** — % of revenue (not in COGS the same way, but in **gross margin**)  
5. **Sentry, domain, email**  
6. **R&D and customer support** — *not* “run cost” of servers, but **separate** on the cap table

---

## 7) How to get **defensible** £/minute for *your* “real interviewer” (before you promise investors)

1. **Prototype** Realtime (or your chosen path) in **dev** with the **real** long interviewer prompt + tools.  
2. **Run 10** full sessions, 15–30 min, representative **yakking** rates.  
3. From the OpenAI **Usage** page: **USD per session** → **÷ 1.25** = **£** in this model.  
4. Put the **P50 and P90** *£ per session* in the board deck, not a single number.

---

## 8) Disclaimer

All figures are **illustrative** and can be **wrong in either direction** after **model re-pricing** or your **final architecture**. The **“full blown”** scenario is a **ceiling** for **stress** planning, not a revenue forecast. Not financial advice.

*Prepared for: Interview prep / Aria / `aria-clean` — serverless on Vercel, Supabase, OpenAI (see `api/aria-coach.js`, `api/aria-tts.js`).*
