/**
 * Demo data for "Dephany & Julian". Built by replaying real commands through the engine
 * (with a time-travelling clock), so the demo can never contain a state the rules forbid.
 */
import { run, applyMutations, type Command } from "../domain/engine";
import type { BtoMeta, CoupleState, Profile } from "../domain/types";
import { addMonths, toISODate } from "../domain/dates";
import { buildBtoPlan, checkEligibility } from "../domain/bto";
import { getProject } from "../domain/bto-data";
import { dollars } from "../domain/money";

export const DEMO_DEPHANY = "demo-dephany";
export const DEMO_JULIAN = "demo-julian";
/** A parent invited to give to the wedding pot only. Not part of the couple. */
export const DEMO_MUM = "demo-mum";

export function emptyState(coupleId: string, profiles: Profile[], name: string, now = new Date()): CoupleState {
  return {
    couple: { id: coupleId, name, pet_name: "Fluffy", version: 1, created_at: now.toISOString() },
    profiles, pots: [], stages: [], proposals: [], transactions: [], requests: [], petCare: [], notifications: [], btoApplications: [], covers: [], potMembers: [], moneyDates: [],
  };
}

let counter = 0;
const id = () => `demo-${(++counter).toString(36)}`;

export function btoMetaFor(projectId: string, flat: "4R", price: number, household: NonNullable<BtoMeta["household"]>, cpfOa: number) {
  const project = getProject(projectId)!;
  const el = checkEligibility(household);
  return { project, el, meta: (plan: ReturnType<typeof buildBtoPlan>): BtoMeta => ({
    project_id: project.id, project_name: project.name, town: project.town, flat_type: flat, price: dollars(price),
    scheme: el.scheme, ehg: el.ehg, cpf_oa: dollars(cpfOa), waiting_months: project.waitingMonths,
    loan_monthly: plan.loan.monthly, household,
  }) };
}

export function createDemoState(now = new Date()): CoupleState {
  counter = 0;
  const monthsAgo = (n: number, day = 5) => {
    const d = new Date(now.getFullYear(), now.getMonth() - n, day, 20, 0, 0);
    return d;
  };
  const created = monthsAgo(4, 1).toISOString();
  const profiles: Profile[] = [
    { id: DEMO_DEPHANY, couple_id: "demo-couple", display_name: "Dephany Tan", monthly_income: 3600, age: 26, first_timer: true, cpf_oa: 2_400_000, created_at: created },
    { id: DEMO_JULIAN, couple_id: "demo-couple", display_name: "Julian Lim", monthly_income: 3900, age: 27, first_timer: true, cpf_oa: 2_100_000, created_at: created },
  ];
  let s = emptyState("demo-couple", profiles, "Dephany & Julian", monthsAgo(4, 1));

  const exec = (who: string, at: Date, cmd: Command) => {
    const r = run(s, cmd, { userId: who, now: at, newId: id });
    s = applyMutations(s, r.mutations);
    return r.createdId!;
  };

  // ---- BTO pot: Woodgrove Acres, 4-room at $395,000 (HDB range $353k–$437k)
  const today = toISODate(now);
  const booking = addMonths(today, 2);
  const lease = addMonths(booking, 6);
  const household = { firstTimers: "both" as const, monthlyIncome: 7500, ageA: 26, ageB: 27 };
  const { project, el, meta } = btoMetaFor("woodgrove-acres", "4R", 395_000, household, 8_000);
  const keys = addMonths(booking, project.waitingMonths);
  const plan = buildBtoPlan({
    price: dollars(395_000), flatType: "4R", scheme: el.scheme, ehg: el.ehg, cpfOa: dollars(8_000),
    bookingDate: booking, leaseDate: lease, keysDate: keys,
  });
  const t0 = monthsAgo(3, 2);
  const bto = exec(DEMO_DEPHANY, t0, {
    type: "createPot", kind: "bto", name: "Our BTO", subtitle: `${project.name} · 4-room`, target_date: keys, bto: meta(plan),
    stages: plan.stages.map((st) => ({
      name: st.name,
      description: st.lines.map((l) => `${l.label}`).join(" · "),
      target: st.cash, due_date: st.due,
    })),
  });
  const btoSplit = exec(DEMO_DEPHANY, t0, { type: "proposeSplit", potId: bto, mode: "income", shares: { [DEMO_DEPHANY]: dollars(720), [DEMO_JULIAN]: dollars(780) } });
  exec(DEMO_JULIAN, new Date(t0.getTime() + 3600_000), { type: "respondSplit", proposalId: btoSplit, accept: true });

  // ---- Application history (sample data): one ballot missed, then the flat they are saving for.
  exec(DEMO_DEPHANY, t0, { type: "logApplication", potId: bto, exercise: "Feb 2026", project_id: "kebun-baru-ridge", flat_type: "4R", applied_on: "2026-02-24", result: "unsuccessful", queue_number: null });
  exec(DEMO_DEPHANY, t0, { type: "logApplication", potId: bto, exercise: "Jun 2026", project_id: project.id, flat_type: "4R", applied_on: "2026-06-24", result: "successful", queue_number: 412 });

  // ---- Trip pot
  const trip = exec(DEMO_JULIAN, t0, {
    type: "createPot", kind: "trip", name: "Graduation trip", subtitle: "Australia · 10 days", target_date: addMonths(today, 8), bto: null,
    stages: [
      { name: "Flights", description: "", target: dollars(1_800), due_date: null },
      { name: "Accommodation", description: "", target: dollars(1_600), due_date: null },
      { name: "Activities", description: "", target: dollars(900), due_date: null },
      { name: "Food & transport", description: "", target: dollars(700), due_date: null },
    ],
  });
  const tripSplit = exec(DEMO_JULIAN, t0, { type: "proposeSplit", potId: trip, mode: "equal", shares: { [DEMO_DEPHANY]: dollars(250), [DEMO_JULIAN]: dollars(250) } });
  exec(DEMO_DEPHANY, new Date(t0.getTime() + 7200_000), { type: "respondSplit", proposalId: tripSplit, accept: true });

  // ---- Three months of contributions
  for (const n of [3, 2, 1]) {
    const day = monthsAgo(n, 3);
    const iso = toISODate(day);
    exec(DEMO_DEPHANY, day, { type: "logContribution", potId: bto, amount: dollars(720), occurred_on: iso, note: "Monthly transfer" });
    exec(DEMO_JULIAN, day, { type: "logContribution", potId: bto, amount: dollars(780), occurred_on: iso, note: "Monthly transfer" });
    exec(DEMO_DEPHANY, day, { type: "logContribution", potId: trip, amount: dollars(250), occurred_on: iso, note: "" });
    exec(DEMO_JULIAN, day, { type: "logContribution", potId: trip, amount: dollars(250), occurred_on: iso, note: "" });
  }
  const thisMonth = monthsAgo(0, 2) < now ? monthsAgo(0, 2) : now;
  exec(DEMO_DEPHANY, thisMonth, { type: "logContribution", potId: bto, amount: dollars(720), occurred_on: toISODate(thisMonth), note: "Monthly transfer" });
  exec(DEMO_DEPHANY, thisMonth, { type: "logContribution", potId: trip, amount: dollars(150), occurred_on: toISODate(thisMonth), note: "Angpao money" });

  // ---- Cover me (sample data): Julian covers the $100 Dephany was short on the trip this month; she repays it over 3 months.
  const cover = exec(DEMO_JULIAN, thisMonth, { type: "proposeCover", potId: trip, month: toISODate(thisMonth), amount: dollars(100), months: 3 });
  exec(DEMO_DEPHANY, thisMonth, { type: "respondCover", coverId: cover, accept: true });

  exec(DEMO_DEPHANY, monthsAgo(1, 8), { type: "petCare", action: "food" });
  exec(DEMO_JULIAN, monthsAgo(1, 9), { type: "petCare", action: "outfit" });

  // ---- Wedding pot: Julian proposed it and Dephany agreed
  const recent = new Date(now.getTime() - 5 * 3600_000);
  const wedding = exec(DEMO_JULIAN, monthsAgo(1, 12), {
    type: "createPot", kind: "wedding", name: "Our wedding", subtitle: "Solemnisation + dinner banquet", target_date: addMonths(today, 8), bto: null,
    // Example guest plan: 20 tables × $1,400 = $28,000 banquet; 200 guests at about $60 ang bao each (a cautious guess).
    wedding: { tables: 20, price_per_table: dollars(1_400), guests_per_table: 10, avg_angbao: dollars(60), categories: [] },
    stages: [
      { name: "Banquet", description: "", target: dollars(28_000), due_date: null },
      { name: "Photography & video", description: "", target: dollars(4_500), due_date: null },
      { name: "Attire & make-up", description: "", target: dollars(3_500), due_date: null },
      { name: "Rings", description: "", target: dollars(3_000), due_date: null },
      { name: "Solemnisation & misc.", description: "", target: dollars(1_000), due_date: null },
    ],
  });
  const weddingSplit = exec(DEMO_JULIAN, monthsAgo(1, 12), { type: "proposeSplit", potId: wedding, mode: "custom", shares: { [DEMO_DEPHANY]: dollars(400), [DEMO_JULIAN]: dollars(400) } });
  exec(DEMO_DEPHANY, monthsAgo(1, 12), { type: "respondSplit", proposalId: weddingSplit, accept: true });
  exec(DEMO_DEPHANY, monthsAgo(1, 14), { type: "logContribution", potId: wedding, amount: dollars(400), occurred_on: toISODate(monthsAgo(1, 14)), note: "Monthly transfer" });
  exec(DEMO_JULIAN, monthsAgo(1, 14), { type: "logContribution", potId: wedding, amount: dollars(400), occurred_on: toISODate(monthsAgo(1, 14)), note: "Monthly transfer" });

  // ---- Julian asks to move $200 from the trip to the BTO pot
  exec(DEMO_JULIAN, new Date(now.getTime() - 2 * 3600_000), { type: "requestTransfer", fromPotId: trip, toPotId: bto, amount: dollars(200), reason: "Topping up the option fee buffer" });

  // ---- Money date (sample data): last month's check-in was done together, this month's is still to do.
  exec(DEMO_DEPHANY, monthsAgo(1, 28), { type: "completeMoneyDate" });
  exec(DEMO_JULIAN, monthsAgo(1, 29), { type: "completeMoneyDate" });

  // ---- Statement check (sample data): Dephany has confirmed her earlier BTO transfers against her bank statement.
  const checked = s.transactions.filter((t) => t.user_id === DEMO_DEPHANY && t.pot_id === bto && t.kind === "contribution" && t.occurred_on < toISODate(monthsAgo(0, 1))).map((t) => t.id);
  if (checked.length) exec(DEMO_DEPHANY, now, { type: "markVerified", txIds: checked });

  // Older notifications are noise in a demo — keep only the latest few unread.
  s.notifications = s.notifications.map((n, i, arr) => ({ ...n, read: i < arr.length - 4 }));
  s.couple.version = 1;
  return s;
}
