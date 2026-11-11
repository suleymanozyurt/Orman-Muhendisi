export type CoverageField = { label: string; value?: unknown; source?: string };
export function sourceCoverage(fields: CoverageField[]) {
  return fields.map(field => {
    const value = field.value;
    const available = Array.isArray(value) ? value.length > 0 : typeof value === "boolean" ? true :
      typeof value === "string" ? Boolean(value.trim()) && !/^(?:-|—|bilinmiyor|belirtilmemiş|bilgi yok|kaynakta (?:bilgi yok|bulunamadı|il kaydı yok|grid kaydı yok)|unknown|not supplied|not available|no data)$/i.test(value.trim()) : value !== undefined && value !== null;
    return { ...field, available };
  });
}
