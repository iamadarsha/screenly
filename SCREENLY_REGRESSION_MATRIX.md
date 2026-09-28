# SCREENLY Regression Matrix

## Status as of 2026-09-27, Phase 2 full-pipeline regression gate (PRD §25 gate)

Real signed app (`release/mac-arm64/Screenly.app`, code unchanged since `61fbb39`/`f8e8846` — no rebuild needed), driven via CDP (`--remote-debugging-port=9333 --remote-allow-origins=*`) against the actual HUD/editor renderer contexts, not mocks.

| Check | Status | Notes |
|---|---|---|
| Source selection → `startNativeScreenRecording` (ScreenCaptureKit) | ✅ VERIFIED live | real backend, real source |
| Recording Guardian checkpoint | ✅ VERIFIED live | `recording-*.screenly-checkpoint.json` created with correct fields on `setRecordingState(true)`, deleted cleanly on stop |
| Media-health monitor | ✅ VERIFIED live | `get-media-health-status` returned `{"status":"ok"}` mid-recording |
| Pause / resume | ✅ VERIFIED live | real pause/resume via `setRecordingState`, no false stall reading afterward |
| Stop → real output file | ✅ VERIFIED live | `recording-1790450829129.mp4`, 16,303,446 bytes, 44.905s confirmed via ffprobe; checkpoint file removed |
| Editor load (`switchToEditor`) | ✅ VERIFIED live | editor window opened with the real video, correct `<video>` src, correct project title |
| Export (MP4, real encode) | ✅ VERIFIED live | clicked through Export → Export Video panel via DOM-scoped clicks; output landed at `~/Downloads/export-*.mp4` (no blocking native dialog observed — confirmed via a safe activate+screenshot check, not a coordinate click); ffprobe confirmed valid h264, 1814×1020, 44.934s, 9.4MB |
| Retake Mode against the real clip in this project | ⬜ NOT RE-VERIFIED LIVE | Editor window stopped exposing a CDP target partway through the session (`Target.getTargets` on the browser endpoint only returned the HUD window, even though the editor window was visibly open and functional per screenshot) — a CDP/tooling gap, not a reproduced app bug. Did not fall back to blind coordinate-clicking (ruled out earlier this session after a real misclick incident). Backed instead by: 10 passing `retake.test.ts` unit tests (unchanged) + this session's earlier CDP-verified cross-window handoff mechanism (see below). |
| Test artifacts cleanup | ✅ DONE | deleted the test export, test recording + `.cursor.json` sidecar, and the test `.recordly` project file from the real app-data dir; killed the debug-mode app instance |

**Result: the continuous record→pause→resume→stop→edit→export chain is now confirmed working end-to-end on the real signed app. Retake-mode is the one PRD §25 item not re-driven live this pass**, for the tooling reason above rather than any observed defect.

**Also found in passing (not part of this gate, spun off separately):** saved project files still use the `.recordly` file extension — a Phase 1 branding-cleanup miss, tracked as a separate follow-up task.

## Status as of 2026-09-27, Phase 2 session (inline retake-recording — Phase 2 now feature-complete)

| Check | Status | Notes |
|---|---|---|
| `npm run typecheck` | ✅ PASS | clean |
| `npm run lint` | ✅ PASS | same 1 pre-existing unrelated warning |
| `npm run test` | ✅ PASS | 167 files / 1456 tests (no new tests this feature - pure IPC/window-coordination wiring, no new non-trivial pure logic; `retake.test.ts` already covers the shared apply-logic) |
| Cross-window retake handoff (window-by-id lookup, no-reload show/focus, event delivery, shared pendingRetake state) | ✅ VERIFIED via CDP | Real signed app, `--remote-debugging-port` + `Runtime.evaluate` against the actual editor and HUD window contexts (not mocks, not coordinate clicks). Confirmed: `pendingRetake` is genuine cross-window main-process state; `finishRetakeRecording` correctly returns to the *original* window without reloading it (a JS marker set beforehand survived); the `retake-recording-ready` event delivered the exact `{clipId, videoPath}` payload to that window's listener. |
| `retakeClip` actually applying to a real clip in a real project | ⬜ NOT RE-VERIFIED THIS SESSION | Deliberately out of scope for the CDP test above (no real clip existed under the test id) - already covered by 10 passing unit tests in `retake.test.ts`, unchanged by this session. Covered as part of Phase 2's still-pending manual regression smoke (see execution-state "Next session" item 3). |

**Phase 2 status: every feature built. Full manual regression smoke (per PRD §25 Phase 2) has NOT been run as a whole yet** - each feature has been verified individually (some very thoroughly, e.g. Instant Replay and this retake work), but the PRD's own gate wants a full pass covering the whole existing capture/edit/export pipeline together, which hasn't happened this session.

## Status as of 2026-09-26, Phase 2 session (Media Health + Instant Replay slices)

| Check | Status | Notes |
|---|---|---|
| `npm run typecheck` | ✅ PASS | clean |
| `npm run lint` | ✅ PASS | same 1 pre-existing unrelated warning |
| `npm run test` | ✅ PASS | 167 files / 1455 tests (+30 new across mediaHealth, replayBuffer, replayBufferSettingsStore) |
| Media-health pure logic | ✅ VERIFIED | 10 unit tests |
| Replay buffer pure logic + real concat | ✅ VERIFIED | 5 of the 14 replayBuffer tests use real ffmpeg-generated chunk files and a real concat run, not mocks — caught a real `-safe 1` vs `-safe 0` bug before it shipped |
| Replay buffer's actual background `avfoundation` capture | ✅ VERIFIED (after a real fix) | Built the real signed app, pre-enabled Instant Replay, and found segments genuinely never rotated (frozen file size). Root-caused to avfoundation reporting a broken timebase in this environment, confirmed by testing the app's existing shipped capture command directly. Fixed with a forced constant output frame rate (`-r 30`); rebuilt, relaunched (properly this time — see note below about the single-instance lock), and confirmed real chunk rotation plus a full save via the actual global shortcut (real keystroke, not a coordinate click) producing a valid, playable 16.7s `replay-*.mp4`. |

## Status as of 2026-09-26, Phase 2 session (Retake Mode slice)

| Check | Status | Notes |
|---|---|---|
| `npm run typecheck` | ✅ PASS | clean |
| `npm run lint` | ✅ PASS | same 1 pre-existing unrelated warning |
| `npm run test` | ✅ PASS | 164 files / 1425 tests (+10 new: `retake.test.ts`) |
| `npm run i18n:check` | ✅ PASS | all 11 locales structurally consistent after adding clip.retake/retaking/switchTake |
| Retake Mode vs. a real running app | ⬜ NOT VERIFIED | same GUI-automation gap noted below — typechecks and reuses established prop/component patterns, but not screenshotted live |

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
