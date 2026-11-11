import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "app/i18n.tsx"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('from "react"', `from ${JSON.stringify(pathToFileURL(resolve(root, "node_modules/react/index.js")).href)}`);
const { translate, translateTree } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("English labels and sourced species descriptions are translated", () => {
  assert.equal(translate("Gözlem ekle", "en"), "Add observation");
  assert.equal(translate("Lübnan sediri", "en"), "Lebanon cedar");
  assert.equal(translate("＋ Gözlem ekle", "en"), "＋ Add observation");
  assert.equal(translate("Gözlem ekle", "tr"), "Gözlem ekle");
});

test("localized option labels preserve persisted filter values", () => {
  const option = translateTree(createElement("option", null, "İğne"), "en");
  assert.equal(option.props.children, "Needle");
  assert.equal(option.props.value, "İğne");
});

test("user-written content is preserved and accessibility labels are translated", () => {
  const content = translateTree(createElement("p", { "data-user-content": true }, "Gözlem"), "en");
  assert.equal(content.props.children, "Gözlem");
  const input = translateTree(createElement("input", { "aria-label": "Ara", placeholder: "Adınızı yazın" }), "en");
  assert.equal(input.props["aria-label"], "Search");
  assert.equal(input.props.placeholder, "Enter your name");
});
