import type { LensShotPart } from "./lens-evidence";
/** Why a species was suggested: only what the photo shows, what it does not show, and the closest look-alike. */
export type LensEvidence = { seen: string[]; notSeen: string[]; lookalike?: { scientificName: string; difference: string } };
/** A second frame that would separate the candidates. Never present when the photo already suffices. */
export type LensNextShot = { part: Exclude<LensShotPart, "none">; reason: string };
export type LensCandidate = {
  predictedName: string; scientificName: string; commonName: string; reason: string;
  taxonId?: string; family?: string; source?: string; evidence?: LensEvidence;
};
export type LensRegion = { label: string; box: [number, number, number, number] };
export type LensReply = {
  provider: "gemini" | "openai" | "plantnet"; subject: "plant" | "fungus" | "animal" | "other" | "unclear";
  summary: string; candidates: LensCandidate[]; taxonomyUnavailable: boolean; regions?: LensRegion[]; nextShot?: LensNextShot;
  /** Set only when the answer did not come from the live identification service; shown in place of the provider line. */
  sample?: string;
};
export type LensAvailability = { available: boolean; provider: "gemini" | "openai" | "plantnet" | null };
export type ObservationPhotoBatch = { id: string; files: File[]; taxon?: { id: string; label: string } };
