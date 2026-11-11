// Store serialized, completed data only. Pending fetches belong to their request.
export class ResolvedSourceCache<T> {
  private entries = new Map<string, { json: string; bytes: number; until: number }>();
  private bytes = 0;
  private maxBytes: number;
  private maxEntries: number;
  private now: () => number;
  constructor(maxBytes: number, maxEntries: number, now: () => number = Date.now) { this.maxBytes=maxBytes;this.maxEntries=maxEntries;this.now=now; }
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.until <= this.now()) { this.remove(key); return; }
    this.entries.delete(key); this.entries.set(key, entry);
    return JSON.parse(entry.json) as T;
  }
  set(key: string, value: T, ttl: number) {
    if (ttl <= 0 || value && typeof (value as { then?: unknown }).then === "function") return;
    const json = JSON.stringify(value);
    if (json === undefined) return;
    const bytes = new TextEncoder().encode(key + json).byteLength + 128;
    this.remove(key);
    if (bytes > this.maxBytes) return;
    for (const [oldKey, entry] of this.entries) if (entry.until <= this.now()) this.remove(oldKey);
    while (this.entries.size && (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes)) this.remove(this.entries.keys().next().value!);
    this.entries.set(key, { json, bytes, until: this.now() + ttl }); this.bytes += bytes;
  }
  private remove(key: string) {
    const entry = this.entries.get(key);
    if (entry) { this.bytes -= entry.bytes; this.entries.delete(key); }
  }
}
