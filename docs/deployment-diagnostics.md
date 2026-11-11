# Publication diagnosis — 27 October 2026

The responsive redesign and navigation fixes are saved in GitHub. The latest saved Sites version is **60**. It has **not** been successfully published. The live Site still serves the last successful version, 50.

## Reproducible checks

- TypeScript and the production build pass. The final application suite passes all 250 tests.
- `node scripts/verify-worker-runtime.mjs`, run after the production build, checks the compiled Worker in the Cloudflare workerd runtime through Wrangler's pinned Miniflare dependency. Home, taxonomy, observation creation, map and database server documents all return HTTP 200. The new home page content is checked explicitly. This is a server/runtime smoke check; it does not verify browser clicks or hosted authentication.
- Independently, all migrations were applied to a new disposable **local** D1 database using Wrangler 4.92.0. The schema before migration 0017 runs as 59 statements; 0017 runs as 273 statements; 0018's unique index succeeds.
- The local database contains 22,670 taxa, 17,554 species and 176 history records. These are **local diagnostic counts**, not a claim about production import completion.
- The 17,577,073-byte migration 0017 has a maximum statement length of 65,215 bytes. Its total size alone does not establish which hosted limit, if any, caused the failure.
- Earlier desktop and 320/390px browser checks verified primary navigation, menu filtering, section selection and opening the observation form. Browser access was later unavailable; no further browser verification is claimed.

## Exact failed production attempt

- Site: `appgprj_6a66544702f48191bfdbf9fb0a6c86c5`
- Saved version: `appgprj_6a66544702f48191bfdbf9fb0a6c86c5~appgver_9a5413352bb88191bfda53c12bb0985a`
- Version number: 60
- Pushed source: `62e74ca145cf5f72e42fb15afee99276ec3ba25e`
- Deployment: `appgdep_6ae04624b4688191920777363d13f403`
- Failure: `internal error; reference = e_PVSMDp_dfbbc558b8bf44849f7852ae2207d13c`
- Time: 2026-10-27 06:35:30 UTC
- Saved artifact SHA-256: `d941f8061218d88df6bc6ac2e6d6739838c1ef883c549492b8da8974e9301239`
- Saved artifact: 287 files; 43,499,520 bytes after archive normalization.

## Remaining blocker

The available Sites deployment response provides only the internal reference above. Worker request logs do not explain the publication failure. The database tools expose user tables, not the hosted migration journal. Therefore the exact failing deployment phase and migration state remain unverified.

Inspect the service-side deployment trace and hosted migration journal before editing historical migrations. All original SQL, snapshots and journal entries are preserved. No production user records, sharing permissions or hosting provider have been changed. Do not repeat the same failed deployment without a concrete repair or evidence of infrastructure recovery.
