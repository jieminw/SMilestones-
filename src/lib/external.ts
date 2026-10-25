/**
 * Open a link that leaves the app. Normal browsers open it in a new tab. Some embedded browsers (an editor's preview
 * pane, for one) silently block new tabs, so a link does nothing. When the new tab is blocked, open the link in this
 * tab instead. Attach to a container with `@click="openExternal"` and it handles every `target="_blank"` link inside.
 */
export function openExternal(e: MouseEvent) {
  const a = (e.target as HTMLElement | null)?.closest?.("a[target='_blank']") as HTMLAnchorElement | null;
  if (!a || !a.href || e.defaultPrevented) return;
  // let ctrl, cmd and middle clicks do what the browser normally does
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const w = window.open(a.href, "_blank");
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* cross-origin: nothing to do */
    }
  } else {
    window.location.href = a.href;
  }
}
