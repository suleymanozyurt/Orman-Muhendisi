const VERSION = /^\d+\.\d+\.\d+$/;
const SHA = /^[a-f0-9]{64}$/i;
export function validatePolicy(p) {
  const failures = [];
  if (p?.assistant !== "ORMAN MÜHENDİSİ ASİSTANI") failures.push("WRONG_ASSISTANT");
  if (!VERSION.test(String(p?.expectedPluginVersion ?? ""))) failures.push("INVALID_VERSION");
  if (!Number.isInteger(p?.minimumRuleCount) || p.minimumRuleCount < 105) failures.push("RULE_COUNT_TOO_LOW");
  if (!/^[\w-]{12,}$/.test(p?.canonicalGoogleDocId ?? "")) failures.push("DOC_ID_MISSING");
  if (!/^[\w-]{12,}$/.test(p?.canonicalGoogleSheetId ?? "")) failures.push("SHEET_ID_MISSING");
  const q = p?.completionPolicy ?? {};
  if (!Number.isInteger(q.minimumIndependentNativeImages) || q.minimumIndependentNativeImages < 4) failures.push("FOUR_IMAGES_NOT_REQUIRED");
  if (typeof q.minimumEffectivePpi !== "number" || q.minimumEffectivePpi < 300) failures.push("PPI_TOO_LOW");
  for (const key of ["requireDocxZipCrc", "requireAllPagesRendered", "requireSourceVerified", "requireDocxSha256", "driveArchiveRequiresExplicitExactShaApproval"]) {
    if (q[key] !== true) failures.push("MISSING_GUARD_" + key);
  }
  const a = p?.driveAccess ?? {};
  const ids = [p?.canonicalGoogleDocId, p?.canonicalGoogleSheetId];
  if (a.mode !== "service_account_read_only") failures.push("DRIVE_NOT_READ_ONLY");
  if (!Array.isArray(a.permittedResourceIds) || a.permittedResourceIds.length !== 2 ||
      new Set(a.permittedResourceIds).size !== 2 || ids.some(id => !a.permittedResourceIds.includes(id))) failures.push("UNSCOPED_DRIVE_RESOURCE_ACCESS");
  if (a.prohibitPublishingContents !== true || a.allowBookArchiveAccess !== false) failures.push("DRIVE_DATA_PROTECTION_NOT_ENABLED");
  const trustedHosts = ["oauth2.googleapis.com","docs.googleapis.com","sheets.googleapis.com"];
  if (!Array.isArray(a.allowedHttpHosts) || a.allowedHttpHosts.length !== trustedHosts.length ||
      a.allowedHttpHosts.some(host => !trustedHosts.includes(host))) failures.push("UNTRUSTED_HTTP_HOST");
  if (!Number.isInteger(a.metadataTabMinimum) || a.metadataTabMinimum < 24) failures.push("MISSING_SHEET_TAB_BASELINE");
  const mustHave = ["OrtakKurallar","OrtakKayitlar","ArastirmaHavuzu","ArastirmaKuyrugu","ArastirmaGunlugu",
    "IcerikVersiyonlari","SecimGunlugu","SabahRaporlari","TurkiyeFlora","FloraKapsam",
    "FloraKaynaklari","FloraKonuIzleri","OgrenmeDenetimi","KitapEnvanteri","PerformansVerileri"];
  if (!Array.isArray(a.requiredSheetTabs) || new Set(a.requiredSheetTabs).size !== a.requiredSheetTabs.length ||
      mustHave.some(tab => !a.requiredSheetTabs.includes(tab))) failures.push("SHEET_COVERAGE_INCOMPLETE");
  return failures;
}
export function collectDocText(doc) {
  const out = [];
  function visit(node) {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const part of node) visit(part); return; }
    if (typeof node.textRun?.content === "string") out.push(node.textRun.content);
    for (const [k, v] of Object.entries(node)) {
      if (k !== "textRun") visit(v);
    }
  }
  visit(doc?.body?.content ?? []);
  visit(doc?.tabs ?? []);
  return out.join("");
}
export function selectLatestReleaseRow(rows) {
  if (!Array.isArray(rows)) return null;
  // Historical rules are appended; select the LAST explicit canonical release audit row.
  let candidate = null;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const label = String(row[0] ?? "");
    const status = String(row[1] ?? "");
    if (!/P101\/P103|P103.*sürüm|P103.*surum/i.test(label)) continue;
    const match = status.match(/\bv(\d+\.\d+\.\d+)\b/i);
    if (match) candidate = { version: match[1], label, status };
  }
  return candidate;
}
export function checkDriveRelease({docText, sheetRows, policy}) {
  const errors = validatePolicy(policy);
  const latest = selectLatestReleaseRow(sheetRows);
  if (!latest) errors.push("LATEST_RELEASE_ROW_NOT_FOUND");
  else if (latest.version !== policy.expectedPluginVersion) errors.push("SHEET_RELEASE_MISMATCH");
  const v = policy.expectedPluginVersion;
  // Checking only version agreement in explicitly recorded texts, not Plugin Creator live state.
  if (!docText.includes("v" + v)) errors.push("DOC_VERSION_NOT_FOUND");
  if (!docText.includes("P101/P103")) errors.push("DOC_RELEASE_ENTRY_NOT_FOUND");
  return { ok: errors.length === 0, errors, expectedVersion: v,
    sheetVersion: latest?.version ?? null,
    verification: "DOCS_AND_SHEETS_ONLY__LIVE_PLUGIN_NOT_VERIFIED" };
}
export function checkWordEvidence(manifest, policy) {
  const errors = validatePolicy(policy);
  const q = policy.completionPolicy;
  const images = manifest?.images ?? [];
  if (!Array.isArray(images) || images.length < q.minimumIndependentNativeImages) {
    errors.push("TOO_FEW_INDEPENDENT_IMAGES");
  } else {
    const shaList = [];
    for (const img of images) {
      if (img?.origin !== "ChatGPT_image_gen") errors.push("IMAGE_ORIGIN_UNVERIFIED");
      if (img?.scientificallyVerified !== true) errors.push("IMAGE_SCIENCE_NOT_VERIFIED");
      if (!SHA.test(String(img?.sha256 ?? ""))) errors.push("IMAGE_HASH_INVALID");
      else shaList.push(img.sha256.toLowerCase());
      if (!(img?.effectivePpiX >= q.minimumEffectivePpi && img?.effectivePpiY >= q.minimumEffectivePpi)) errors.push("IMAGE_PPI_TOO_LOW");
    }
    if (new Set(shaList).size !== images.length) errors.push("DUPLICATE_IMAGE_HASH");
  }
  if (!SHA.test(String(manifest?.docxSha256 ?? ""))) errors.push("DOCX_SHA_INVALID");
  if (manifest?.zipCrcChecked !== true) errors.push("DOCX_CRC_NOT_VERIFIED");
  if (!Number.isInteger(manifest?.pageCount) || manifest.pageCount <= 0 || manifest?.renderedPageCount !== manifest.pageCount) errors.push("PAGES_NOT_FULLY_RENDERED");
  if (manifest?.scientificSourcesVerified !== true) errors.push("SCIENTIFIC_SOURCES_NOT_VERIFIED");
  if (manifest?.archivedToDrive === true && (manifest?.explicitApproval !== true || manifest?.approvedDocxSha256 !== manifest.docxSha256)) {
    errors.push("ARCHIVED_WITHOUT_EXACT_SHA_APPROVAL");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Check the identity of the only permitted spreadsheet and the existence of
 * approved tabs. Returned diagnostics intentionally contain no cell contents.
 */
export function checkSheetCoverage(spreadsheet, policy) {
  const errors = [];
  if (spreadsheet?.spreadsheetId !== policy.canonicalGoogleSheetId) errors.push("UNEXPECTED_SPREADSHEET_ID");
  const existing = new Set((spreadsheet?.sheets ?? []).map(x => x?.properties?.title).filter(Boolean));
  if (existing.size < policy.driveAccess.metadataTabMinimum) errors.push("SPREADSHEET_TABS_BELOW_BASELINE");
  const missing = policy.driveAccess.requiredSheetTabs.filter(name => !existing.has(name));
  if (missing.length) errors.push("REQUIRED_SHEET_TABS_MISSING");
  return { ok: errors.length === 0, errors, tabCount: existing.size, approvedTabCount: policy.driveAccess.requiredSheetTabs.length,
    missingTabNames: missing };
}
export function summarizeTabAccess(valueRanges, policy) {
  const errors = [];
  const counts = {};
  for (const tab of policy.driveAccess.requiredSheetTabs) {
    const range = (valueRanges ?? []).find(v => {
      const prefix = String(v?.range ?? "").split("!")[0].replace(/^'|'$/g, "").replace(/''/g, "'");
      return prefix === tab;
    });
    if (!range) { errors.push("TAB_DATA_UNAVAILABLE_" + tab); continue; }
    counts[tab] = (range.values ?? []).length;
  }
  if (!(counts.OrtakKurallar > 0)) errors.push("CANONICAL_RULES_TAB_EMPTY");
  return { ok: errors.length === 0, errors, accessedTabs: Object.keys(counts).length,
    tabRowsRead: counts };
}
