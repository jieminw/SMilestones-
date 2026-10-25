import { reactive } from "vue";
import type { Category, RenoCategory } from "@/domain/directory";

/** Whether a guide is open, and the page it opens on. Shared so any part of the app can open it at a page. */
function makeGuide() {
  return reactive({
    open: false,
    page: 0,
    show(page = 0) {
      this.page = page;
      this.open = true;
    },
    close() {
      this.open = false;
    },
  });
}

/** A directory: whether it is open, and which list it shows. */
function makeDirectory<C extends string>(first: C) {
  return reactive({
    open: false,
    category: first as C,
    show(category: C = first) {
      this.category = category;
      this.open = true;
    },
    close() {
      this.open = false;
    },
  });
}

/** The couples' guide to getting married, and the directory of venues and vendors. */
export const guide = makeGuide();
export const directory = makeDirectory<Category>("hotel");

/** The renovation guide, and the directory of design firms and furniture stores. */
export const renoGuide = makeGuide();
export const renoDirectory = makeDirectory<RenoCategory>("firm");
