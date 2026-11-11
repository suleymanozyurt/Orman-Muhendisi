import type { Language } from "./i18n";
import type { LensNextShot } from "./lens-types";

const parts: Record<LensNextShot["part"], [tr: string, en: string]> = {
  leaf: ["Yaprak", "Leaf"],
  "leaf-underside": ["Yaprağın alt yüzü", "Leaf underside"],
  bark: ["Kabuk", "Bark"],
  cone: ["Kozalak", "Cone"],
  flower: ["Çiçek", "Flower"],
  fruit: ["Meyve", "Fruit"],
  bud: ["Tomurcuk", "Bud"],
  habit: ["Genel görünüm", "Whole plant"],
  underside: ["Alt yüz", "Underside"],
  other: ["Başka bir ayrıntı", "Another detail"],
};
/** Short, user-facing name of the organ or view a follow-up frame should show. */
export function lensShotLabel(part: LensNextShot["part"], language: Language) {
  return parts[part][language === "en" ? 1 : 0];
}
