export async function inspectAuthorizedSpreadsheet({ sheetId, headers, jsonRequest }) {
  // The caller grants access to precisely one spreadsheet ID. No Drive-wide search.
  if (!/^[A-Za-z0-9_-]{12,}$/.test(sheetId)) throw new Error("INVALID_SPREADSHEET_ID");
  const base = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId);
  const metadata = await jsonRequest(base + "?fields=sheets(properties(title))", { headers });
  const tabs = (metadata.sheets ?? []).map(s => s?.properties?.title).filter(Boolean);
  if (!tabs.length || tabs.length > 100 || !tabs.includes("OrtakKurallar") || !tabs.includes("OgrenmeDenetimi")) {
    throw new Error("CANONICAL_DATA_TABS_MISSING");
  }
  if (new Set(tabs).size !== tabs.length) throw new Error("DUPLICATE_SHEET_TAB");
  const params = new URLSearchParams();
  // Read a bounded sample of each tab to verify the connection without copying data to GitHub.
  for (const title of tabs) params.append("ranges", "'" + title.replaceAll("'", "''") + "'!A1:B10");
  params.set("valueRenderOption", "FORMATTED_VALUE");
  const samples = await jsonRequest(base + "/values:batchGet?" + params.toString(), { headers });
  const ranges = samples.valueRanges ?? [];
  if (ranges.length !== tabs.length) throw new Error("SHEET_TAB_READ_INCOMPLETE");
  const readCounts = ranges.map(r => Array.isArray(r.values) ? r.values.length : 0);
  return { tabCount: tabs.length, tabs: tabs.map((title, i) => ({ title, sampledRows: readCounts[i] })),
    rawRowsStoredInGitHub: false };
}
