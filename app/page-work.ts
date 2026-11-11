// A late response from a page left behind must never alter the next page.
export class PageWork {
  private active?: AbortController;
  start() {
    this.cancel();
    const controller = new AbortController(); this.active = controller;
    return { signal: controller.signal, current: () => this.active === controller && !controller.signal.aborted };
  }
  cancel() { this.active?.abort(); this.active = undefined; }
}
