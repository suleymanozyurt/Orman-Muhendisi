import { createRoot } from "react-dom/client";
import { useState } from "react";
import ObservationComposer from "./observation-composer";
import { fieldOwner } from "./field-storage";
import { plants } from "./plant-data";
import { resolveTheme } from "./theme";
import type { Language } from "./i18n";
import "./field-notebook.css";
import "./offline-shell.css";
import "./social-sharing.css";

let language: Language = navigator.language.startsWith("tr") ? "tr" : "en";
try {
  const choice = localStorage.getItem("om.theme"), preference = localStorage.getItem("om.fieldLanguage");
  document.documentElement.dataset.theme = resolveTheme(choice === "light" || choice === "dark" || choice === "system" ? choice : "light", matchMedia("(prefers-color-scheme:dark)").matches);
  if (preference === "tr" || preference === "en") language = preference;
} catch { /* System and device preferences remain usable. */ }
document.documentElement.lang = language;
function OfflineFieldNotebook() {
  const [locale, setLocale] = useState<Language>(language);
  const t = (tr: string, en: string) => locale === "en" ? en : tr;
  const owner = fieldOwner();
  return <div className="offline-shell connected-design">
    <header><a href="/?view=home"><img src="/brand/orman-emblem.png" alt="" width="34" height="44" /><span>Orman Mühendisi<small>{t("Bitkinin sosyal hali", "The social side of plants")}</small></span></a><label className="offline-language"><span className="sr-only">{t("Dil", "Language")}</span><select value={locale} onChange={event => { const next = event.target.value as Language; document.documentElement.lang = next; setLocale(next); try { localStorage.setItem("om.fieldLanguage", next); } catch { /* Preference only. */ } }}><option value="tr">Türkçe</option><option value="en">English</option></select></label></header>
    <main><div className="offline-context"><span>{t("Bağlantı olmadan da kaydet", "Keep recording without a connection")}</span><p>{t("Fotoğraflar ve notlar bu cihazda kalır. Bağlantı geldiğinde hesabına gönderip paylaşabilirsin.", "Photos and notes stay on this device. Send to your account and share when connected.")}</p></div>
      <ObservationComposer language={locale} plants={plants} initialPlant="" initialDraftId={new URL(location.href).searchParams.get("deviceDraft") || undefined} owner={owner} offlineOnly onSaved={() => {}} />
    </main><footer><a href="/?view=home">{t("Siteye dön / bağlantıyı yeniden dene", "Return to the site / retry connection")}</a></footer>
  </div>;
}
const root = document.getElementById("offline-app");
if (root) createRoot(root).render(<OfflineFieldNotebook />);
