/**
 * ÖRNEK VERİ — yalnız önizleme içindir. Bu yanıtlar çekilen fotoğrafı incelemez;
 * arayüzün her durumunu (yeterli kanıt, ikinci kare, belirsiz, boş, hata) göstermek için sabittir.
 */
import type { LensReply } from "../../app/lens-types";
import cedar from "../../public/responsive/species-cedrus-libani-320.webp";
import fir from "../../public/responsive/species-abies-cilicica-320.webp";

export const sampleLabel = "Örnek veri · fotoğrafın incelenmedi";
export const scenarios = [
  { id: "karacam", name: "Karaçam — ikinci kare önerilir" },
  { id: "sedir", name: "Lübnan sediri — kanıt yeterli" },
  { id: "belirsiz", name: "Türü belirsiz gözlem" },
  { id: "bos", name: "Sonuç yok" },
  { id: "ag", name: "Bağlantı kesildi" },
  { id: "giris", name: "Giriş gerekli" },
  { id: "kapali", name: "Tanıma servisi bağlı değil" },
] as const;
export type ScenarioId = (typeof scenarios)[number]["id"];

const search = (name: string) => `https://www.gbif.org/species/search?q=${encodeURIComponent(name)}`;
const base = { provider: "gemini", taxonomyUnavailable: false, sample: sampleLabel } as const;

const pine = (withCone: boolean): LensReply => ({
  ...base, subject: "plant",
  summary: withCone
    ? "Örnek sonuç. İki kare birlikte değerlendirildi: ikili iğne yapraklar, gri ve çatlaklı kabuk ile sapsız, parlak kozalak karaçamla uyumlu."
    : "Örnek sonuç. İkili iğne yapraklı bir çam: iğneler ve kabuk görülüyor, kozalak görülmüyor. Bu kare iki çam türünü ayırmaya yetmiyor.",
  candidates: [
    { predictedName: "Pinus nigra", scientificName: "Pinus nigra", commonName: "Karaçam", taxonId: "ornek-pinus-nigra", source: search("Pinus nigra"),
      reason: withCone ? "İğne, kabuk ve kozalak özellikleri birlikte karaçamı destekliyor." : "İkili, uzun ve sert iğne yapraklar ile gri, derin çatlaklı kabuk karaçamı düşündürüyor.",
      evidence: {
        seen: ["Kısa sürgünde ikili iğne yapraklar", "İğneler uzun, sert ve koyu yeşil", "Gri, derin çatlaklı kabuk", ...(withCone ? ["Sapsız, parlak, sarımsı kahverengi kozalak"] : [])],
        notSeen: withCone ? ["Tomurcuk"] : ["Kozalak", "Tomurcuk"],
        lookalike: { scientificName: "Pinus sylvestris", difference: "Sarıçamda iğneler daha kısa, mavimsi yeşil ve burulmuştur; gövdenin üst kısmında kabuk turuncu-kırmızı ve ince pulludur. Karaçamda üst gövdede bu turuncu-kırmızı renk görülmez." },
      } },
    { predictedName: "Pinus sylvestris", scientificName: "Pinus sylvestris", commonName: "Sarıçam", taxonId: "ornek-pinus-sylvestris", source: search("Pinus sylvestris"),
      reason: withCone ? "İkili iğne yapraklar sarıçamda da bulunur; ancak kozalak sarıçamınki gibi mat ve saplı değil." : "İkili iğne yapraklar sarıçamda da bulunur; ayırt edici üst gövde kabuğu bu karede görülmüyor.",
      evidence: {
        seen: ["Kısa sürgünde ikili iğne yapraklar"],
        notSeen: withCone ? ["Üst gövdede turuncu-kırmızı kabuk"] : ["Üst gövdede turuncu-kırmızı kabuk", "Kozalak"],
        lookalike: { scientificName: "Pinus nigra", difference: "Karaçamda iğneler daha uzun ve serttir; kozalak daha iri, parlak ve sapsızdır." },
      } },
  ],
  ...(withCone ? {} : { nextShot: { part: "cone", reason: "Kozalağın boyu, parlaklığı ve sapı karaçam ile sarıçamı ayırır." } as const }),
});

const cedarReply: LensReply = {
  ...base, subject: "plant",
  summary: "Örnek sonuç. Kısa sürgünlerde demet halinde iğne yapraklar ve dik duran kozalak görülüyor; bu ikisi birlikte sediri destekliyor.",
  candidates: [
    { predictedName: "Cedrus libani", scientificName: "Cedrus libani", commonName: "Lübnan sediri", taxonId: "ornek-cedrus-libani", source: search("Cedrus libani"),
      reason: "İğneler kısa sürgünlerde demet halinde toplanmış; bu diziliş göknarlarda görülmez.",
      evidence: {
        seen: ["Kısa sürgünlerde demet halinde iğne yapraklar", "Dal üzerinde dik duran kozalak"],
        notSeen: ["Gövde kabuğu"],
        lookalike: { scientificName: "Abies cilicica", difference: "Toros göknarında iğneler sürgüne tek tek dizilir ve yassıdır; sedirde kısa sürgünlerde demet halinde toplanır. İki türde de kozalak dik durur, bu yüzden kozalak tek başına ayırmaz." },
      } },
    { predictedName: "Abies cilicica", scientificName: "Abies cilicica", commonName: "Toros göknarı", taxonId: "ornek-abies-cilicica", source: search("Abies cilicica"),
      reason: "Dik duran kozalak göknarlarda da görülür; ancak iğnelerin demet halinde dizilişi göknarla uyuşmuyor.",
      evidence: { seen: ["Dal üzerinde dik duran kozalak"], notSeen: ["Sürgüne tek tek dizilen yassı iğneler"] } },
  ],
};

const unclear: LensReply = {
  ...base, subject: "unclear", candidates: [],
  summary: "Örnek sonuç. Özne uzak ve bulanık; bu kareden tür önermek doğru olmaz.",
  nextShot: { part: "leaf", reason: "Tek bir sürgünü ya da yaprağı yakından ve net çek; diziliş ve kenar yapısı görünsün." },
};
const empty: LensReply = { ...base, subject: "other", candidates: [], summary: "Örnek sonuç. Fotoğrafta bitki, mantar ya da hayvan görülmüyor." };

/** The canned answer for a scenario; `frames` is how many frames the request carried. */
export function sampleReply(id: ScenarioId, frames: number): LensReply {
  if (id === "sedir") return cedarReply;
  if (id === "belirsiz") return frames > 1 ? pine(false) : unclear;
  if (id === "bos") return empty;
  return pine(frames > 1);
}
/** Packaged, credited photos for the sample species; others have no source photo. */
export const sampleCovers: Record<string, { url: string; source: string; credit: string; license: string }> = {
  "ornek-cedrus-libani": { url: cedar, source: "https://commons.wikimedia.org/wiki/File:Cedrus_libani_-_L%C3%BCbnan_sediri_02.jpg", credit: "Zeynel Cebeci", license: "CC BY-SA 4.0" },
  "ornek-abies-cilicica": { url: fir, source: "https://commons.wikimedia.org/wiki/File:Abies_cilicica_in_Ehden_cedar_reserve.jpg", credit: "Elie plus", license: "CC BY-SA 3.0" },
};
