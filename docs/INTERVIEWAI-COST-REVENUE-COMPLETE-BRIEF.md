# InterviewAI / Aria — Cost, revenue & profit (complete briefing)

**To create a PDF to send someone:** open **`INTERVIEWAI-COST-REVENUE-COMPLETE-BRIEF.html`** in Chrome or Safari (double-click or drag into the browser) → **Cmd+P** (Mac) or **Ctrl+P** (Windows) → **Save as PDF** / **Print to PDF**.  
*(The HTML is a print-styled version of this document; content matches.)*

**Document for:** co-founder, advisor, or investor  
**Version:** 1.0  
**Date:** 9 April 2026  
**Currency:** **£ GBP** (OpenAI and some vendors bill in **USD**; planning uses **£1 = $1.25** unless stated)

---

## Executive summary

- **Product:** AI interview preparation — mock interviews (CV + job description), grading, **Aria Live** (voice + coach), CV tools, academy, etc.  
- **Stack cost:** **Vercel** (app + API), **Supabase** (auth + database), **OpenAI** (LLM + text-to-speech). **Stripe** when card payments are live.  
- **Largest variable cost at scale:** **OpenAI** — especially **long Aria Live** (coach + voice). A **standard** mock (questions + grade) is **cheap per completion** (order of **pennies** of AI in this model).  
- **Revenue (as in the app today):** **Pro £12/month** or **£99/year**; **Free** tier with **3 mock interviews per month (UTC)** and limits. **Card checkout** is still to be fully wired; **Pro** can be set in **Supabase** (`user_profiles.is_pro`) for testing.  
- **Profit per Pro user (contribution, after variable costs and card fees):** for a **typical** user often **~£7–10+/month**; for a **heavy** Aria user it can fall to **~£0–3**; **abusive** use can be **loss-making** — use **fair use** or a **higher “Plus”** tier for unlimited premium live voice.  
- **This document is a planning model, not a tax quote.** Replace all numbers with **real** OpenAI, Vercel, Supabase, and Stripe data when available.

---

## 1. What customers pay (product copy in the app)

| Tier | Price | What the app offers (headlines) |
|------|--------|----------------------------------|
| **Free** | £0 | **3** mock interviews **per month (UTC)**; **5** questions max; overall score; **last 3** sessions; basic job tracker; “text-only Aria” in copy; some tools limited. |
| **Pro** | **£12 / month** or **£99 / year** (yearly ≈ **£8.25 / month** if spread over 12 months) | “Unlimited” mocks; **10** questions; full per-question grading, PDF, cover letter, company research, Academy, CV editor/tailor, read-aloud, full history, etc. (see `src/pricingFeatures.js` in the repo). |

**Payment processing (when live):** **Stripe** (or similar) — typically **% + small fixed fee** per successful UK card payment. This comes out of **gross** revenue, not the OpenAI “server” line.

---

## 2. Full cost breakdown — what you pay to run the program

### 2.1 Fixed and semi-fixed (per month) — *before* “per interview” usage

| Line | vendor | what it is | order of size (£ / month) |
|------|--------|------------|----------------------------|
| 1 | **Vercel** | Hosts the website + **serverless API** | **~£12–20** base; **+£40–200+** with heavy traffic / compute / transfer |
| 2 | **Supabase** | Auth, Postgres, RLS, data | **£0** (free tier, risky to rely on) / **~£20** Pro org; **more** with compute, egress, storage at scale |
| 3 | **Domain** | DNS / domain name | **~£1** / month (annual / 12) |
| 4 | **Email** (e.g. transactional) | Optional | **~£0–20** at small scale |
| 5 | **Sentry** (optional) | Error monitoring | **£0** small; **+** at higher volume |
| 6 | **—** | *Salaries, ads, office —* | *Not* “COGS to serve one more user” in the narrow sense* |

**Early “serious” production (planning):** about **£30–80 / month** in **platform** before the AI variable dominates.

### 2.2 Variable — the big one: **OpenAI** (and how it’s used in the app)

| Product area | What burns tokens / audio | model class (from codebase) | Cost *shape* |
|--------------|----------------------------|-------------------------------|--------------|
| **Each full mock** | generate questions + grade | mostly **gpt-4o-mini** | **~1p to 2½p** of AI per mock (planning; long CV/JD a bit more) |
| **Aria Live** | many coach messages + **TTS** (voice) | live: often **gpt-4o-mini**; TTS separate | **£0.30 to £1.50+** per *long* session in bad cases; short sessions much less |
| **Heavier tools** (CV, research, some routes) | longer context | **gpt-4o** in places | more £ per call than “mini” |
| **Future: “realtime” / full audio interviewer** | continuous speech in/out | Realtime or flagship **audio** pricing | **10×–100×** *per wall-clock minute* compared with simple mock — see section 5 |

*OpenAI [official pricing](https://openai.com/api-pricing) changes; re-check for any model you ship.*

### 2.3 Company-level “all-in” run cost (infra + API variable — *no* payroll)

These are **global** scenarios: total platform activity, not one user.

| scenario | what we’re picturing | about **all-in run cost / month** | OpenAI-heavy part **/ year** (indicative) |
|----------|----------------------|-------------------------------------|---------------------------------------------|
| **A – steady** | e.g. **30,000** full mocks/month; **5%** of those also a **long** Aria (coach+voice) | **~£2,300 – £2,500** | **~£25,000** |
| **B – high growth** | **200,000** mocks/month; **25%** with “heavy” Aria | **~£54,000 – £58,000** | **~£640,000** |
| **C – stress (ceiling, not a forecast)** | very high use; many maxing long coach+voice | **~£200,000 – £250,000+** / month | **~£2.3M – £2.9M+** / year (AI) |

*Scenario C is a **ceiling** for planning. Avoid it in real life with **Pro pricing, fair use, and (if needed) a higher “Plus” tier** for the most expensive modes.*

**Transparent build (scenario A, simplified):**  
- 30,000 mock completions × about **$0.02** AI (mini path) + 1,500 “heavy Aria” × about **$1.00** (then **+25%** buffer, then $→£ at 1.25) → lands near the **~£2.3k–2.5k** band with Supabase + Vercel on top.  
*(These are *illustrative* token-cost assumptions; replace with exports from the OpenAI dashboard.)*

### 2.4 Chat / TTS rate card (planning, **£** per 1M **tokens** where text)

*Converted from public USD with **$1.25 = £1**; verify on OpenAI on your billing date.*

| item | about £ / 1M input | about £ / 1M output | typical use in app |
|------|--------------------|--------------------|--------------------|
| **gpt-4o-mini** | ~0.12 | ~0.48 | high volume: mocks, grading |
| **gpt-4o** | ~2.00 | ~8.00 | coach (non-live), CV/research, etc. |
| **TTS** | n/a (per char / per model) | n/a | Aria **voice** — can dominate if unconstrained |
| **Realtime / flagship audio** (if you add) | *see [OpenAI pricing](https://openai.com/api-pricing)* | *separate* | **separate** P&L; **min bundles** in pricing |

---

## 3. Per-user economics (Pro subscriber)

### 3.1 Cost to **serve** one Pro user in a month (variable — AI in £, planning)

| user type | what they do (rough) | **order of AI+tiny infra £ / user / month** |
|----------|------------------------|---------------------------------------------|
| **Light** | 2–3 mocks; almost no Aria Live | **~£0.20 – £0.50** |
| **Typical** | 5–8 mocks + one **short** Aria session | **~£1.00 – £3.00** |
| **Heavy** | many mocks + **long** daily Aria + lots of TTS | **~£5 – £20+** (can go higher) |

**Core mock** alone: **~1p–2½p** each in this model.

### 3.2 **Net** after **Stripe** on **£12** (illustrative UK consumer card)

- **Gross:** **£12.00**  
- **Fees (illustrate):** often **~2.5% + 20p** on standard UK cards = order of **~40p** → **net ≈ £11.60** (round **£11.20–11.50** if your Stripe blend differs)  
*Confirm in your Stripe account.*

### 3.3 **Profit per Pro user (contribution)** — *after* Stripe, *before* salary, tax, and ads

Formula: **Net (after fees) minus variable cost (AI + tiny share of platform)**.  
*Allocating a fixed **£50** platform to **1,000** actives = **+5p** per user — here we focus on **variable**; add **£0.05–0.20** if you want to be strict.*

| user type | illust. **net** after fees | illust. **variable £** | **illustrative contribution** / month |
|-----------|----------------------------|--------------------------|----------------------------------------|
| **Light** (~£0.35) | **£11.30** | £0.35 | **~£10.95** |
| **Typical** (~£2) | **£11.30** | £2.00 | **~£9.30** |
| **Heavy** (~£8) | **£11.30** | £8.00 | **~£3.30** |
| **Worse than heavy** (>£12 cost) | **£11.30** | >£12 | **£0 or loss** on that user |

**£99 / year:** after fees you might have **~£95–97** in the year → **~£7.9–8.1 / month** effective. If a yearly subscriber uses **~£2 × 12** of AI, **~£70+** of **contribution** / year is still plausible; if they are **heavy** all year, **margin shrinks** — that’s why **yearly** needs **the same** fair use as monthly.

**Rule of thumb:** target **>50–60% contribution margin** on Pro (after fees + variable) before opex. If you stay **<40%** for months, **raise** price, **tighten** Aria, or add **Pro+**.

---

## 4. “Future” product: *real* live interviewer (separate P&L line)

- **Today:** Aria Live is **HTTP** coach + **TTS**; live path often uses a **smaller** chat model for cost — *not* full “film yourself in a 45-minute Hollywood interview with flagship realtime audio.”  
- **Upgrade path:** e.g. **OpenAI Realtime** or equivalent — **cost per *minute* of open microphone** is **much** higher than “one more mock in mini.”  
- **Planning (illustrative):** Realtime can land in a **~£0.04–0.32 / minute** *band* in public third-party round figures before your long “interviewer” prompt; **~£3–5+** per *long* session in API *alone* in example maths — *measure on staging*. **Flagship audio** (e.g. gpt-realtime-1.5 class) is **higher** still — you **price** and **cap** (minutes, or **Pro+**).  
*See the separate technical note in `docs/INVESTOR-COST-REAL-INTERVIEWER-MODE.md`.*

---

## 5. Commercial levers (so the model stays true)

1. **Fair use / soft caps** on TTS or long Aria for **Pro** if abuse appears.  
2. **Pro+** or add-on for **unlimited** or **realtime** “hiring manager” experience.  
3. **B2B** (career schools, teams) for **higher** £/seat and contracts.  
4. **Track weekly:** OpenAI $ / week; **$ or £ per active Pro**; Aria **minutes** or TTS **chars** per Pro.

---

## 6. Metrics checklist

1. MRR, active Pro, **churn**  
2. **OpenAI** bill (total and / active user)  
3. **Mocks** per user; **Aria** minutes or TTS volume per Pro  
4. **Gross** vs **net** (after Stripe)

---

## 7. disclaimer

- Figures are **planning** and **illustrative**. **Not** a quote from any vendor.  
- **Not** tax, legal, or investment advice. Use an **accountant** for VAT, consumer rules, and annual accounts.  
- **Reconcile** every line with real invoices after launch.

---

*Prepared for the InterviewAI / Aria codebase: Vite + React, Vercel, Supabase, serverless `api/`, OpenAI. Feature and price strings align with `src/components/UpgradeModal.jsx`, `src/PricingPage.jsx`, `api/_lib/candidateAuth.js`.*
