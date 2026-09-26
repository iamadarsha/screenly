# SCREENLY Execution State

Last updated: 2026-09-26 (Phase 1 done; Phase 2 Recording Guardian + Retake Mode + Media Health slices done)

## Current phase
**Phase 2 — Recording Reliability + Capture Workflow, in progress.** Phase 1's identity/rebrand slice is done and verified. Within Phase 2: Guardian (disk-monitoring, crash-recovery-checkpoint, stalled-stream + device-disconnect media-health), and Retake Mode's alternate-takes mechanic, are done. Still open: Replay Buffer and an inline retake-recording flow. **Operator has explicitly said: keep building forward through the phases first ("build everything then fix"), come back for performance/polish later.** Do not stop to polish earlier phases unless something is actually broken.

## Environment
- Working dir: `/Users/iamadarsha/Screenly`, git repo, pushed to **https://github.com/iamadarsha/screenly** (private), branch `main`, 18 commits.
- Node v24.14.0 / npm 11.9.0. `gh` CLI authenticated as `iamadarsha`.
- Bundle id: `app.screenly.desktop`. Protocol scheme: `screenly://`.
- Primary target: signed dmg (mac) / exe (win) installable via GitHub release.

## What is actually done and verified (don't redo this)
1. **Release/packaging identity**: `package.json`, `electron-builder.json5` (appId, productName, protocol, GitHub publish target, macOS Info.plist strings, Windows names), `screenly.rb` Homebrew cask (sha256 placeholders pending a real release).
2. **App icon**: hand-built SVG (`branding/source-assets/Screenly.svg`) matching the supplied brand guideline, refined against operator-supplied reference logo renders, rasterized into the full icns/ico/PNG set. Confirmed rendering correctly in a real launched app (see below).
3. **Core runtime identity**: window title, project file extension (`.screenly`, with `.recordly` kept in `LEGACY_PROJECT_FILE_EXTENSIONS` so old projects still open), session-manifest/trash/media-dir naming, tray tooltip, OAuth callback scheme and landing page, updater messages, project save/open dialogs, export error messages, auth error messages, cloud-share error copy, the full 11-language i18n locale system, announcements feed URL.
4. **Verification method that actually worked**: static grepping alone repeatedly missed real strings (i18n fallback defaults, duplicate literals in main-process vs renderer, a second/third copy of the same sentence). What worked: run `npm run build:mac`, then `strings release/mac-arm64/Screenly.app/Contents/Resources/app.asar | grep -c Recordly`, fix whatever surfaces, rebuild, repeat. Took **7 build cycles** to reach zero. **Use this technique again for any future "make sure X is really gone/present" question** — don't trust source grep alone for a compiled Electron app.
5. **Two real signed dmgs exist right now**: `release/Screenly-arm64.dmg` (203M), `release/Screenly-x64.dmg` (208M). Signed with a local Apple Development identity (ad-hoc/dev signing, NOT notarized — fine for local testing, not for public distribution).
6. **App launches and was screenshotted**: menu bar correctly reads "Screenly", compact recorder HUD renders correctly, icon correct.
7. Every change verified against the full baseline: `npm run typecheck` (clean), `npm run lint` (clean, 1 pre-existing unrelated warning), `npm run test` (1396/1396 passing throughout).

## Deliberately NOT done (documented reasoning, not oversights — see SCREENLY_UI_INVENTORY.md for full detail)
- `services/recordly-share/` — a live deployed Cloudflare Worker. Operator explicitly said leave it alone.
- Native capture helper toolchain internal naming (`electron/native/bin/recordly-*`, Swift/C++/PowerShell producer scripts, `electron/ipc/paths/binaries.ts`) — zero user visibility, real regression risk to the core recording feature if renamed incompletely.
- `src/lib/auth/{recordlyAuth.ts,useRecordlyAuth.ts,RecordlySignInDialog.tsx}` **filenames/symbol names** — the actual user-visible text inside them (dialog heading, aria-labels, error message) IS fixed; only the filenames/internal identifiers still say Recordly. Cosmetic refactor, no functional or user-visible effect.
- Full SCREENLY visual re-theme (`screenly-design-tokens.css` wired into components, Liquid Glass system) — this is PRD Phase 5, not Phase 1. Don't start it prematurely.
- Windows build (`npm run build:win`) — not attempted this session (dev machine is macOS). Will need a Windows machine or CI runner.
- Code signing / notarization for real public distribution — current dmgs are dev-signed only.

## NEW as of tonight's launch test: known issue to track, not fix yet
**Operator reports: "features are working but very laggy."** This was said after actually using the built app (record → edit, presumably). Operator's explicit instruction: **finish building out the remaining phases first, come back and fix performance later.** Do not get pulled into performance investigation/optimization until told to. When it's time: PRD §20 (Performance Budget) is the relevant section — profile before guessing, check for the known `EditorWindow` bundle being 1.6MB unminified-equivalent (vite warned about chunks >1000kB at every build — `EditorWindow-*.js` is consistently the largest at ~1.62MB), and check whether AI/background work is interfering with the main thread per PRD §1.3's "capture path is sacred" rule.

## Phase 2 progress (this session)

**Done and verified** — Recording Guardian, partial (PRD Feature 1):
- `electron/ipc/recording/diskSpace.ts`: free-disk-space check (`fs.statfsSync`), classified ok/low/critical against 2GB/500MB thresholds. 9 unit tests.
- `electron/ipc/recording/guardian.ts`: a new incremental recording checkpoint (`.screenly-checkpoint.json`) written on record-start and heartbeated every 5s, distinct from the pre-existing `.screenly-session.json` (which is only webcam↔screen file linking, NOT a checkpoint — don't confuse the two). On next launch, any checkpoint still on disk means an unclean shutdown; `scanForRecoverableRecordings` finds and validates these. Clean stop finalizes (deletes) the checkpoint. 10 unit tests covering corrupt/stale/empty-video edge cases.
- Wired into the **existing** `set-recording-state` IPC handler in `electron/ipc/register/recording.ts` (confirmed via codebase survey to be the one place both mac and Windows capture paths already funnel start/stop side effects through — did not invent a new integration point).
- New IPC: `get-disk-space-status`, `get-recoverable-recordings`, `discard-recoverable-recording`.
- Renderer: critical-disk preflight block before recording starts, low/critical disk toast every 30s while recording, `RecoverableRecordingsDialog.tsx` shown on dashboard mount (Keep-all / Discard actions — deliberately reuses the existing raw-recordings library view rather than building a new "open recovered video" pipeline, since one doesn't exist for raw recordings today).
- Verified: full suite green (163 files / 1415 tests, +19 new), typecheck/lint clean, backend logic double-checked against the real dev userData directory (not just temp dirs), and against a real accidental recording start/stop cycle during `npm run dev` testing — the checkpoint was correctly created then cleanly removed with no intervention.
- **Not verified**: the recovery dialog's actual visual rendering. An attempt to screenshot it live (planting a fake checkpoint, running `npm run dev`) got the backend confirmed but couldn't reliably drive the Electron HUD's GUI to open the dashboard without a proper computer-use/accessibility tool — one blind coordinate-click attempt landed on an unrelated Chrome tab on the operator's real desktop instead of the app window, so further coordinate-clicking was abandoned as unsafe/unreliable. **If revisiting this, use a proper GUI automation tool (computer-use MCP with access granted) rather than raw AppleScript/CoreGraphics coordinate clicks — window focus/z-order assumptions were wrong twice in a row this session.**

**Done and verified** — Retake Mode (PRD Feature 2, "alternate takes" half; Clips/reorder/trim/append already existed before this session):
- `src/components/video-editor/retake.ts`: pure `applyRetakeToClip`/`swapToPreviousTake`, 10 unit tests. `ClipRegion.previousTakes` (new optional field in `types.ts`) is a stack — retaking never discards footage, it pushes the replaced range there.
- **Key architectural decision**: does NOT touch `VideoPlayback.tsx` or the native export pipeline (`native-video.ts`/`modernVideoExporter.ts`) — a codebase survey this session confirmed both hard-assume exactly one source video file for the whole project (true live multi-source-per-clip would mean building a video-element pool for playback and threading per-segment paths through dozens of ffmpeg call sites in export — real future work, but multi-session-scale and risky to the app's most stability-critical code). Instead, retake reuses `importRecording` (`electron/ipc/recording/importRecording.ts`) — the same ffmpeg concat/normalize pipeline that already backs "append clip" — just to REPLACE a clip's source range instead of inserting a new one. Zero changes needed to playback/export because the result is still just one ordinary video file.
- `src/components/video-editor/library/useClipRetake.ts` orchestrates it, mirroring `useRecordingLibrary.ts`'s `addToTimeline` pattern exactly (same finalize/commit two-step).
- UI: "Retake this clip" / "Switch take" buttons in the existing clip inspector (`SettingsPanel.tsx`), and `RecordingLibraryPanel.tsx` gained a `retakeMode` prop so the same recording picker serves both "add" and "use as new take" without duplicating it.
- Undo needed zero new code (existing history auto-snapshots `clipRegions`).
- Localized across all 11 locales, `npm run i18n:check` passes.
- Verified: 164 files / 1425 tests (+10 new), typecheck/lint clean. **Not verified against a real running app** — same GUI-automation gap as the recovery dialog above; this needs a manual check or proper computer-use access next time.
- **Not done**: an inline "record a new take right now" flow. Retake currently works by picking an *already-recorded* file via the library picker (record separately, then retake with it) — a genuinely nice fast-follow (trigger a scoped recording directly from the "Retake" button) but deliberately deferred to keep this slice tight and fully tested.

## Media-health monitoring (this session, done)
- `electron/ipc/recording/mediaHealth.ts`: pure stalled-stream classifier (no output-file growth for >15s while actively recording = stalled), sampled on the same 5s heartbeat the Guardian checkpoint already runs. 10 unit tests. Pause-aware on both mac/Windows native paths (sample buffer resets on pause/resume so a legitimate pause is never misread as a stall).
- `useScreenRecorder.ts`: webcam/mic tracks get an `ended` listener → toast notice on OS-level device disconnect mid-recording (the silent-continue behavior itself was already correct, it just had no user notification).
- **Not done, confirmed infeasible in this pass**: system-audio-failure detection/messaging. Unlike mic (has a working Windows fallback keyed off a specific native-helper stdout marker) and webcam (plain JS MediaStream), system audio capture happens entirely inside the native ScreenCaptureKit/WGC helper processes with no JS-visible failure signal yet — would need new marker-parsing work per platform, out of scope here.
- Verified: 165 files / 1435 tests (+10), typecheck/lint clean. Not verified live (same GUI-automation gap as Guardian/Retake).

## Phase 2 still open
Replay Buffer (rolling disk-backed buffer + `globalShortcut` — confirmed nothing like this exists at all in the codebase), and the inline retake-recording flow noted above.

## Next session: recommended order
1. Read this file, `SCREENLY_DECISIONS.md`, `SCREENLY_UI_INVENTORY.md`, `SCREENLY_RELEASE_READINESS.md` before doing anything else.
2. Do NOT re-run the identity/branding sweep — it's done. Do NOT start performance work — operator said later.
3. Continue Phase 2: pick up media-health monitoring, Replay Buffer (needs `globalShortcut` infrastructure built from scratch), or the inline retake-recording fast-follow. All three are still fully open.
4. Keep using the build → asar-dump → fix cycle for any future "is this really gone" branding verification.
5. For any future live-GUI verification, request proper computer-use access rather than improvising coordinate clicks.
6. Keep the same discipline: typecheck + lint + full test suite after every logical change, real commits with clear messages, update these state files at natural checkpoints (not necessarily every single commit).
