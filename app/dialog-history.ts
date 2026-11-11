type HistoryState = Record<string, unknown>;
type Layer = { id: string; href: string; page?: string; close: () => void };
export type DialogHistoryHost = {
  state: () => unknown;
  href: () => string;
  push: (state: HistoryState) => void;
  replace: (state: HistoryState) => void;
  back: () => void;
};
const stateObject = (state: unknown): HistoryState => state && typeof state === "object" ? state as HistoryState : {};
const pageId = (state: unknown) => (state as {omNavigation?: {id?: string}} | null)?.omNavigation?.id;
export function dialogEntry(state: unknown): string | undefined {
  const id = (state as {omDialog?: unknown} | null)?.omDialog;
  return typeof id === "string" && /^dialog-\d+$/.test(id) ? id : undefined;
}
export function withoutDialogEntry(state: unknown): HistoryState {
  const result = {...stateObject(state)};
  delete result.omDialog;
  return result;
}

// A modal is one temporary history entry. Back dismisses it before leaving its page.
export class DialogHistory {
  private layer?: Layer;
  private returning?: Omit<Layer, "close">;
  private host: DialogHistoryHost;
  constructor(host: DialogHistoryHost) { this.host=host; }
  open(id: string, close: () => void) {
    if (this.layer?.id === id) return;
    const previous = this.layer;
    const layer = {id, href:this.host.href(), page:pageId(this.host.state()), close};
    this.layer = layer;
    const state = {...withoutDialogEntry(this.host.state()), omDialog:id};
    if (dialogEntry(this.host.state())) this.host.replace(state);
    else this.host.push(state);
    // Switching from a menu to search uses the same layer, without a second Back step.
    previous?.close();
  }
  closed(id: string) {
    if (this.layer?.id !== id) return;
    const layer = this.layer;
    this.layer = undefined;
    if (dialogEntry(this.host.state()) === id && this.host.href() === layer.href) {
      this.returning = {id:layer.id, href:layer.href, page:layer.page};
      this.host.back();
    } else if (dialogEntry(this.host.state()) === id) {
      // Keep a filter that changed the URL while its options were open.
      this.host.replace(withoutDialogEntry(this.host.state()));
    }
  }
  pop(): boolean {
    const marker = dialogEntry(this.host.state());
    if (this.layer && marker !== this.layer.id) {
      const layer = this.layer;
      this.layer = undefined;
      layer.close();
      const samePage = layer.href === this.host.href() && layer.page === pageId(this.host.state());
      if (marker) this.host.replace(withoutDialogEntry(this.host.state()));
      return samePage;
    }
    if (this.returning) {
      const layer = this.returning;
      this.returning = undefined;
      if (marker) this.host.replace(withoutDialogEntry(this.host.state()));
      return layer.href === this.host.href() && layer.page === pageId(this.host.state());
    }
    // Forward may reach a dismissed modal entry. It must never trap the visitor.
    if (marker && !this.layer) this.host.replace(withoutDialogEntry(this.host.state()));
    return false;
  }
}
