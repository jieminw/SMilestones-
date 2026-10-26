import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** clsx + tailwind-merge: later classes win (e.g. Card class="bg-navy" overrides bg-surface). */
export const cx = (...a: ClassValue[]) => twMerge(clsx(a));

export const inputCls =
  "h-11 w-full rounded-[4px] border border-ink/30 bg-white/5 px-3.5 text-[15px] text-ink placeholder:text-faint outline-none transition focus:border-ink focus:bg-white/10 aria-[invalid=true]:border-bad";

/** Everything in $attrs except `class`, for components that merge classes with cx(). */
export const omitClass = (attrs: Record<string, unknown>) => {
  const { class: _c, ...rest } = attrs;
  return rest;
};
