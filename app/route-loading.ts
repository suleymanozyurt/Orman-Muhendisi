/** Hover, keyboard focus and pointer-down share one import; a failed warm-up can retry. */
export function reusableImport<T>(importer: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () => pending ||= importer().catch(cause => { pending = undefined; throw cause; });
}
export function allowRouteWarmup(connection?: { saveData?: boolean; effectiveType?: string }) {
  return !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType || "");
}

/** Prepare one section per idle slot; foreground work and cancellation take priority. */
export function prepareRoutes(loaders: Array<() => Promise<unknown>>, idle: (work: () => void) => () => void, allowed: () => boolean) {
  let cancelled = false, cancelIdle = () => {};
  const next = () => {
    if (cancelled || !loaders.length || !allowed()) return;
    cancelIdle = idle(() => {
      if (cancelled || !allowed()) return;
      const load = loaders.shift();
      if (load) void load().catch(() => {}).finally(next);
    });
  };
  next();
  return () => { cancelled = true; cancelIdle(); };
}
