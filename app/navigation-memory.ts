import type { SiteRoute, View } from "./navigation";

type Visit = { href: string; route: SiteRoute; scroll: number };
export function keepsRouteContext(previous: SiteRoute, next: SiteRoute) {
  return previous.view === next.view &&
    (["species", "flora", "taxon", "entry", "topic", "treeSource", "treeId", "treeVersion"] as const).every(key => previous[key] === next[key]);
}
export const scrollPosition = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
export function entryState(state: unknown, id: string, scroll: number) {
  return { ...(state && typeof state === "object" ? state : {}), om: true, omNavigation: { id, scroll: scrollPosition(scroll) } };
}
export function readEntry(state: unknown): { id?: string; scroll: number } {
  const entry = (state as { omNavigation?: { id?: unknown; scroll?: unknown } } | null)?.omNavigation;
  return { id: typeof entry?.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(entry.id) ? entry.id : undefined, scroll: scrollPosition(entry?.scroll) };
}
// A history entry and a section are different: two species or filters keep their own positions.
export class NavigationMemory {
  private visits = new Map<string, Visit>();
  private sections = new Map<View, Visit>();
  remember(id: string, visit: Visit) {
    const snapshot = { ...visit, route: { ...visit.route }, scroll: scrollPosition(visit.scroll) };
    this.visits.delete(id); this.visits.set(id, snapshot); this.sections.set(visit.route.view, snapshot);
    if (this.visits.size > 100) this.visits.delete(this.visits.keys().next().value!);
  }
  entry(id?: string) { return id ? this.visits.get(id) : undefined; }
  section(view: View) { return this.sections.get(view); }
}

type ScrollHost = {
  available: () => number; scroll: (top: number) => void;
  observe: (check: () => void) => () => void;
  onIntent: (cancel: () => void) => () => void;
  timeout: (finish: () => void) => () => void;
};
// Wait for a lazy/async surface to regain its height; never pull the page after a new gesture.
export function restoreWhenReady(top: number, host: ScrollHost, done: () => void) {
  let stopped = false; const cleanups: (() => void)[] = [];
  const stop = () => { if (stopped) return; stopped = true; cleanups.forEach(cleanup => cleanup()); done(); };
  const check = () => { if (!stopped && host.available() >= top) { host.scroll(top); stop(); } };
  check();
  if (!stopped) {
    cleanups.push(host.observe(check), host.onIntent(stop), host.timeout(() => { if (!stopped) { host.scroll(Math.min(top, host.available())); stop(); } }));
    // Observe may have synchronously completed in a fallback implementation.
    if (stopped) cleanups.forEach(cleanup => cleanup());
  }
  return stop;
}
