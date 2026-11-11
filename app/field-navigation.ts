// Only an open composer registers a guard; unopened modules add no work.
let guard: (() => Promise<boolean>) | undefined;
export function registerFieldNavigation(callback: () => Promise<boolean>) {
  guard = callback;
  return () => { if (guard === callback) guard = undefined; };
}
export async function preserveOpenFieldDraft() { return guard ? guard() : true; }
