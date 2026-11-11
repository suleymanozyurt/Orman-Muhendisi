import type { Language } from "./i18n";
import { sourceCoverage, type CoverageField } from "./source-coverage";
import { Icon } from "./icons";
export default function SourceCoveragePanel({ language, fields, retrievedAt }: { language: Language; fields: CoverageField[]; retrievedAt?: string }) {
  const t = (tr: string, en: string) => language === "en" ? en : tr, coverage = sourceCoverage(fields), present = coverage.filter(field => field.available);
  const date = retrievedAt ? new Date(retrievedAt) : null;
  return <details className="source-coverage-panel"><summary><Icon name="paper" /><span>{t("Bilgi kapsamı", "Information coverage")}</span><small>{present.length}/{coverage.length} {t("alan kaynakta var", "fields available in sources")}</small></summary>
    <div className="source-coverage-content"><p>{t("Kaynakta bulunan bilgiler aşağıda gösterilir. Eksik alanlar başka bir türün bilgileriyle doldurulmaz.", "Available source fields are shown below. Missing fields are not filled with another species’ information.")}</p>
      <ul>{coverage.map(field => <li key={field.label}><span>{field.label}</span><span>{field.available ? <><Icon name="check" />{t("Kaynakta var", "Available")}</> : t("Bilgi bekliyor", "Awaiting information")}</span>{field.available && field.source && <a href={field.source} target="_blank" rel="noreferrer">{t("Kaynak", "Source")}</a>}</li>)}</ul>
      {date && Number.isFinite(date.getTime()) && <p className="source-coverage-date">{t("Kaynak kaydı alınma tarihi", "Source record retrieved")}: {date.toLocaleDateString(language === "en" ? "en-GB" : "tr-TR")}</p>}
    </div>
  </details>;
}
