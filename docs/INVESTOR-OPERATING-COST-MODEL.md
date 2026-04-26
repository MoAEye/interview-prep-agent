# Cost to run the app (simple version — in £)

**Last updated:** 9 Apr 2026

---

## How to open this file (step by step)

1. **On your Mac**, open **Finder**.
2. Go to your project: **Desktop** → **aria-clean** (or wherever you keep the code).
3. Open the **docs** folder.
4. Double-click **`INVESTOR-OPERATING-COST-MODEL.md`**.

**Or, using Cursor (faster if you’re already in the project):**

1. Open the **aria-clean** project in Cursor.
2. Press **⌘P** (Command + P) on the keyboard.
3. Type **`INVESTOR`**, then press **Enter** when the file is highlighted.

The file is plain text with headings and tables. It reads well in **Cursor** or any text editor.  

**If you need a PDF** for an investor: select all, paste into **Google Docs** or **Word**, then **Print → Save as PDF** (or any Markdown → PDF app you use).

---

## In one minute: what is this file?

- It’s **rough maths** for **how much it costs to run** the app (hosting + AI + database) — not salaries, rent, or ads.
- **The numbers you care about are in £.** Some bills (e.g. OpenAI) are in **dollars**; we use one fixed conversion so you can think in pounds.
- The **largest** cost at scale is usually **OpenAI** — especially **Aria live coach** and **voice (TTS)**. The **basic** mock (questions + grade) is a **small** cost **per** interview.

**FX used in this document:** **£1 = $1.25** (e.g. **$1.25 → £1**). Change this when the pound moves or for a board pack.

---

## The three big numbers (per month — only “run the app” costs)

| Scenario | What we’re picturing | About **per month (all in)** | OpenAI-style bill about **per year** |
|----------|----------------------|----------------------------|--------------------------------------|
| **A – Small / steady** | 30,000 full mock interviews; **5%** of those also do a long **Aria (coach + voice)** | **~£2,300 – £2,500** | **~£25,000** |
| **B – High growth** | 200,000 full mocks; **25%** with heavy Aria | **~£54,000 – £58,000** | **~£640,000** |
| **C – Stress (ceiling, not a normal plan)** | 500,000 full mocks; **30%** with heavy Aria (lots of people maxing coach + voice) | **~£200,000 – £250,000** | **~£2.3M – £2.9M** |

- **A** = a healthy early commercial level.  
- **B** = the product is doing well and used a lot.  
- **C** = **worst case we use for planning** — *not* a promise of growth. It shows you must have **Pro pricing, fair limits, and monitoring** on the expensive features.

---

## What you pay for (plain English)

| What | What it is |
|------|------------|
| **OpenAI** | AI for **questions, grading, CV/company help, Aria coach, and voice**. Grows with usage. |
| **Supabase** | **Log in + database.** Often a **steady** monthly cost until you’re very big. |
| **Vercel** | **Website + your API** in the cloud. Often **smaller** than the AI bill until huge traffic. |
| **Stripe** (when you charge) | A **% of every payment** — count it in **profit**, not in “server cost” alone. |
| **Domain, small tools** | Usually **small** next to the AI number. |

**For investors, one line:** revenue per paying user should cover **that user’s share** of these costs, especially for **power users** on coach + voice.

---

## The cheap part vs the expensive part

| Type | What it means | Order of size (AI cost, in £) |
|------|----------------|--------------------------------|
| **One simple mock** | “Questions + grade” only (no long coach) | about **1p to 2½p** per full mock, in this model |
| **One long Aria session** | lots of **coach** messages + **voice** | from **a few 10p** up to **£1–£1.50+** in a bad case — **this** is what makes scenario **C** scary if everyone does it all the time |

*Code note:* mocks mostly use **gpt-4o-mini**; the live coach defaults to **gpt-4o**, which costs more, plus TTS is extra.

---

## The £ prices we use inside the maths (OpenAI is listed in $ — you convert the bill)

These are **planning** numbers. **Always** check the live table on **[OpenAI API pricing](https://openai.com/api-pricing)** before a finance round.

Dollar list prices, turned into £ with **$1.25 = £1**:

| Chat model | About **£** / 1M **input** tokens | About **£** / 1M **output** tokens | Typical use |
|------------|------------------------------------|---------------------------------------|-------------|
| gpt-4o-mini | ~0.12 | ~0.48 | Big volume: questions + grade |
| gpt-4o | ~2.00 | ~8.00 | Coach default, some CV / research |
| **Voice (TTS)** | — | Not per 1M tokens; see OpenAI (per char / model) | Speaking aloud in Aria |

The big tables below add **+25%** on the OpenAI part to cover “price change + messy real usage”.

---

## Smaller fixed monthly bits (in £, rough)

After converting typical US $ prices at **$1.25 = £1**:

- **Vercel:** about **£15–£200+/month** depending on plan and traffic.  
- **Supabase (serious project):** often **~£20/month** to start, more if you store huge data or have huge download traffic.  
- **Domain, email, error tracking:** usually **small** vs the AI line item.

---

## Where the three scenario numbers come from (transparent)

| Label | Mocks (per month) | “Heavy Aria” sessions (per month) | What we do in the model |
|--------|-------------------|------------------------------------|------------------------|
| **A** | 30,000 | 1,500 (5% of mocks) | Each **mock** ≈ **$0.02** AI; each **heavy** session ≈ **$1** AI, then +25% buffer, then $→£. |
| **B** | 200,000 | 50,000 (25% of mocks) | Same, scaled up. |
| **C** | 500,000 | 150,000 (30% of mocks) | Heavier session cost in the worst case (**~$1.20** in $ terms per heavy session) + same buffer, then $→£. **Ceiling** test only. |

**Converting the old £ model to match (monthly, infrastructure only — no staff, no Stripe %):**

| | OpenAI (incl. buffer) | Supabase + Vercel (band) | **Total (round)** |
|--|------------------------|-------------------------|------------------|
| **A** | ~£2,100 | ~£160 – £500 | **~£2,300 – £2,600** (say **~£2.5k**) |
| **B** | ~£54,000 | ~£400 – £2,500 | **~£55,000 – £60,000** |
| **C** | **~£190,000 – £240,000** | ~£2,000 – £8,000+ | **~£195,000 – £250,000+** |

**Per year, OpenAI + buffer (order of scale):** **A ~£25k** · **B ~£650k** · **C ~£2.3M – £2.9M** (C is the stress case).

---

## If someone asks: “What should we track?”

1. **How many** full **mock** interviews finish each month.  
2. **How many** people use **long Aria + voice** and for **how long** (minutes / messages).  
3. The **OpenAI** dashboard in **$** (convert with your actual bank rate for board numbers).

That’s how you replace *guessed* 1p / £1 with **real** averages.

---

**See also:**  
- **Revenue, margin, and policy in one place** — [`COMMERCIAL-FINANCIAL-PLAN.md`](./COMMERCIAL-FINANCIAL-PLAN.md)  
- Tiers, “real interviewer” vs today’s Aria, Realtime £/minute — [`INVESTOR-COST-REAL-INTERVIEWER-MODE.md`](./INVESTOR-COST-REAL-INTERVIEWER-MODE.md)

---

## Small print (disclaimer)

This is a **model** for **planning and investor talks**, not a price quote. Real bills come from **OpenAI, Vercel, and Supabase**; prices and models change. Update this file when you have **3–6 months of real** usage, or if **£/USD** moves a lot.  

*Based on the current app: serverless `api/`, Supabase, Vercel, OpenAI (see `api/` in the repo for models).*
