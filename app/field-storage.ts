import { validateFieldDraft, type FieldDraft, type FieldFile } from "./field-draft";
const databaseName = "orman-field-notebook";
let opening: Promise<IDBDatabase> | undefined;
function database() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("STORAGE_UNAVAILABLE"));
  return opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let expired = false;
    const timeout = setTimeout(() => { expired = true; opening = undefined; reject(new Error("STORAGE_UNAVAILABLE")); }, 6000);
    request.onupgradeneeded = () => {
      const db = request.result;
      const drafts = db.createObjectStore("drafts", { keyPath: "id" }); drafts.createIndex("owner", "owner");
      db.createObjectStore("photos", { keyPath: ["draftId", "id"] });
    };
    request.onerror = () => { clearTimeout(timeout); opening = undefined; reject(request.error); };
    request.onsuccess = () => { clearTimeout(timeout); const db = request.result; if (expired) { db.close(); return; } db.onversionchange = () => { db.close(); opening = undefined; }; resolve(db); };
  });
}
const result = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const completed = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve(); transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("STORAGE_UNAVAILABLE"));
});

export async function listFieldDrafts(owner: string) {
  const db = await database();
  return (await result(db.transaction("drafts").objectStore("drafts").index("owner").getAll(owner)) as FieldDraft[])
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function loadFieldDraft(id: string, owner: string) {
  const db = await database();
  const draft = await result(db.transaction("drafts").objectStore("drafts").get(id)) as FieldDraft | undefined;
  return draft?.owner === owner ? draft : undefined;
}
/** Guest drafts are attached only when the signed-in user explicitly opens one. */
export async function claimGuestFieldDraft(id: string, owner: string) {
  if (owner === "guest") return;
  const db = await database(), transaction = db.transaction("drafts", "readwrite"), done = completed(transaction);
  const drafts = transaction.objectStore("drafts"), request = drafts.get(id);
  request.onsuccess = () => {
    const draft = request.result as FieldDraft | undefined;
    if (draft?.owner === "guest") drafts.put({ ...draft, owner });
  };
  await done;
}
export async function readFieldFile(draftId: string, id: string) {
  const db = await database();
  const file = await result(db.transaction("photos").objectStore("photos").get([draftId, id])) as FieldFile | undefined;
  if (!file?.blob) throw new Error("PHOTO_UNAVAILABLE");
  return file.blob;
}
export async function saveFieldDraft(draft: FieldDraft, files: FieldFile[] = []) {
  validateFieldDraft(draft, true);
  const db = await database(), transaction = db.transaction(["drafts", "photos"], "readwrite"), done = completed(transaction);
  const drafts = transaction.objectStore("drafts"), photos = transaction.objectStore("photos");
  const existing = drafts.get(draft.id);
  existing.onsuccess = () => {
    const old = existing.result as FieldDraft | undefined;
    if (old && old.owner !== draft.owner) { transaction.abort(); return; }
    for (const photo of old?.photos || []) if (!draft.photos.some(p => p.id === photo.id)) photos.delete([draft.id, photo.id]);
    drafts.put(draft);
    for (const file of files) if (file.draftId === draft.id && draft.photos.some(p => p.id === file.id)) photos.put(file);
  };
  await done;
}
export async function deleteFieldDraft(id: string, owner: string) {
  const db = await database(), transaction = db.transaction(["drafts", "photos"], "readwrite"), done = completed(transaction);
  const drafts = transaction.objectStore("drafts"), request = drafts.get(id);
  request.onsuccess = () => {
    const draft = request.result as FieldDraft | undefined;
    if (draft?.owner !== owner) return;
    for (const photo of draft.photos) transaction.objectStore("photos").delete([id, photo.id]);
    drafts.delete(id);
  };
  await done;
}
export function fieldOwner(fallback = "guest") {
  try { return localStorage.getItem("om.fieldOwner") || fallback; } catch { return fallback; }
}
export function rememberFieldOwner(owner: string) { try { localStorage.setItem("om.fieldOwner", owner); } catch { /* No local preference storage. */ } }
