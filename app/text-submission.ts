import {clientId} from "./client-id.ts";
/** Retry an uncertain text write with its original id; only one write per thread at a time. */
export class TextSubmissionQueue {
  private pending = new Set<string>();
  private receipts = new Map<string, { text: string; id: string }>();
  async run(thread: string, text: string, commit: (clientId: string) => Promise<unknown>) {
    if (this.pending.has(thread)) return false;
    const old = this.receipts.get(thread), id = old?.text === text ? old.id : clientId();
    this.pending.add(thread);
    this.receipts.set(thread, { text, id });
    try { await commit(id); this.receipts.delete(thread); return true; }
    finally { this.pending.delete(thread); }
  }
}
