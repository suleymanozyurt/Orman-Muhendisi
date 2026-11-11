// Replace refreshed records without duplicating posts or losing older loaded pages.
export function mergeObservationPage<T extends { id: string; createdAt?: string }>(previous: T[], incoming: T[], options: { refresh?: boolean; complete?: boolean } = {}): T[] {
  const compare = (a: T, b: T) => {
    const first = Date.parse(a.createdAt || ""), second = Date.parse(b.createdAt || "");
    if (Number.isFinite(first) && Number.isFinite(second)) return second - first || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
    if (Number.isFinite(first)) return -1;
    if (Number.isFinite(second)) return 1;
    return 0;
  };
  const ids = new Set(incoming.map(post => post.id));
  const boundary = [...incoming].filter(post => Number.isFinite(Date.parse(post.createdAt || ""))).sort(compare).at(-1);
  const retained = previous.filter(post => {
    if (!options.refresh || ids.has(post.id) || !Number.isFinite(Date.parse(post.createdAt || ""))) return true;
    // A partial page only establishes absence above its oldest record.
    return !options.complete && (!boundary || compare(post, boundary) > 0);
  });
  const records = new Map(retained.map(post => [post.id, post]));
  for (const post of incoming) records.set(post.id, post);
  return [...records.values()].sort(compare);
}
