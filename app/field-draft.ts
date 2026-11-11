import { previewUrl, type LinkPreview } from "./link-preview.ts";
export type FieldPhoto = { id: string; name: string; type: string; organ: string; size: number; uploadedKey?: string };
export type FieldDraft = {
  id: string; owner: string; updatedAt: string; text: string; plantId: string; taxonLabel?: string; observedAt: string;
  linkUrl?: string; linkPreview?: LinkPreview; dismissedLink?: string;
  share: boolean; position: { latitude: string; longitude: string }; photos: FieldPhoto[];
  clientId: string; signature: string;
};
export type FieldFile = { draftId: string; id: string; blob: Blob };
export const fieldDraftLimit = 100;

export function fieldSignature(draft: Pick<FieldDraft, "text" | "plantId" | "observedAt" | "share" | "position" | "photos" | "linkUrl" | "linkPreview" | "dismissedLink">) {
  return JSON.stringify([draft.text, draft.plantId, draft.observedAt, draft.share, draft.position,
    draft.photos.map(p => [p.id, p.organ]), draft.linkUrl || "", draft.linkPreview || null, draft.dismissedLink || ""]);
}

export function validateFieldDraft(draft: FieldDraft, allowIncomplete = false) {
  if (!draft.id || !draft.owner || draft.text.length > 1500 || draft.photos.length > fieldDraftLimit ||
      new Set(draft.photos.map(p => p.id)).size !== draft.photos.length) throw new Error("INVALID_DRAFT");
  if (!draft.text.trim() && !draft.photos.length && !draft.linkUrl) throw new Error("EMPTY_DRAFT");
  if (!allowIncomplete && draft.linkUrl && !previewUrl(draft.linkUrl)) throw new Error("INVALID_LINK");
  const { latitude, longitude } = draft.position;
  if (!allowIncomplete && (latitude || longitude) && (!latitude || !longitude || !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude)) || Math.abs(Number(latitude)) > 90 || Math.abs(Number(longitude)) > 180)) {
    throw new Error("INVALID_LOCATION");
  }
  const observed = new Date(draft.observedAt);
  if (!allowIncomplete && (!/^\d{4}-\d{2}-\d{2}$/.test(draft.observedAt) || !Number.isFinite(observed.getTime()) ||
      observed.toISOString().slice(0, 10) !== draft.observedAt)) throw new Error("INVALID_DATE");
  if (draft.photos.some(p => !p.id || p.size < 1 || p.size > 1_500_000 ||
      !["image/jpeg", "image/png", "image/webp"].includes(p.type))) throw new Error("INVALID_PHOTO");
}

export class FieldUploadError extends Error {
  deviceSaved = false;
  constructor(public code: "AUTH_REQUIRED" | "OFFLINE" | "UPLOAD_FAILED" | "SAVE_FAILED", public status = 0) { super(code); }
}

/** Upload checkpoints make retries safe after a connection loss or app restart. */
export async function publishFieldDraft(draft: FieldDraft, readFile: (id: string) => Promise<Blob>, options: {
  fetcher?: typeof fetch; onCheckpoint?: (draft: FieldDraft) => Promise<void>; onProgress?: (completed: number) => void;
} = {}) {
  validateFieldDraft(draft);
  const fetcher = options.fetcher || fetch;
  const current: FieldDraft = { ...draft, photos: draft.photos.map(p => ({ ...p })) };
  let cursor = 0, completed = 0, failed = false;
  const outcomes = await Promise.allSettled(Array.from({ length: Math.min(3, current.photos.length) }, async () => {
    try {
      while (!failed && cursor < current.photos.length) {
        const photo = current.photos[cursor++];
        if (!photo.uploadedKey) {
          const body = new FormData(); body.append("file", await readFile(photo.id), photo.name);
          let response: Response;
          try { response = await fetcher("/api/upload", { method: "POST", body }); }
          catch { throw new FieldUploadError("OFFLINE"); }
          if (!response.ok) throw new FieldUploadError(response.status === 401 ? "AUTH_REQUIRED" : "UPLOAD_FAILED", response.status);
          let result: { key?: string };
          try { result = await response.json(); } catch { throw new FieldUploadError("UPLOAD_FAILED"); }
          if (!result.key || !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(result.key)) throw new FieldUploadError("UPLOAD_FAILED");
          photo.uploadedKey = result.key;
          await options.onCheckpoint?.({ ...current, photos: current.photos.map(p => ({ ...p })) });
        }
        options.onProgress?.(++completed);
      }
    } catch (error) { failed = true; throw error; }
  }));
  const failure = outcomes.find(r => r.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  let response: Response;
  try {
    response = await fetcher("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      action: "create-post", clientId: current.clientId, text: current.text, plantId: current.plantId,
      observedAt: current.observedAt, share: current.share, linkUrl: current.linkUrl || "",
      position: current.position.latitude ? { latitude: Number(current.position.latitude), longitude: Number(current.position.longitude) } : null,
      photos: current.photos.map(p => ({ key: p.uploadedKey, organ: p.organ })),
    }) });
  } catch { throw new FieldUploadError("OFFLINE"); }
  if (!response.ok) throw new FieldUploadError(response.status === 401 ? "AUTH_REQUIRED" : "SAVE_FAILED", response.status);
  let result: { id?: string; status?: string };
  try { result = await response.json(); } catch { throw new FieldUploadError("SAVE_FAILED"); }
  if (!result || typeof result !== "object" || result.id !== current.clientId || !["draft", "pending", "approved"].includes(result.status || "")) throw new FieldUploadError("SAVE_FAILED");
  return result as { id: string; status: string };
}

/** Device storage is a safety copy, not a prerequisite for an online account save. */
export async function submitFieldDraft(draft: FieldDraft, readFile: (id: string) => Promise<Blob>, options: {
  backup: (draft: FieldDraft, initial: boolean) => Promise<void>;
  fetcher?: typeof fetch; onCheckpoint?: (draft: FieldDraft) => Promise<void>;
  onProgress?: (completed: number) => void; onBackupUnavailable?: () => void;
}) {
  validateFieldDraft(draft);
  let deviceSaved = false, backupAvailable = true;
  try { await options.backup(draft, true); deviceSaved = true; }
  catch { backupAvailable = false; options.onBackupUnavailable?.(); }
  try {
    return await publishFieldDraft(draft, readFile, { fetcher: options.fetcher, onProgress: options.onProgress,
      onCheckpoint: async current => {
        await options.onCheckpoint?.(current);
        if (backupAvailable) {
          try { await options.backup(current, false); }
          catch { backupAvailable = false; options.onBackupUnavailable?.(); }
        }
      },
    });
  } catch (cause) {
    if (cause instanceof FieldUploadError) cause.deviceSaved = deviceSaved;
    throw cause;
  }
}
