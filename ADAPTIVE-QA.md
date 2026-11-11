# Adaptive application verification

Updated: 2026-10-06. This is an implementation checkpoint, not release approval.

## Implemented in this checkpoint

- Shared semantic color, spacing, type, elevation and motion tokens.
- Named containers for discovery, taxonomy cards, map/list workspaces, care and health panels.
- Compact navigation and full-screen search on narrow windows; larger workspaces use split panels.
- Capability-aware hover, coarse-pointer touch targets, visual-viewport-aware search suggestions and safe-area spacing.
- Reduced-motion, contrast and reduced-transparency fallbacks.
- Heavy discovery, taxonomy, care, maps and assistant modules load separately; the unopened assistant is deferred.
- WebP photo variants with source-size limits, native image dimensions and original-image fallback.
- Standalone manifest, PNG and maskable icons, Apple touch icon, offline field notebook and opt-in service-worker updates.
- Personal API responses and navigation HTML are excluded from service-worker caches.
- LCP, INP and CLS diagnostics are held only in page memory, with no tracking request.
- Global search supports species, families, genera and other living-world ranks. Archive suggestions appear independently of external-source latency, with stable keyboard selection.
- Installation events are captured in the application shell and remain available when settings are opened later.
- Base text contrast and form-field boundaries use stronger semantic tokens; required searchable fields expose a visible validation explanation.
- The initial HTML language matches the server-rendered interface; an unknown country uses the device-language fallback. HTML responses add baseline MIME-sniffing, referrer and embedded-object policies.

## Verified locally

- Clean production build and Cloudflare ESM Worker artifact validation passed.
- Previous saved checkpoint: `npm test` passed 144 tests in 26 files, including server-rendered deep links, taxonomy traversal, navigation continuity, observations, map search, care, social archive imports, photo restoration batches, original-video restoration and PWA behavior. This continuation runs the complete production build and test suite again before publication; its result is reported with the deployment.
- PWA behavior tests confirm offline navigation fallback, exclusion of personal APIs, user-triggered update activation and retention of previous-version assets.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Shared primary and secondary text tokens were checked against their light and dark base surfaces using WCAG contrast calculations. This is a token-level check, not a complete rendered WCAG audit.
- Manifest PNG dimensions match every declared icon size.
- Previous saved checkpoint: home server rendering returned HTTP 200; its initial script references and static dependency closure totaled 172.3 KiB gzip across 18 modules. Every verified build enforces a 200 KiB gzip budget. These are build measurements, not LCP/INP scores or real-network transfer measurements.

## Browser continuation, 2026-10-05

- The managed preview was opened in desktop Chrome at 1363 by 936 pixels. Home, discovery, flora catalog and care navigation were exercised; discovery and care rendered their section headings. The unsigned preview does not establish availability of authenticated feed data.
- A catalog history entry at 941 pixels returned to the same reading position after navigation away and browser Back. Reload also restored exactly 941 pixels. Tests waited for the catalog and scroll movement to settle before comparing positions.
- Desktop navigation remains visible while scrolling; it no longer changes the workspace width or removes the direct catalog link. The observed desktop page had no horizontal overflow.
- The HTTP preview exposed a missing `crypto.randomUUID` capability that crashed the shell. Client identifiers now use native UUIDs when available and the same cryptographic entropy source with UUIDv4 formatting otherwise. The preview opens after this correction; targeted identifier and navigation tests passed.
- A failed feature surface has a retry message while the main navigation remains outside the error boundary. Preference reads tolerate unavailable browser storage.
- Photo albums reset position and viewer state when their source changes. Button navigation selects immediately, ordinary vertical gestures remain scroll gestures, and zoomed viewports do not turn image panning into a slide change. Physical touch, zoom and full-photo interaction have not been tested on real devices.
- This is a desktop functional check. Responsive viewport coverage, screen-reader use, physical devices, installed PWA behavior and measured interaction latency remain outstanding.

## White-background revision, 2026-10-06

- The initial theme defaults to light, even on dark-mode devices, unless the visitor explicitly chose a different theme. The light theme uses a pure white page canvas across the shared application shell. Secondary control surfaces retain their own token, so changing the page canvas does not remove selected-state feedback.
- Offline startup, the field notebook, the installed-app launch background and the light browser theme color use the same white background. The existing explicit dark-theme option remains available.

## Required before release approval

- Browser interaction and layout regression checks across narrow windows, tablet split screen, portrait/landscape, desktop and ultra-wide layouts.
- Real iPhone, Android and tablet checks; Safari, Chrome, Edge and Firefox compatibility.
- Keyboard and screen-reader checks, measured contrast, 200% text enlargement and WCAG 2.2 AA review.
- Installed PWA and service-worker upgrade verification on real browsers/devices.
- Measured LCP, INP and CLS under constrained CPU and network conditions.
- Full security, identity-provider and live-data integration review. Passing local tests does not establish production service availability or scientific completeness for every taxon.

## Current blockers

- The source repository connection was restored on 2026-10-03. Publication status is verified separately using the native Sites deployment record; local tests do not establish deployment status.
- The private Facebook export transfer was stopped by automatic approval review pending explicit authorization for that archive and destination. The 5,378-record import file is prepared and validated; production import completion is unverified. The temporary restoration secret was removed from runtime configuration and the next deployment applies that removal.

## Completion checkpoint additions

- The observation composer is shared by the online application and its offline entry bundle. Compressed photo files and metadata are stored in IndexedDB; the owner can reopen, edit, send or delete a device draft. Guest drafts may be attached only when explicitly opened by the signed-in user.
- Drafts autosave, and internal navigation waits for an open journal to save. Incomplete local form values remain editable; publication validates dates and coordinates strictly. An empty saved draft is removed when its content is cleared.
- A maximum of three photo uploads run concurrently. Acknowledged upload keys are checkpointed; retries reuse those keys and a stable observation ID. Edited retries update the same record atomically; changes to a published record require review again.
- Sourced plant, animal and fungal species can be linked to observations. Family and genus identifiers cannot masquerade as species. The public community projection contains only approved records and does not expose private drafts or review notes.
- Exact imported flora profiles render in the first HTML response, including a restorable selected information tab. Species and taxonomy pages include canonical identity, source identifiers and escaped Taxon/Breadcrumb structured data. Indexing remains off for the current private Site.
- Source availability is visible separately from scientific verification. A sourced non-endemic value is retained; missing anatomy is not inferred from a parent, sibling or similar species.
- Unconfigured sign-in providers are explicitly disabled; no availability date is promised. The working dispatch-owned ChatGPT session and sign-out remain in place.
- Full-resolution photo viewer images load only when the viewer is opened. Large albums expose at most seven position buttons. Native bitmap decoding has an image-element fallback.
- Cross-origin API writes are rejected, HTML is not shared-cached, orphaned unpublished photo objects do not become public, and public sitemap opt-in cannot be spoofed through a request header.
- At the previous saved checkpoint, the offline application was a separate 84.25 KiB gzip bundle, outside the initial home-script budget; installation precaches its code and styles. This measurement does not prove browser installation or IndexedDB durability.

## Interaction and social archive checkpoint

- Likes, saves and follows display the intended selection before the network response. Independent items remain usable; duplicate requests for the same pending selection are blocked. Failed writes restore only that item's state. Background refresh overlays pending selections instead of erasing them.
- Like/save writes accept an explicit desired state so repeated requests cannot toggle a confirmed selection backwards. Follow rollback also restores that person's previously visible observation without replacing another person's follow.
- Hover, keyboard focus and pointer-down can prepare the chosen route using the same lazy module promise as navigation. Failed preparation can retry; optional preparation is skipped for data-saving and very slow connections. Navigation gives immediate selection and progress feedback without requiring every feature module in the initial bundle.
- The inactive feed does not reconcile its cards on unrelated parent changes. Press feedback uses a shared 70 ms token and retains reduced-motion fallbacks.
- Comment submission preserves the original text on failure, blocks duplicate submits per thread, and reuses its client receipt after an uncertain response. Server retries create one owned comment, reject conflicting receipt reuse and exclude another user's private observations.
- Browser-history entries retain independent reading positions. Returning to a long lazy-loaded feed waits for content before restoring; a new touch, wheel or navigation key cancels restoration. Search refinements and tabs within the same content retain focus and scroll instead of jumping to the page heading. A new taxon or content page starts a new reading context.
- Photo albums discriminate horizontal swipes from ordinary vertical scrolling and multi-touch gestures. Social albums also support arrow keys. Video covers come from the original video frame, retain their aspect ratio and do not connect to an external player before playback is requested.
- The new social archive supports on-site text, image albums, video playback, platform/content filters, search, pagination, shared deep links and a home-feed preview. Video providers are contacted only when playback is requested.
- Administrative import reads Instagram/Facebook post JSON, X tweet export assignments as JSON data without executing JavaScript, and a common format for other sources. Images are matched to their exact archive paths, resized and uploaded in bounded batches; existing edited records are never overwritten by a repeat import.
- Imported posts remain private drafts until reviewed and published. Missing media prevents publication; private messages, contact/follower lists and reposts are excluded. Private image paths and ownership identifiers are omitted from the public projection.
- The authorized Facebook Page export has a separate temporary, server-secret restoration path. Original media receive checksum-derived keys and a fixed source identity, never a fabricated visitor identity. Videos above 8 MiB use resumable 8 MiB parts; the whole-file checksum is verified before the upload is registered. The endpoint is unavailable without its temporary secret. Repeat imports may enrich only untouched source drafts, preserve edits and published records, and publish only records with complete media.
- Photo restoration batches contain at most 40 verified objects and 8 MiB. Every object's size, type, checksum and ownership is checked before writing; at most four object writes run together. A client checkpoint is saved only after both photo sizes are acknowledged. Video transfers run at most three at a time, with each direct request or part bounded to 8 MiB.
- Production restoration exposed the shared Worker request cap rejecting valid video parts before importer authorization. The restoration route has a bounded 32 MiB envelope and retains its narrower authenticated body checks; other API routes retain their 4 MB envelope. The real Worker regression checks cover both boundaries and the disabled-importer response.
- Account upload can continue online if IndexedDB storage is blocked or full. The editor then states that no device backup was saved and keeps the current files available for a retry; it does not promise an offline backup that failed.

## Remaining external requirements

- Live configuration readback on 2026-10-03 found no runtime API keys and no `site_settings` rows. Google satellite-map service and external generative assistant connections are unconfigured. Existing map and local source-answer fallbacks are separate capabilities.
- Google, Facebook, Apple and Microsoft direct sign-in need a supported platform authentication integration; the current Sites path is dispatch-owned ChatGPT sign-in.
- The original Figma document could not be inspected beyond its root request because the connected Figma tool reached its plan limit. The original PlantPaNet font has not been verified.
- The 10,478-row flora archive is an imported, dated source dataset. It is not a claim that every taxon has a complete, current, independently reviewed morphological account.
- Desktop Chrome navigation has been checked as recorded above. Other browser/device layouts, installed-PWA behavior, IndexedDB quota/eviction and full accessibility audits remain unperformed. Node/SQLite integration tests and service-worker simulations do not substitute for these checks.
- Native social-account integration readback found no connected social network. The available Facebook Page export is dated 2022-10-06 and contains 5,378 normalized records with 4,649 available original media files; 729 referenced files are missing. Only 1,186 records retain an original date and 775 retain a caption. Missing metadata is left empty. These are source-inventory counts, not production-import counts. No complete Instagram, X, YouTube or TikTok export has been restored, and this archive is not an ongoing account synchronization.

## GBIF research and source coverage, 2026-10-06

- Added a lazy-loaded GBIF research workspace with live occurrence search, taxon lookup, country enumeration, year and specimen filters, images, geospatial quality filters, present/absent status and dataset selection.
- Native record and dataset dialogs retain classifications, source identifiers, withheld-information notices, coordinate uncertainty, individual quality flags, publisher, license, DOI and citation. Reused images require permitted individual licenses and attribution.
- List, statistics, dataset facets and map use the same query. GBIF v2 adhoc tiles support the full occurrence filter set; incompatible density filters are not silently dropped. Initial map probes with GEO_CENTROID returned 503. Removing that optional mode produced successful PNG responses for the green hexagonal map; a failed layer is explicitly removed while current-page markers remain available.
- The public occurrence API limits live search to its first 100,000 results. Pagination observes that limit without changing the reported total. CSV exports only the current page (up to 40 records); the full-data link preserves filters and opens GBIF's account-backed DOI download flow.
- Live API probes returned HTTP 200 for occurrence search (40 records), species lookup, all 250 country codes, individual record details and dataset provenance. Counts are fetched at runtime rather than embedded as facts.
- The original TÜBİVES family index was checked again: 174 families and 10,478 taxa exactly match the archived family counts. Original detail verification was checkpointed at 532 distinct taxa, with 518 pages checked in this run and no identity/factual-field conflicts in that run. Upper-rank coverage is incomplete; unspecified ranks remain unspecified. The original hierarchy's reported conflicts are retained.
- The source-check job was stopped before packaging to prevent concurrent writes to the dataset. Raw checked pages are cached for a later continuation; profiles also retain their existing on-demand source checks.
- Browser control timed out during the latest revision, so the new white palette, summary-dialog change and GBIF screen have not received a new rendered browser or physical-device interaction check. The earlier Chrome navigation evidence above applies to v31 only. New filter/provenance/pagination/CSV and contrast checks are automated.
