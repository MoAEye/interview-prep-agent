# Commercial & financial plan — InterviewAI / Aria

**Purpose:** A single, coherent model so **pricing, usage limits, and cost** line up. Use this for **co-founder, advisor, and investor** discussions. **Not** tax or legal advice.  
**Last updated:** 9 Apr 2026  
**FX (planning):** **£1 = $1.25** for converting OpenAI’s USD list prices to **£** — refresh for board numbers.

**Related:** [Operating cost model (simple £)](./INVESTOR-OPERATING-COST-MODEL.md) · [Realtime / “interviewer” stress case](./INVESTOR-COST-REAL-INTERVIEWER-MODE.md)

---

## 1) What you’re selling (product, as in the app today)

| Layer | What it is |
|-------|------------|
| **Free** | Funnel. **3 mock interviews per month (UTC)**, **5 questions** max, overall score, **last 3** sessions, basic tracker; some tools locked or limited (see `src/pricingFeatures.js`). |
| **Pro** | **£12/month** or **£99/year** in the UI (Upgrade modal + Pricing page). Unlimited mocks, **10 questions**, full report + PDF, cover letter, company research, Academy, CV tools, read-aloud, etc. |
| **How Pro is on today** | **`user_profiles.is_pro`** in Supabase (or JWT `is_pro`). **Card payments** are not fully wired in-app yet (“coming soon” path) — plan to connect **Stripe** for production. |

---

## 2) Why this can work financially (the logic in one page)

- **Revenue** is **subscription** (and later optional **B2B** / team deals).  
- **The expensive variable** is **OpenAI** (chat + **TTS** for Aria). **Mocks (questions + grade)** are **cheap per completion**; **long Aria Live (coach + voice)** is **not** per minute unless you design it to be.  
- **£12/month** is **viable** if **most** Pro users are “moderate” and you **do not** offer truly **unlimited** high-cost live voice to every user with no cap — either **soft limits**, **fair use**, a **higher “Plus”** tier, or **minute bundles** for the heaviest 5–10%.  
- **Stripe** takes a slice of every payment — count it in **net revenue** and **gross margin** math.

---

## 3) Unit economics (how to think per **Pro** subscriber)

### 3.1 Approximate **AI + infra** per user (planning, not a promise)

| User type in a month | What they do (rough) | **Order of AI £** (before Stripe) |
|------------------------|----------------------|-------------------------------------|
| **Light** | 2–3 mocks, little/no Aria Live | **~£0.20 – £0.50** |
| **Typical** | 5–8 mocks + 1 short Aria session | **~£1 – £3** |
| **Heavy** | 15+ mocks + long daily Aria + TTS | **~£5 – £20+** possible |

**Implication:** the **blended** cost per Pro depends on the **shape** of your user base, not the headline “unlimited” copy. **Measure** average OpenAI £ per Pro in the first **60–90 days** after payment goes live.

### 3.2 **£12 / month** — back-of-envelope **net** after **Stripe (UK, illustrative)**

- **Gross received** ≈ **£12.00**  
- **Stripe** (illustrate at **1.5% + 20p** for UK *consumer* cards in many setups — your actual blend may differ; **verify** in Stripe for your account): on £12 that’s on the order of **~£0.40** → **net ~£11.60** per sub-month.  
- **If** that user is **“Typical”** and COGS (AI+allocated platform) is **~£2**, **contribution** after payment fees is in the **~£9+** / month *before* you pay yourself, support, and ads.  
- **If** a user is **“Heavy”** and COGS is **~£10**, you still have a little headroom; if COGS is **>£12**, that user **loses money** — you **must** limit or re-price that segment.

### 3.3 **£99 / year** (paid upfront)

- **Net after Stripe** (illustrative): on **£99**, fees might be on the order of **£1.70–2.20** (depends on 3D/Intl). Treat **~£8.25** effective / month in revenue across 12 months.  
- **Cash flow** is good; **AI risk** is 12 months of use — if heavy users pay yearly, **tighten** fair use or they can burn margin in month 1–2.

**Rule of thumb:** target **>60% contribution margin** on Pro subscription after Stripe and **variable** COGS, before salaries and marketing — for AI products many teams end up **~50–70%** on successful SKUs; **<40%** means re-check pricing or **caps**.

---

## 4) “Making £12 make sense” — **policy** (so margin doesn’t break)

| Lever | What to do | Why |
|--------|------------|-----|
| **1. Fair use / soft cap** | e.g. **N minutes of TTS** or **N Aria “deep”** sessions per Pro month, or throttle after a **high** threshold. | Stops a tiny group from **dominating** COGS. |
| **2. Split tier later** | **Pro** = mocks + tools + some Aria; **Pro+** or add-on = **unlimited** or long **realtime**-style. | Puts **list price** next to **real** cost. |
| **3. Free tier** | Keep **3 mocks** + limited questions — already in API — so **acquisition** doesn’t overpay. | You already design **limits**; keep them. |
| **4. B2B** (later) | **£/seat/month** for schools, career teams — higher **ARPU**, more predictable. | Improves **gross** without changing consumer RRP. |
| **5. Monitor weekly** | OpenAI usage **per active user**; alert if a cohort spikes. | Same play as any usage-based SaaS. |

---

## 5) **Company-level** run cost (only infra + API — no payroll)

| Scenario (planning) | Mocks (global, / month) + heavy Aria mix | **~All-in run cost** | Notes |
|---------------------|-------------------------------------------|----------------------|--------|
| **A – Steady** | 30k mocks, **5%** with heavy Aria | **~£2.3k – £2.5k** / month | “Working product, real users.” |
| **B – High growth** | 200k mocks, **25%** heavy Aria | **~£54k – £58k** / month | You need **£** **MRR** in the same ballpark as a **double-digit %** of this if you are mostly consumer Pro. |
| **C – Stress** | 500k mocks, **30%** heavy (uncapped behaviour) | **~£200k+** / month | **Planning ceiling** — avoid by **product policy**, not by hoping users stay light. |

**Bridge to revenue (order of magnitude):**  
- At **~£2.5k** month **COGS**, you need in the **low £thousands** of **MRR** from **all** paid sources (or funding) to cover *variable* — e.g. **hundreds of Pro subs** at **£12** (after Stripe) is **sensible** to cover *that* level of infra if you’re in scenario **A** on the **user** side.  
- At **£50k+** month **COGS**, you need **high tens of thousands+ £ MRR** or a **B2B** line — the exact multiple depends on **margin** target; **3–5×** COGS in **MRR** is a **rough** sanity check before **opex**.

---

## 6) Simple P&L shape (12‑month *direction*, not a forecast)

| Month phase | Focus | MRR (direction) | COGS (direction) | Opex (you) |
|-------------|--------|-----------------|-------------------|------------|
| **0–3** | Wire **Stripe**, measure **cost per Pro**, cap heavy use if needed | Rises from 0 | Dominated by **OpenAI** if you have users; platform **~£20–200** | Minimal beyond time |
| **4–6** | **Optimize** Aria policy, maybe **Pro+** | Grows with conversion | Scales with **usage** | + small tools, ads (optional) |
| **7–12** | **B2B** pilots, retention | Diversify | Scales; watch **per-seat** in enterprise | + support part-time? |

*Fill with real numbers once Stripe + 1 month of usage data exist.*

---

## 7) Key metrics to track (minimum)

1. **Active Pro count**; **MRR** and **net** after Stripe.  
2. **OpenAI spend** / week (total and **/ active Pro**).  
3. **Mocks / user / month** (Free vs Pro).  
4. **Aria Live** minutes (or TTS **chars**) **/ Pro / month** — the **#1** lever of margin.  
5. **Churn** (monthly) and **CACS** (if you run paid ads).

---

## 8) Risks & mitigations (financial)

| Risk | Mitigation |
|------|------------|
| **OpenAI** price or model change | +25% buffer in models; **review** Pro price **annually**; optional **credits** for yearly subs. |
| **Power users** on voice | **Fair use**, **Plus** tier, **min bundles**. |
| **Fraud / abuse** | **Auth** on all paid API routes; **rate limits** (you have patterns in API). |
| **Under-pricing** | If **gross** after variable **<~50%** sustained, **+£2 Pro** or **tighten** Aria. |

---

## 9) What “success” looks like in numbers (qualitative)

- **Contribution** after Stripe and variable COGS is **healthy** on the **typical** Pro.  
- **OpenAI** bill grows **slower** than **MRR** in percentage terms (efficiency) **or** you **accept** lower % margin while scaling **B2B**.  
- You have a **line of sight** from **MRR** to **covering** infra + a **modest** salary** within a defined month range** once you add real revenue rows.

---

## 10) Disclaimer

Numbers are **planning** ranges. **Replace** with **actual** OpenAI, Vercel, Supabase, and Stripe data from your own dashboards. **Hire** an accountant for year-end, VAT, and UK **consumer** / subscription rules.

---

*Aligned with: `api/_lib/candidateAuth.js` (3 free mocks/month, Pro limits), `src/pricingFeatures.js` (feature copy), `src/components/UpgradeModal.jsx` (£12 / £99).*
