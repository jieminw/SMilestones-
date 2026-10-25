import type { Directive } from "vue";

/**
 * v-reveal: fades and lifts an element in as it scrolls into view. Pass a delay in ms as the value to stagger a row.
 * Respects reduced motion by showing everything straight away.
 */
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

let observer: IntersectionObserver | null = null;
const get = () =>
  (observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).classList.add("in");
        observer?.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  ));

export const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, { value }) {
    el.classList.add("reveal");
    if (value) el.style.transitionDelay = `${value}ms`;
    if (reduced() || typeof IntersectionObserver === "undefined") el.classList.add("in");
    else get().observe(el);
  },
};
