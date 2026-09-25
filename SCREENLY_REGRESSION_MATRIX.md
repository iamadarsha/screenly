# SCREENLY Regression Matrix

## Status as of 2026-09-25 (Phase 1, partial)

| Check | Status | Notes |
|---|---|---|
| `npm install` | ✅ PASS | clean install, 0 vulnerabilities reported inline |
| `npm run typecheck` | ✅ PASS | 0 errors, before and after identity rename |
| `npm run lint` (biome) | ✅ PASS | 1 pre-existing warning, unrelated to this session's changes (`ProjectThumbnail.tsx:21`) |
| `npm run test` (vitest) | ✅ PASS | 161 files / 1396 tests, 0 failures after fix (see below) |
| `npm run test:ui` (playwright) | ⬜ NOT RUN | needs a display/UI environment; not attempted this session |
| `npm run build` (full, incl. native helpers + electron-builder dmg) | ⬜ NOT RUN | native helper compilation (whisper runtime, Windows GPU export, NVIDIA CUDA compositor, cursor monitor) is slow and platform-specific; not attempted this session |
| App launches (`npm run dev`) | ⬜ NOT VERIFIED | no manual smoke test performed this session |
| Record → edit → export smoke flow | ⬜ NOT VERIFIED | requires the app running with real capture devices |

## Regression caught and fixed during this session
- Renaming `RECORDING_SESSION_MANIFEST_SUFFIX` (`electron/ipc/constants.ts`) from `.recordly-session.json` to `.screenly-session.json` broke `electron/ipc/recording/library.test.ts` because four other files independently hardcoded the same string instead of importing the constant (`library.ts`, `importRecording.ts`, `sequenceWebcam.ts`, `sequenceSource.ts`), plus their tests. Fixed by renaming all producers/consumers consistently and re-running the full suite (green). This is a pre-existing duplication in the codebase (the constant isn't the single source of truth) — worth a real fix later, not attempted here per "no unnecessary rewrite."

## What must be re-run before Phase 1 is declared complete
1. Full suite again after the remaining UI-string rename pass.
2. `npm run build:mac` (and `build:win` if targeting Windows) to confirm the app actually packages and the new icon set renders correctly in a real dmg/exe.
3. Manual smoke: launch → record (screen only) → stop → open in editor → export MP4. This is the PRD's stated Phase 1 acceptance bar ("existing recording works", "existing editor works", "existing export works") and has not been verified this session.
