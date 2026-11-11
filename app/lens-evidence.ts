/** Pure checks for the evidence an identification answer may carry. Shared by the server handler and previews. */
import type { LensEvidence, LensNextShot } from "./lens-types";

/** Organ or view a follow-up frame should show; "none" means the photo is sufficient. */
export const lensShotParts = ["none", "leaf", "leaf-underside", "bark", "cone", "flower", "fruit", "bud", "habit", "underside", "other"] as const;
export type LensShotPart = (typeof lensShotParts)[number];
export const lensBinomial = /^[A-Z][a-z-]+ [a-z][a-z-]+(?: [a-z][a-z-]+)*$/;
const notes = (value: unknown, limit: number) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(item => item && item.length <= 180))].slice(0, limit) : [];
/** Keeps only well-formed evidence; a malformed part is dropped instead of failing the whole answer. */
export function lensEvidence(value: unknown, scientificName = ""): LensEvidence | undefined {
  if (!value || typeof value !== "object") return;
  const row = value as { seen?: unknown; notSeen?: unknown; lookalike?: unknown; difference?: unknown };
  const seen = notes(row.seen, 4), notSeen = notes(row.notSeen, 3).filter(item => !seen.includes(item));
  const name = typeof row.lookalike === "string" ? row.lookalike.trim() : "", difference = typeof row.difference === "string" ? row.difference.trim() : "";
  const lookalike = name !== scientificName && name.length <= 180 && lensBinomial.test(name) && difference && difference.length <= 320 ? { scientificName: name, difference } : undefined;
  if (seen.length || notSeen.length || lookalike) return { seen, notSeen, ...(lookalike ? { lookalike } : {}) };
}
export function lensNextShot(value: unknown): LensNextShot | undefined {
  if (!value || typeof value !== "object") return;
  const { part, reason } = value as { part?: unknown; reason?: unknown };
  if (typeof part !== "string" || part === "none" || !(lensShotParts as readonly string[]).includes(part) || typeof reason !== "string") return;
  const text = reason.trim();
  if (text && text.length <= 320) return { part: part as LensNextShot["part"], reason: text };
}
