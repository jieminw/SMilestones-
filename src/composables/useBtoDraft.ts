import { ref, watch, type Ref } from "vue";
import { useApp } from "@/stores/app";
import { DRAFT_KEY, defaultDraft, type BtoDraft } from "@/lib/bto-draft";

let draft: Ref<BtoDraft> | null = null;

/** What the couple is exploring in the BTO Navigator, shared by its tabs and persisted per browser. */
export function useBtoDraft(): Ref<BtoDraft> {
  if (draft) return draft;
  const initial = defaultDraft(useApp().state);
  const value = ref<BtoDraft>(initial) as Ref<BtoDraft>;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) value.value = { ...initial, ...JSON.parse(raw) };
    value.value.household = { ...value.value.household, monthlyIncome: value.value.wageA + value.value.wageB };
  } catch {
    /* storage blocked or corrupted: start from the defaults */
  }
  watch(
    value,
    (v) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    { deep: true },
  );
  draft = value;
  return value;
}
