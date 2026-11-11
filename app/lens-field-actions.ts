import type {Language} from "./i18n";

const options=[
  {id:"leaf",tr:"Yaprak damarlarını öne çıkar",en:"Bring out leaf veins",instruction:"Make the visible veins of the leaf easier to see with a subtle local contrast and exposure adjustment. Preserve its true color, outline, texture and the number, pattern and position of all existing veins."},
  {id:"bark",tr:"Kabuk dokusunu belirginleştir",en:"Show bark detail",instruction:"Use gentle contrast and sharpness to reveal the bark texture and fissures that are already visible. Preserve their original patterns, actual color and physical features."},
  {id:"cone",tr:"Kozalağı kadraja al",en:"Frame the cone",instruction:"Crop and center the existing cone with a little context on each side. Do not create a cone if none is visible. Preserve the orientation, visible scales, shape and colors."},
  {id:"shade",tr:"Gölgelerdeki ayrıntıyı aç",en:"Reveal shadow detail",instruction:"Gently brighten the existing shadow detail with a natural tonal correction. Preserve highlights, actual colors and all photographic features. Avoid adding any new detail."},
  {id:"field",tr:"Sunum için dikey kadrajla",en:"Crop for a vertical slide",instruction:"Make a presentation crop close to 4:5, centered on the most prominent visible natural subject, with a little habitat context. Use only pixels of the original composition, without extending the image or adding text."},
  {id:"level",tr:"Ufuk çizgisini düzelt",en:"Straighten the horizon",instruction:"Correct the tilt only if a clear horizon or reference is visible. Crop the edges as needed; retain the original landscape features and colors."},
] as const;
export type LensFieldAction=(typeof options)[number]["id"];
export function lensFieldActions(language:Language) {
  return options.map(item=>({id:item.id,label:item[language==="en"?"en":"tr"]}));
}
export function lensFieldPrompt(label:string,language:Language) {
  return options.find(item=>item[language==="en"?"en":"tr"]===label.trim())?.instruction || label.trim();
}
