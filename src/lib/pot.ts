import type { CoupleState, Pot } from "@/domain/types";
import { currentStage, stageProgress } from "@/domain/selectors";
import { fmtMonth } from "@/domain/dates";

export function potLine(s: CoupleState, pot: Pot): string {
  if (pot.status === "draft") return "Draft · finish setting up";
  if (pot.status === "pending_split") return "Waiting for the split to be agreed";
  if (pot.status === "completed") return "Fully funded";
  if (pot.sequential) {
    const cur = currentStage(s, pot);
    const i = stageProgress(s, pot).findIndex((x) => x.stage.id === cur?.stage.id);
    return cur ? `Stage ${i + 1} · ${cur.stage.name}` : pot.subtitle;
  }
  return pot.subtitle || `Target ${fmtMonth(pot.target_date)}`;
}
