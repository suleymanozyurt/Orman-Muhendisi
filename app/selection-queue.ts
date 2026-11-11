export type SelectionKind = "liked" | "saved" | "following";
export class SelectionQueue {
  private pending = new Map<string, { kind: SelectionKind; id: string; selected: boolean }>();
  isPending(kind: SelectionKind, id: string) { return this.pending.has(kind + ":" + id); }
  apply(ids: string[], kind: SelectionKind) {
    const next = new Set(ids);
    for (const intent of this.pending.values()) if (intent.kind === kind) { if (intent.selected) next.add(intent.id); else next.delete(intent.id); }
    return [...next];
  }
  async toggle(kind: SelectionKind, id: string, previous: boolean, options: {
    change: (selected: boolean) => void; commit: (selected: boolean) => Promise<unknown>; failed: (cause: unknown) => void;
  }) {
    const key = kind + ":" + id;
    if (this.pending.has(key)) return false;
    const selected = !previous; this.pending.set(key, { kind, id, selected });
    options.change(selected);
    try { await options.commit(selected); return true; }
    catch (cause) { options.change(previous); options.failed(cause); return false; }
    finally { this.pending.delete(key); }
  }
}
export function selectedIds(ids: string[], id: string, selected: boolean) {
  return selected ? [...new Set([...ids, id])] : ids.filter(value => value !== id);
}
