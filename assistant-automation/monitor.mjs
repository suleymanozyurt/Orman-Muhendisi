import fs from "node:fs/promises";
import { createSign } from "node:crypto";
import { validatePolicy, checkDriveRelease, collectDocText, checkSheetCoverage, summarizeTabAccess } from "./checks.mjs";

const policy = JSON.parse(await fs.readFile(new URL("./policy.json", import.meta.url), "utf8"));
const failures = validatePolicy(policy);
const result = { status: "BLOCKED", checkedAt: new Date().toISOString(), expectedPluginVersion: policy.expectedPluginVersion,
  livePluginVerified: false, googleDriveAccess: "UNCONFIGURED", warnings: [], errors: [...failures],
  purpose: "Read-only verification of precisely two approved Google Docs/Sheets resources" };

function b64url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}
function jwt(serviceAccount) {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  if (serviceAccount.type !== "service_account" || serviceAccount.token_uri !== tokenUrl ||
      typeof serviceAccount.client_email !== "string" || typeof serviceAccount.private_key !== "string") {
    throw new Error("INVALID_SERVICE_ACCOUNT_CONFIGURATION");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ typ: "JWT", alg: "RS256" });
  const payload = b64url({ iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: tokenUrl, iat: now, exp: now + 300 });
  const toSign = header + "." + payload;
  const signer = createSign("RSA-SHA256");
  signer.update(toSign);
  signer.end();
  return toSign + "." + signer.sign(serviceAccount.private_key).toString("base64url");
}
async function jsonRequest(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error("UPSTREAM_HTTP_" + response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function oauthAccessToken(secret) {
  const serviceAccount = JSON.parse(secret);
  const form = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt(serviceAccount) });
  const token = await jsonRequest("https://oauth2.googleapis.com/token",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  if (typeof token.access_token !== "string") throw new Error("GOOGLE_TOKEN_MISSING");
  return token.access_token;
}
async function run() {
  if (failures.length) return;
  const secret = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  if (!secret) { result.errors.push("MISSING_READ_ONLY_SERVICE_ACCOUNT_SECRET"); return; }
  const token = await oauthAccessToken(secret);
  const headers = { Authorization: "Bearer " + token };
  const docId = encodeURIComponent(policy.canonicalGoogleDocId);
  const sheetId = encodeURIComponent(policy.canonicalGoogleSheetId);
  const sheetRange = encodeURIComponent("OrtakKurallar!A1:B200");
  const sheetBase = "https://sheets.googleapis.com/v4/spreadsheets/" + sheetId;
  // Read only approved tab ranges: never fetch the rest of the user's Drive or
  // print/store private cell values in a GitHub Action or repository artifact.
  const ranges = policy.driveAccess.requiredSheetTabs.map(name =>
    "'" + name.replaceAll("'", "''") + "'!A1:AZ1000");
  const batchQuery = ranges.map(value => "ranges=" + encodeURIComponent(value)).join("&");
  const [doc, sheet, sheetMeta, tabData] = await Promise.all([
    jsonRequest("https://docs.googleapis.com/v1/documents/" + docId + "?includeTabsContent=true", { headers }),
    jsonRequest(sheetBase + "/values/" + sheetRange, { headers }),
    jsonRequest(sheetBase + "?fields=spreadsheetId,sheets(properties(title))", { headers }),
    jsonRequest(sheetBase + "/values:batchGet?" + batchQuery, { headers }),
  ]);
  result.googleDriveAccess = "TWO_CANONICAL_RESOURCES_READ_ONLY";
  // The returned source contents stay only in ephemeral runner memory.
  const checked = checkDriveRelease({ docText: collectDocText(doc), sheetRows: sheet.values ?? [], policy });
  const coverage = checkSheetCoverage(sheetMeta, policy);
  const sampled = summarizeTabAccess(tabData.valueRanges, policy);
  result.errors.push(...checked.errors, ...coverage.errors, ...sampled.errors);
  result.sheetVersion = checked.sheetVersion;
  result.sheetTabCount = coverage.tabCount;
  result.tabReadCount = sampled.accessedTabs;
  result.tabRowsInspected = sampled.tabRowsRead;
  result.readLimit = "FIRST_1000_ROWS_MAX_PER_APPROVED_TAB";
  result.verification = checked.verification;
  result.status = result.errors.length ? "DRIFT_OR_INVALID" : "DOCS_SHEETS_VERIFIED";
  result.warnings.push("The private ChatGPT Plugin Creator live version cannot be verified by this GitHub job.");
}
try {
  await run();
} catch (e) {
  result.status = "BLOCKED";
  // Avoid printing request objects, tokens, keys, IDs of other documents, or upstream response contents.
  const msg = String(e?.message ?? e);
  result.errors.push(msg.startsWith("UPSTREAM_HTTP_") || msg.startsWith("INVALID_") || msg.startsWith("GOOGLE_")
    ? msg : "CONNECTOR_OR_NETWORK_ERROR");
}
console.log(JSON.stringify(result, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    "## ORMAN MÜHENDİSİ ASİSTANI denetimi\n\n" +
    "- Durum: **" + result.status + "**\n" +
    "- Eklenti canlı sürümü: **bu işte doğrulanmadı**\n" +
    "- Google Drive: " + result.googleDriveAccess + "\n" +
    "- Hatalar: " + (result.errors.join("; ") || "yok") + "\n");
}
process.exitCode = result.status === "DOCS_SHEETS_VERIFIED" ? 0 : 1;
