import { reactive, watch } from "vue";
import { defaultRenoItems, type Finish, type Home, type RenoDates, type RenoForm, type Rooms } from "@/domain/renoBudget";
import { renoPlan } from "@/stores/renoPlan";

/**
 * What the reader has picked inside the renovation guide: the flat for the money map, and the priorities they choose.
 * It starts from the couple's saved plan when there is one. Kept in this browser only.
 */
interface GuideState {
  home: Home;
  rooms: Rooms;
  finish: Finish;
  picks: string[];
  /** Key collection and move-in dates, if they gave them. */
  keys: string;
  movein: string;
  /** True once the couple has answered the planning questions on their first visit (or skipped them). */
  onboarded: boolean;
}

const KEY = "smilestones-reno-guide-v1";

function load(): GuideState {
  const f = renoPlan.value.filled ? renoPlan.value.form : null;
  const d: GuideState = { home: f?.home ?? "bto", rooms: f?.rooms ?? 4, finish: f?.finish ?? "mid", picks: [], keys: "", movein: "", onboarded: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...d, ...p, picks: Array.isArray(p.picks) ? p.picks : [] };
    }
  } catch {
    /* blocked or corrupted storage: use the defaults */
  }
  return d;
}

export const guideState = reactive<GuideState>(load());

watch(
  guideState,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
  { deep: true },
);

/** Pick or un-pick a priority. Any number can be chosen. */
export function togglePick(id: string) {
  const i = guideState.picks.indexOf(id);
  if (i >= 0) guideState.picks.splice(i, 1);
  else guideState.picks.push(id);
}

/** The planning form, started from the answers given on the first visit. */
export const formFromGuide = (): RenoForm => ({ home: guideState.home, rooms: guideState.rooms, finish: guideState.finish, items: defaultRenoItems(guideState.home) });

/** The dates they gave on the first visit. */
export const datesFromGuide = (): RenoDates => ({ keys: guideState.keys, movein: guideState.movein });

/** Ask the planning questions again. The earlier answers stay filled in. */
export const reopenPlanning = () => {
  guideState.onboarded = false;
};
