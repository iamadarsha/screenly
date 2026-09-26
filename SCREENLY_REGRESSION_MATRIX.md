# SCREENLY Regression Matrix

## Status as of 2026-09-26, Phase 2 session (Recording Guardian slice)

| Check | Status | Notes |
|---|---|---|
| `npm run typecheck` | ✅ PASS | clean throughout |
| `npm run lint` | ✅ PASS | same 1 pre-existing unrelated warning |
| `npm run test` | ✅ PASS | 163 files / 1415 tests (+19 new: `diskSpace.test.ts`, `guardian.test.ts`) |
| Guardian backend vs. real data | ✅ VERIFIED | `scanForRecoverableRecordings` run against the actual dev userData directory (not a mock), correctly found a planted fake checkpoint |
| Guardian backend vs. a real recording cycle | ✅ VERIFIED | an actual (accidental, warm-start-triggered) recording start/stop happened live during `npm run dev`; checkpoint was written then correctly removed on clean stop, no leftover file |
| Recovery dialog visual rendering | ⬜ NOT VERIFIED | typechecks and reuses an established Dialog pattern from `DashboardDialogs.tsx`, but was not actually screenshotted in a running GUI this session (see execution-state notes on why) |

## Status as of 2026-09-26 (end of previous session)

| Check | Status | Notes |
|---|---|---|
| `npm install` | ✅ PASS | clean install |
| `npm run typecheck` | ✅ PASS | 0 errors, re-verified after every commit this session |
| `npm run lint` (biome) | ✅ PASS | 1 pre-existing warning, unrelated (`ProjectThumbnail.tsx:21`) |
| `npm run test` (vitest) | ✅ PASS | 161 files / 1396 tests, re-verified after every commit this session |
| `npm run i18n:check` | ✅ PASS | locale files structurally consistent across all 11 languages |
| `npm run test:ui` (playwright) | ⬜ NOT RUN | needs a display/UI environment; not attempted this session |
| `npm run build:mac` (full, incl. native helpers + electron-builder dmg) | ✅ PASS | ran successfully **7 times** this session (each time to verify a string-cleanup fix); produces both `Screenly-arm64.dmg` and `Screenly-x64.dmg` |
| `npm run build:win` | ⬜ NOT RUN | no Windows machine available this session |
| App launches | ✅ VERIFIED | launched the actual built `.app`, screenshotted: menu bar reads "Screenly", icon correct, HUD renders |
| Screen recording permission flow | ✅ VERIFIED | triggered a real macOS permission dialog; text correctly said "Screenly" (this is what caught the very first branding bug this session) |
| Record → edit → export smoke flow | ✅ VERIFIED (by operator) | operator used the built app directly: **"features are working but very laggy."** Functional, not blocked — performance is the open issue, tracked in `SCREENLY_EXECUTION_STATE.md`, explicitly deferred by operator instruction |
| Compiled bundle free of old branding | ✅ VERIFIED | `strings app.asar \| grep -c Recordly` reached 0 after 7 build→fix cycles |

## Regressions caught and fixed during this session
1. Renaming `RECORDING_SESSION_MANIFEST_SUFFIX` broke `library.test.ts` because four other files hardcoded the same string independently instead of importing the constant. Fixed by renaming all producers/consumers together.
2. Renaming permission-dialog/export-error copy broke two test assertions (`cloudShare.test.ts`, `modernVideoExporter.fallback.test.ts`) that checked exact old string content. Fixed the assertions to match.
3. Neither regression was caught by `grep` alone before building — both were only found by running the actual test suite / launching the actual app. Same lesson as the branding-string hunt: **verify the compiled/running artifact, not just the source.**

## Known non-blocking issue (not a regression, tracked for later)
Performance: operator reports the running app feels "very laggy" during actual use. Not investigated yet — deferred per explicit operator instruction to finish building phases first. Starting point when picked up: PRD §20, and the `EditorWindow-*.js` chunk that vite consistently flags as >1000kB in every build log this session.

## What must happen before Phase 1 is declared fully complete
1. `npm run build:win` on a Windows machine/CI runner.
2. Decide on code signing / notarization before any public distribution (current dmgs are dev-signed only).
3. Everything else in the "Deliberately NOT done" list in `SCREENLY_EXECUTION_STATE.md` is an explicit scope decision, not a gap to close reflexively — re-check with the operator before doing any of it.
