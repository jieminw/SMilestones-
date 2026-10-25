import { ref, watch } from "vue";
import { blankRenoForm, blankRenoLines, buildRenoLines, defaultRenoForm, type RenoDates, type RenoForm } from "@/domain/renoBudget";
import type { ExtraMilestone, Line } from "@/domain/weddingBudget";

/**
 * The renovation plan: the answers from the setup form (home, size, finish, dates, costs) and the lines built from them.
 * The form lives on the renovation pot's setup page; the Renovation page and the pot read this and turn it into
 * milestones. Saved in this browser.
 */
export interface RenoPlan {
  /** True once the setup form has been saved or skipped. */
  started: boolean;
  /** True once the form has been saved with real answers. Until then the pages show no figures. */
  filled: boolean;
  dates: RenoDates;
  form: RenoForm;
  lines: Line[];
  /** Ticked checklist items, keyed "<milestone>:<index>". */
  done: Record<string, boolean>;
  /** Milestones the couple added after the built-in ones. */
  extras: ExtraMilestone[];
}

// v2: a fresh start. The first renovation planner saved under another key, which is no longer read.
const KEY = "smilestones-reno-v2";

export const defaultRenoPlan = (): RenoPlan => ({
  started: false,
  filled: false,
  dates: { keys: "", movein: "" },
  form: defaultRenoForm(),
  lines: blankRenoLines(),
  done: {},
  extras: [],
});

function load(): RenoPlan {
  const d = defaultRenoPlan();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...d, ...p, form: { ...d.form, ...(p.form ?? {}) }, dates: { ...d.dates, ...(p.dates ?? {}) } };
    }
  } catch {
    /* blocked or corrupted storage: start fresh */
  }
  return d;
}

export const renoPlan = ref<RenoPlan>(load());
watch(
  renoPlan,
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
export function saveRenoPlan(f: RenoForm, dates: RenoDates) {
  renoPlan.value.form = { ...f, items: [...f.items] };
  renoPlan.value.dates = { ...dates };
  renoPlan.value.lines = buildRenoLines(renoPlan.value.form, renoPlan.value.lines);
  renoPlan.value.started = true;
  renoPlan.value.filled = true;
}

/** Skipping the form leaves an empty plan: names but no figures, until the form is filled in. */
export function skipRenoPlan() {
  renoPlan.value.started = true;
  renoPlan.value.form = blankRenoForm();
  renoPlan.value.lines = blankRenoLines();
}

export function resetRenoPlan() {
  renoPlan.value = defaultRenoPlan();
}
