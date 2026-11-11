// Builds the self-contained Orman Lens preview page (no server, no keys, sample data only).
// Usage: node scripts/build-lens-preview.mjs                      →  preview/dist/orman-lens-onizleme.html (page fragment)
//        node scripts/build-lens-preview.mjs --document <file>    →  a complete HTML document, e.g. for the Pages preview
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = path => readFile(root + path, "utf8");
const stub = root + "preview/lens/route-components.stub.ts";

const bundle = await build({
  entryPoints: [root + "preview/lens/main.tsx"], bundle: true, write: false, minify: true, format: "iife", target: ["safari16", "chrome110"],
  jsx: "automatic", loader: { ".webp": "dataurl" }, define: { "process.env.NODE_ENV": '"production"' }, legalComments: "none",
  plugins: [{ name: "lens-only", setup(context) { context.onResolve({ filter: /^\.\/route-components$/ }, () => ({ path: stub })); } }],
});
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// The real stylesheets, in the app's cascade order; shared files contribute only their Lens rules.
const lines = (css, pattern) => css.split("\n").filter(line => pattern.test(line)).join("\n");
const frame = `data:image/webp;base64,${(await readFile(root + "public/responsive/canopy-upward-640.webp")).toString("base64")}`;
const styles = [
  await read("preview/lens/preview.css"),
  lines(await read("app/quiet-interface.css"), /^\.action-sheet/),
  lines(await read("app/fast-interactions.css"), /add-menu/),
  await read("app/lens.css"),
  lines(await read("app/atlas-workbench.css"), /lens-/),
  `.preview-shell{--preview-frame:url("${frame}")}`,
].join("\n");

const page = `<title>Orman Lens Önizlemesi</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<style>
${styles}
</style>
<div id="orman-lens"></div>
<script>
${script}
</script>
`;
const flag = process.argv.indexOf("--document"), target = flag > 0 ? process.argv[flag + 1] : "";
if (flag > 0 && !target) throw new Error("--document needs an output file");
const output = target ? path.resolve(target) : root + "preview/dist/orman-lens-onizleme.html";
const document = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#ffffff"><style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>${page}</body></html>`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, target ? document : page);
console.log(`${path.relative(root, output)}  ${(Buffer.byteLength(target ? document : page) / 1024).toFixed(0)} KiB`);
