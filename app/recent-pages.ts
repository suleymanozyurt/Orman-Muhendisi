/** Bounded, in-memory public pages. Expired data is never presented as fresh. */
export class RecentPages<T> {
  private pages = new Map<string, { value: T; at: number }>();
  private limit: number;
  private ttl: number;
  private now: () => number;
  constructor(limit = 24, ttl = 300000, now = () => Date.now()) {
    this.limit = limit; this.ttl = ttl; this.now = now;
  }
  get(key: string): T | undefined {
    const page = this.pages.get(key);
    if (!page) return;
    if (this.now() - page.at >= this.ttl) { this.pages.delete(key); return; }
    this.pages.delete(key); this.pages.set(key, page);
    return page.value;
  }
  set(key: string, value: T) {
    this.pages.delete(key); this.pages.set(key, { value, at: this.now() });
    if (this.pages.size > this.limit) this.pages.delete(this.pages.keys().next().value!);
  }
  delete(key: string) { this.pages.delete(key); }
}
