import { reactive, watch } from "vue";
import { useApp } from "@/stores/app";
import { activeSplit, potBalance } from "@/domain/selectors";
import type { FlatChoice } from "@/lib/btoUi";

export interface ExploreState {
  /** ready: has saved up and wants to apply for a current launch. start: has barely started and wants a plan. */
  mode: "ready" | "start";
  /** Cash saved towards the flat so far, dollars. */
  cash: number;
  /** What is added each month, dollars. */
  monthly: number;
  /** The town being planned for, or null for "anywhere". */
  town: string | null;
  type: FlatChoice;
}

const KEY = "smilestones-explore-v1";
let state: ExploreState | null = null;

/** The inputs the Explore tab needs from the couple, started from their BTO goal when they have one and kept per browser. */
export function useExplore(): ExploreState {
  if (state) return state;
  const s = useApp().state;
  const pot = s?.pots.find((p) => p.kind === "bto" && p.status === "active");
  const saved = s && pot ? Math.round(potBalance(s, pot.id) / 100) : 0;
  const split = s && pot ? activeSplit(s, pot.id) : undefined;
  const initial: ExploreState = {
    mode: saved > 0 ? "ready" : "start",
    cash: saved,
    monthly: split ? Math.round(split.monthly_total / 100) : 1_000,
    town: null,
    type: "4R",
  };
  const value = reactive<ExploreState>({ ...initial });
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(value, JSON.parse(raw));
  } catch {
    /* storage blocked or corrupted: use the defaults */
  }
  watch(
    value,
    (v) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    { deep: true },
  );
  state = value;
  return value;
}
