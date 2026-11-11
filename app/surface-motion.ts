import type { SiteRoute } from "./navigation";

const primary = ["home", "discover", "map", "database"];
export function routeMotion(previous: SiteRoute, next: SiteRoute, returning = false): "none" | "back" | "forward" | "left" | "right" {
  if (previous.view === next.view && previous.entry === next.entry && previous.topic === next.topic && previous.species === next.species && previous.flora === next.flora) return "none";
  if (returning) return "back";
  const from = primary.indexOf(previous.view), to = primary.indexOf(next.view);
  return from >= 0 && to >= 0 && from !== to ? to > from ? "left" : "right" : "forward";
}

// Move only the incoming surface; input stays live throughout the short motion.
export function animateSurface(host: HTMLElement, motion: ReturnType<typeof routeMotion>, reduced: boolean) {
  if (motion === "none" || reduced || typeof host.animate !== "function") return () => {};
  const x = motion === "back" || motion === "right" ? -18 : 18;
  const animation = host.animate([{ transform: `translateX(${x}px)` }, { transform: "translateX(0)" }], { duration: 160, easing: "cubic-bezier(.2,.8,.2,1)" });
  return () => animation.cancel();
}
