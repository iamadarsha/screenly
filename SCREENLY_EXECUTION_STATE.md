# SCREENLY Execution State

Last updated: 2026-09-25 (Phase 1, in progress)

## Current phase
**Phase 1 — Foundation, Audit, Identity, Assets** (in progress, not yet gated)

## Environment
- Working dir: `/Users/iamadarsha/Screenly` (was an ungitted Recordly working folder; `git init` run, baseline committed)
- Node v24.14.0 / npm 11.9.0
- Primary target confirmed by operator: a signed-or-unsigned dmg (mac) / exe or nsis installer (win), installable via a GitHub release, built from this Electron + Vite + React 19 codebase.
- GitHub target repo: `iamadarsha/screenly` — created (private) and this history pushed to `main` this session. `gh` CLI is authenticated as `iamadarsha`.
- Bundle/app id chosen: `app.screenly.desktop`.

## Baseline (recorded before any code changes, commit `c285401`)
- `npm install`: not previously run (`node_modules` was empty) — now installed clean.
- `npm run typecheck`: PASS (0 errors)
- `npm run lint` (biome): PASS, 1 pre-existing warning (`src/components/video-editor/dashboard/ProjectThumbnail.tsx:21`, useExhaustiveDependencies) — not touched, not related to rebrand.
- `npm run test` (vitest): 161 files / 1396 tests, ALL PASS after the identity rename below (one test broke transiently mid-rename and was fixed — see Decisions log).
- `npm run test:ui` (playwright) / full `npm run build` (native helpers + electron-builder): **not run this session** — native helper builds (whisper runtime, Windows GPU export, NVIDIA CUDA compositor, cursor monitor) are slow/platform-specific and out of scope for a first identity pass. Must be run before any Phase 1 sign-off that claims "app still launches" / "export works".

## What was actually completed this session (Phase 1, partial)
1. `git init` + baseline commit of the untouched Recordly folder (commit `c285401`), so all rebrand work is reviewable as a diff.
2. Read and internalized the full PRD (`SCREENLY_END_TO_END_PRD_CLAUDE_CODE_PROMPT_v3.md`) and the supplied brand kit (`SCREENLY_Brand_Kit_Concept_2/`: `SCREENLY_Brand_UI_Guidelines.md`, `screenly-design-tokens.json`, `screenly-design-tokens.css`, visual board, 4 ChatGPT concept renders).
3. **Release/packaging identity** (PRD §24) rebranded end to end:
   - `package.json`: name/productName/description/author/homepage/repository/bugs → screenly / iamadarsha/screenly.
   - `electron-builder.json5`: appId → `app.screenly.desktop`, productName → Screenly, protocol scheme `screenly://`, publish target `iamadarsha/screenly`, macOS Info.plist strings (usage descriptions, document type, UTI), Windows executable/shortcut names.
   - `screenly.rb` (renamed from `recordly.rb`): Homebrew cask renamed; `sha256` fields are placeholders (`:no_check`) until a real release exists.
4. **App identity / runtime branding**:
   - `index.html` title + favicon path.
   - `electron/appPaths.ts`: dev userData dir `Recordly-dev` → `Screenly-dev`.
   - `electron/ipc/constants.ts`: `PROJECT_FILE_EXTENSION` → `"screenly"` (with `"recordly"` added to `LEGACY_PROJECT_FILE_EXTENSIONS` so old `.recordly` project files still open — no silent corruption, per PRD §1.4/§25 Phase-1 rule), `ALLOW_RECORDLY_WINDOW_CAPTURE` → `ALLOW_SCREENLY_WINDOW_CAPTURE`, session manifest suffix `.recordly-session.json` → `.screenly-session.json`.
   - Consistently propagated the manifest/trash/media-dir naming rename across every producer/consumer that had it hardcoded a second time outside the constant: `electron/ipc/register/sources.ts`, `electron/ipc/register/recording.ts`, `electron/ipc/recording/library.ts`, `electron/ipc/recording/importRecording.ts`, `electron/ipc/recording/sequenceWebcam.ts`, `electron/ipc/recording/sequenceSource.ts`, plus their tests (`library.test.ts`, `manager.test.ts`, `mediaServer.test.ts`). Full suite re-verified green after this.
   - App icon references (`src/App.tsx`, `src/components/video-editor/dashboard/DashboardSidebar.tsx`, `src/components/auth/RecordlySignInDialog.tsx`) point at new `screenly-*.png` assets.
5. **App icon set generated from the brand kit**, not fabricated from scratch: the brand guideline's "flowing S ribbon + red recording dot" mark was built as a proper SVG (`branding/source-assets/Screenly.svg`) using the exact gradient/colors from `screenly-design-tokens.json`, then rasterized (via macOS QuickLook + Pillow, no external SVG tooling was available) into:
   - `icons/icons/png/{16..1024}.png` (electron-builder Linux source)
   - `icons/icons/mac/icon.icns` (rebuilt via `iconutil`)
   - `icons/icons/win/icon.ico` (multi-size, via Pillow)
   - `public/app-icons/screenly-{16..1024}.png` and `screenlymac-*` variants (renderer/runtime use)
   - Old `recordly-*`/`recordlymac-*` PNGs and `Recordly.svg`/`recordlygeneric.svg` deleted.
6. `.gitignore`: added `.research/` (scratch/reference dir, matches PRD §3.1 convention).
7. Baseline verified again after all changes: typecheck clean, lint clean (same 1 pre-existing warning), **1396/1396 tests pass**.

## What Phase 1 still requires (NOT done — do not claim otherwise)
This is the big remaining piece. `grep -rli recordly` still matches ~180 files. The rest fall into these buckets — see `SCREENLY_UI_INVENTORY.md` for the live list:
- **Must keep** (legal): `LICENSE.md`, `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md` attribution lines, git history. Do not touch.
- **User-facing product strings not yet renamed**: onboarding, settings, editor headings, toasts, dialog titles, empty states — largely untouched. `src/contexts/I18nContext.tsx`, `src/components/video-editor/layout/*`, `src/components/video-editor/dashboard/*`, `TutorialHelp.tsx`, `FeedbackDialog.tsx`, etc. all still say "Recordly" in UI copy.
- **Auth**: `src/lib/auth/recordlyAuth.ts`, `src/components/auth/useRecordlyAuth.ts`, `src/components/auth/RecordlySignInDialog.tsx` — filenames and exported symbol names still say Recordly; the auth *behavior* (OAuth callback scheme, Supabase config) must be understood before renaming, since the protocol scheme was just changed to `screenly://` in electron-builder but `electron/authCallback.ts` and the OAuth redirect handling need to be checked for a hardcoded `recordly://` scheme match — **this was not verified this session and is a likely functional break if left inconsistent.**
- **Cloud share sub-app**: `services/recordly-share/` is an entire separate Cloudflare Worker + web service with "recordly" in its directory name, component names, and probably its own deployed domain/API. Renaming this touches a deployed service, not just local code — needs explicit user sign-off before any rename (this may have a live URL other systems depend on).
- **Design system application**: none of the actual UI has been re-themed with the SCREENLY gradient/tokens yet. `screenly-design-tokens.css` exists in the brand kit folder but is not yet imported into `src/index.css` or `src/App.css`. This is realistically Phase 5 work per the PRD's own phase breakdown, not Phase 1.
- **Full `npm run build` / electron-builder dmg or exe has not been produced.** The user's literal primary target (an installable dmg/exe) does not exist yet — package.json/electron-builder identity is ready for it, but nobody has run `npm run build:mac` / `build:win` end to end since the rename, and native helper builds are untested this session.

## Immediate next actions (recommended order)
1. Verify `electron/authCallback.ts` OAuth scheme matches the new `screenly://` protocol before anything else — this is a functional risk, not cosmetic.
2. Decide with the user: rename `services/recordly-share/` now (if it's not yet deployed / has no external dependents) or leave it for a dedicated pass.
3. Sweep remaining user-facing UI strings (the bucket above) file by file, re-running `npm run test` + `npm run typecheck` after each logical group, not as one giant sed pass.
4. Wire `screenly-design-tokens.css` into the app (still Phase 1 "new SCREENLY theme/token system" per PRD step 16, distinct from the full Phase 5 visual overhaul).
5. Run a real `npm run build:mac` (and `build:win` if on/targeting Windows) to produce the first actual dmg/exe and confirm the icon set + app identity render correctly.
6. Only then: Phase 1 regression gate (full suite + manual smoke of record → edit → export) and mark Phase 1 complete in this file.
