# SMilestones

A shared savings and planning workspace for Singapore couples: BTO flat, wedding, renovation and trips.
Vue 3 + Vite + Tailwind v4, with Supabase (Postgres, Auth) behind Vercel functions in `api/`.

```bash
npm install
npm run dev        # http://localhost:5173, then "Enter sample workspace" (no setup needed)
npm test           # domain, engine and Postgres (PGlite) tests
npm run typecheck
npm run build
```

Cloud mode needs the keys in `.env.example` and the migrations in `supabase/migrations/` applied in order (0001 to 0008). Use `vercel dev` to run the API locally.

## How it works

Every write is a command run by one pure function, the domain engine (`src/domain/engine.ts`). The same engine runs in the browser for the demo (localStorage) and on the server for cloud mode (committed in one transaction with optimistic locking). Money is integer cents. Balances, progress, streaks and the timeline are derived from the ledger and never stored. Anything that changes over time (CPF rates, ceilings) is a named constant with an as-of date and a source link.

## Features added in this round

**1. Future CPF OA contributions.** `src/domain/cpf.ts` projects each partner's OA (wage, age, balance) up to every stage's due date, and `buildBtoPlan` uses what has accumulated by then, less what earlier stages took. The option fee is never paid from CPF. Toggle: Finances tab, "Include future CPF contributions". Sources, as of Jan 2026: 37% total contribution for ages 55 and below and the $8,000 Ordinary Wage ceiling ([cpf.gov.sg](https://www.cpf.gov.sg/service/article/what-is-the-ordinary-wage-ow-ceiling)); OA allocation by age (0.6217 / 0.5677 / 0.5136 / 0.4055 of each contribution) from [CPF allocation rates](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/jan2027cpfallocationrates.pdf); OA interest 2.5% a year. Simplifications are listed at the top of the file (flat wages, monthly compounding on the opening balance, no bonuses). Estimate only.

**2. Crunch-month detector.** `src/domain/timeline.ts` pools agreed monthly splits against what falls due each month. `/timeline` charts 36 months, highlights crunch months and offers two fixes (save more, or move a deadline). Home shows a warning when one falls in the next 12 months.

**3. Ang bao offset.** Wedding pots get a "Guests & ang bao" panel (tables, price per table, guests per table, average or per-group ang bao). Net banquet cost = tables x price - expected ang bao, never below $0, and the savings target uses it. The cash needed before the wedding is shown separately. Starting figures are examples. Stored as JSON on the pot (`0003_wedding.sql`).

**4. "Didn't get the flat".** `bto_applications` (`0004`) with history and results on the BTO pot. When the latest ballot is unsuccessful, "Retarget to next exercise" opens the Navigator, rebuilds stages and dates from the chosen project and keeps every contribution, showing the monthly target before and after. Refused while a withdrawal or transfer is pending. No prices are invented for unreleased projects.

**5. Cover me.** One partner offers to cover the other's missed share, the other accepts, and the payback is spread over 1 to 6 months (default 3). The covered partner's expected share rises by amount / months, repayment is measured from extra contributions, and "Who's ahead" shows on Home. `covers` and `transactions.covering` (`0005`).

**6. Parents as limited contributors.** `pot_members` and `pot_invites` (`0006`). A partner creates a pot invite code; the parent signs up, enters it and gets one page (`/gift`) for that pot only. Enforced in the engine (a contributor may only log a gift to their pot) and in RLS (they read that pot's rows only, no other pots, requests, splits, partner profiles or incomes, and cannot write). Tests prove a contributor cannot read another pot or approve a request. The demo has a third "view as" button, Mum.

**7. Bank statement reconciliation.** Wallet, "Check against bank statement". The CSV is parsed in the browser and never uploaded or stored. You map the columns once (a layout can be remembered by name, for example DBS/POSB, OCBC or UOB); contributions are matched one-to-one to debits of the same amount within 3 days. Only `verified_at` (`0007`) is stored.

**8. Monthly money date.** `/money-date`, once a month, four steps (what we saved, waiting on us, one decision, Fluffy). Both partners mark it done (`money_dates`, `0008`). Doing it together adds bonus XP and extends the pet's streak. Home shows "Money date ready".

## Demo data

The sample couple, Dephany and Julian, has a BTO pot with an application history, a trip with a cover payback, a wedding with a guest and ang bao plan and a $5,000 gift from Mum, a Jun 2027 crunch month, some contributions already verified, and last month's money date done. All of it is placeholder data.

## Not done yet

- Screenshots for this README were not captured.
- The Vue app has not been deployed; the `api/` functions are untested outside the Postgres tests.
- The CPF projection uses published rates as of Jan 2026. Re-check them each January.

Estimates only, not financial advice. Your HDB Flat Eligibility letter is the final word on grants and loans.
