import { ref, watch } from "vue";
import { blankLines, buildLines, defaultForm, type BudgetForm, type ExtraMilestone, type Line, type WeddingDates } from "@/domain/weddingBudget";

/**
 * The wedding plan: the answers from the setup form (dates, style, guests, venue, costs, ang bao) and the lines built
 * from them. The form lives on the wedding pot's setup page; the Wedding page reads this and turns it into milestones.
 * Saved in this browser.
 */
export interface WeddingPlan {
  /** True once the setup form has been saved. */
  started: boolean;
  filled: boolean;
  dates: WeddingDates;
  form: BudgetForm;
  lines: Line[];
  /** Ticked checklist items, keyed "<milestone>:<index>". */
  done: Record<string, boolean>;
  /** Savings typed in by hand, for couples with no wedding savings goal. */
  savedManual: string;
  /** Milestones the couple added after the built-in ones. */
  extras: ExtraMilestone[];
}

// v3: a fresh start. Plans saved under the older keys are left in the browser but no longer read.
const KEY = "smilestones-wedding-v3";

export const defaultPlan = (): WeddingPlan => ({
  started: false,
  filled: false,
  dates: { banquet: "", photoshoot: "", rom: "", honeymoon: "" },
  form: defaultForm(),
  lines: blankLines(),
  done: {},
  savedManual: "",
  extras: [],
});

function load(): WeddingPlan {
  const d = defaultPlan();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...d, ...p, form: { ...d.form, ...(p.form ?? {}) }, started: !!p.started, filled: p.filled ?? !!p.started, dates: { ...d.dates, ...(p.dates ?? {}) } };
    }
  } catch {
    /* blocked or corrupted storage: start fresh */
  }
  return d;
}

export const plan = ref<WeddingPlan>(load());
watch(
  plan,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
  { deep: true },
);

/** Save the setup form into the plan, keeping vendors, quotes and payments already recorded. */
export function savePlan(f: BudgetForm, dates: WeddingDates) {
  plan.value.form = { ...f, items: [...f.items] };
  plan.value.dates = { ...dates };
  plan.value.lines = buildLines(plan.value.form, plan.value.lines);
  plan.value.started = true;
  plan.value.filled = true;
}

export function resetPlan() {
  plan.value = defaultPlan();
}
