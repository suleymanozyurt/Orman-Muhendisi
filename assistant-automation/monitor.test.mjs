import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePolicy, collectDocText, checkDriveRelease, checkWordEvidence, selectLatestReleaseRow, checkSheetCoverage, summarizeTabAccess } from "./checks.mjs";

const policy = JSON.parse(fs.readFileSync(new URL("./policy.json", import.meta.url), "utf8"));
const version = policy.expectedPluginVersion;
const image = i => ({origin:"ChatGPT_image_gen",scientificallyVerified:true,sha256:i.toString(16).padStart(64,"0"),
  effectivePpiX:310,effectivePpiY:310});
const goodWord = () => ({images:[1,2,3,4].map(image),docxSha256:"f".repeat(64),
  zipCrcChecked:true,pageCount:6,renderedPageCount:6,scientificSourcesVerified:true,
  archivedToDrive:false});
const doc = () => ({tabs:[{documentTab:{body:{content:[
  {paragraph:{elements:[{textRun:{content:"P101/P103 v"+version+" canonical release verified"}}]}}
]}}}]});
const sheet = () => [["P101/P103 — Word ve tam sürüm eşitliği","v"+version+" — CANLI GERİ OKUNDU"]];

test("correct policy validated",()=>assert.deepEqual(validatePolicy(policy),[]));
test("incomplete rule count is rejected",()=>assert.ok(validatePolicy({...policy,minimumRuleCount:104}).includes("RULE_COUNT_TOO_LOW")));
test("weakened explicit approval rejected",()=>assert.ok(validatePolicy({...policy,completionPolicy:{...policy.completionPolicy,driveArchiveRequiresExplicitExactShaApproval:false}}).some(x=>x.includes("MISSING_GUARD"))));
test("proper Word manifest accepted as evidence only",()=>assert.deepEqual(checkWordEvidence(goodWord(),policy).errors,[]));
test("fewer than four independent image scenes rejected",()=>{const v=goodWord();v.images=v.images.slice(0,3);assert.ok(checkWordEvidence(v,policy).errors.includes("TOO_FEW_INDEPENDENT_IMAGES"));});
test("duplicate image bytes rejected",()=>{const v=goodWord();v.images[3].sha256=v.images[0].sha256;assert.ok(checkWordEvidence(v,policy).errors.includes("DUPLICATE_IMAGE_HASH"));});
test("image resolution too low rejected",()=>{const v=goodWord();v.images[2].effectivePpiY=299;assert.ok(checkWordEvidence(v,policy).errors.includes("IMAGE_PPI_TOO_LOW"));});
test("wrong image origin rejected",()=>{const v=goodWord();v.images[0].origin="stock";assert.ok(checkWordEvidence(v,policy).errors.includes("IMAGE_ORIGIN_UNVERIFIED"));});
test("missing scientific verification rejected",()=>{const v=goodWord();v.scientificSourcesVerified=false;assert.ok(checkWordEvidence(v,policy).errors.includes("SCIENTIFIC_SOURCES_NOT_VERIFIED"));});
test("CRC and incomplete page render rejected",()=>{const v=goodWord();v.zipCrcChecked=false;v.renderedPageCount=5;const errors=checkWordEvidence(v,policy).errors;assert.ok(errors.includes("DOCX_CRC_NOT_VERIFIED"));assert.ok(errors.includes("PAGES_NOT_FULLY_RENDERED"));});
test("Drive archive with wrong approved SHA rejected",()=>{const v=goodWord();v.archivedToDrive=true;v.explicitApproval=true;v.approvedDocxSha256="a".repeat(64);assert.ok(checkWordEvidence(v,policy).errors.includes("ARCHIVED_WITHOUT_EXACT_SHA_APPROVAL"));});
test("Drive archive with matching exact SHA passes evidence check",()=>{const v=goodWord();v.archivedToDrive=true;v.explicitApproval=true;v.approvedDocxSha256=v.docxSha256;assert.deepEqual(checkWordEvidence(v,policy).errors,[]);});
test("Google Doc tab text extracted",()=>assert.match(collectDocText(doc()),new RegExp("v"+version.replaceAll(".","\\."))));
test("canonical Docs/Sheets release agreement",()=>assert.equal(checkDriveRelease({docText:collectDocText(doc()),sheetRows:sheet(),policy}).ok,true));
test("outdated sheet is detected",()=>assert.ok(checkDriveRelease({docText:collectDocText(doc()),sheetRows:[["P101/P103 — recent","v0.99.95"]],policy}).errors.includes("SHEET_RELEASE_MISMATCH")));
test("missing canonical document is rejected",()=>assert.ok(checkDriveRelease({docText:"",sheetRows:sheet(),policy}).errors.includes("DOC_VERSION_NOT_FOUND")));
test("missing latest release row rejects, does not guess",()=>assert.equal(selectLatestReleaseRow([["Unrelated","v"+version]]),null));
test("last canonical audit release row is used",()=>assert.equal(selectLatestReleaseRow([["P101/P103 prior","v0.99.95"],...sheet()]).version,version));

const tabMeta = () => ({ spreadsheetId:policy.canonicalGoogleSheetId,
  sheets: [...new Set([...policy.driveAccess.requiredSheetTabs,
    ...Array.from({length:9},(_,i)=>"Extra"+i)])].map(title=>({properties:{title}}))});
const tabRows = () => policy.driveAccess.requiredSheetTabs.map(tab=>
  ({range:"'"+tab+"'!A1:AZ1000",values:[[tab,"header"],["test-record"]]}));

test("a service account may only reach the two canonical resources",()=>{
  const v={...policy,driveAccess:{...policy.driveAccess,permittedResourceIds:[...policy.driveAccess.permittedResourceIds,"third-document"]}};
  assert.ok(validatePolicy(v).includes("UNSCOPED_DRIVE_RESOURCE_ACCESS"));
});
test("publishing source data is prohibited by the policy",()=>{
  const v={...policy,driveAccess:{...policy.driveAccess,prohibitPublishingContents:false}};
  assert.ok(validatePolicy(v).includes("DRIVE_DATA_PROTECTION_NOT_ENABLED"));
});
test("untrusted API hosts are blocked",()=>{
  const v={...policy,driveAccess:{...policy.driveAccess,allowedHttpHosts:[...policy.driveAccess.allowedHttpHosts,"unknown.example"]}};
  assert.ok(validatePolicy(v).includes("UNTRUSTED_HTTP_HOST"));
});
test("all required Google Sheets tabs exist",()=>assert.equal(checkSheetCoverage(tabMeta(),policy).ok,true));
test("missing research tab is rejected",()=>{
  const meta=tabMeta();meta.sheets=meta.sheets.filter(x=>x.properties.title!=="ArastirmaHavuzu");
  assert.ok(checkSheetCoverage(meta,policy).errors.includes("REQUIRED_SHEET_TABS_MISSING"));
});
test("15 relevant data tabs can be read without disclosing their cell values",()=>{
  const inspected=summarizeTabAccess(tabRows(),policy);
  assert.equal(inspected.ok,true);
  assert.equal(inspected.accessedTabs,policy.driveAccess.requiredSheetTabs.length);
  assert.ok(!JSON.stringify(inspected).includes("test-record"));
});
test("missing mandatory rules data fails closed",()=>{
  const rows=tabRows().filter(x=>!x.range.includes("OrtakKurallar"));
  assert.ok(summarizeTabAccess(rows,policy).errors.includes("TAB_DATA_UNAVAILABLE_OrtakKurallar"));
});
test("books folder and unrelated Drive files remain out of scope",()=>{
  assert.equal(policy.driveAccess.allowBookArchiveAccess,false);
  assert.equal(policy.driveAccess.permittedResourceIds.length,2);
});
