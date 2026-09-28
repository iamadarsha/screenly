# SCREENLY — Handover: Start Here

**Read this file first.** It orients you, then points you to the other 4 files for depth. This whole `HANDOVER/` folder is written so that a completely fresh agentic coding session (Claude Code, Antigravity, Codex, Cursor, or even a plain chat LLM with these files pasted in) can pick up this project with zero prior context and be fully productive immediately.

**Standing instruction from the operator, binding on every future session**: these 5 files must be kept up to date. After every meaningful task, phase, or code change, update whichever of these files that change affects. Do not let them drift out of sync with reality — a stale handover doc is worse than no handover doc, because it actively misleads the next agent.

## What is Screenly

Screenly is a desktop screen-recording + editor application for macOS and Windows, built on Electron + React 19 + TypeScript + Vite. It records the screen (optionally with webcam and system/microphone audio), then opens a full non-linear video editor (timeline, zoom effects, cursor styling, captions, annotations, audio) for polishing the recording before export or sharing.

It began life as a fork of an open-source app called **Recordly** (AGPL-3.0). The project's charter is to fully rebrand it as **Screenly** — new visual identity, new AI features layered on top — while preserving Recordly's proven, working capture/editing engine rather than rewriting it. See `01_PRD_AND_ROADMAP.md` for the full governing document and exactly which phases are done.

**Critical, repeatedly-reinforced principle across this whole project**: "no unnecessary rewrite" / "the capture path is sacred." The screen-capture and export pipelines are the highest-risk, hardest-to-debug parts of this codebase (real native macOS/Windows code, real timing-sensitive media pipelines). Every session so far has surveyed existing code before writing new code, and reused/composed existing primitives instead of rebuilding them. Continue that discipline. Don't "clean up" or refactor working capture/export code as a side effect of an unrelated task.

## Directory orientation

```
/Users/iamadarsha/Screenly/
├── electron/                  Main-process (Node) code: IPC handlers, native capture,
│                               export pipeline, AI model management, whisper ASR
│   ├── ipc/register/          One file per IPC handler group (recording.ts, captions.ts,
│   │                           export.ts, aiModel.ts, settings.ts, ...)
│   ├── ipc/recording/         Recording-side logic (mac.ts, guardian.ts, diskSpace.ts,
│   │                           mediaHealth.ts, replayBuffer.ts, macCompanionAudio.ts)
│   ├── ipc/captions/          Whisper ASR pipeline (generate.ts, parser.ts, silence.ts,
│   │                           segment.ts, mergeSources.ts, whisper.ts)
│   ├── ipc/ai/                Phase 4C local-LLM infra (modelManager.ts — generic
│   │                           download/checksum/storage manager)
│   ├── ipc/export/            Native/GPU export helpers, export streaming
│   ├── native/                Swift/C++ native helper binaries + their build scripts
│   ├── main.ts                App entry point, window creation, startup sequence
│   └── preload.ts             contextBridge — the ONLY way the renderer talks to Node
├── src/                       Renderer (React) code
│   ├── components/video-editor/   The whole editor — this is the biggest subsystem
│   │   ├── layout/             EditorShell, EditorHeader, EditorSidebar, EditorPreviewPanel,
│   │   │                        EditorTimelinePanel — the current (pre-redesign) IA
│   │   ├── timeline/            Timeline subsystem (tracks, filmstrip, waveform, playhead)
│   │   ├── suggestions/         Phase 3 "Smart Presentation Director" (deterministic
│   │   │                        suggestion engine + review UI)
│   │   ├── export/               Export orchestration (useExportRunner, exportPreflight,
│   │   │                        safeExportSettings — "Export Doctor")
│   │   ├── captions/             Caption generation controller
│   │   ├── SettingsPanel.tsx     ~3450 lines — the left inspector, all sections
│   │   ├── TranscriptPanel.tsx   Word-level transcript editor (delete-to-cut)
│   │   ├── AiToolsPanel.tsx      Phase 4C/4D AI features UI (chapters/title/summary)
│   │   ├── transcriptEditing.ts  Pure delete-to-cut / filler / repeated-phrase logic
│   │   ├── clipSequence.ts       Timeline ripple-edit primitives (split/pack/delete-range)
│   │   └── types.ts              Core data model (ClipRegion, ZoomRegion, CaptionCue, ...)
│   └── lib/ai/                  Phase 4C/4D renderer-side AI (localModelProvider.ts,
│                                  aiChapters.ts, aiTitle.ts, aiSummary.ts, chapterHeuristics.ts)
├── SCREENLY_*.md                Legacy per-topic state docs (execution state, decisions,
│                                  regression matrix, UI inventory, reuse ledger) — these
│                                  predate this HANDOVER/ folder and are more granular/
│                                  chronological. HANDOVER/ is the synthesized, current-state
│                                  entry point; the SCREENLY_*.md files are the detailed
│                                  session-by-session paper trail. Keep both — don't delete
│                                  the SCREENLY_*.md files, they have detail this folder
│                                  intentionally summarizes rather than duplicates in full.
├── HANDOVER/                    ← you are here
└── branding/source-assets/      App icon SVG source + generation
```

## How to run, build, and test

All commands run from `/Users/iamadarsha/Screenly`.

```bash
npm install              # first-time setup
npm run dev               # Vite dev server (renderer only — for UI iteration, not full app)
npm run typecheck         # tsc --noEmit — run this after every change
npm run lint               # biome lint . — run this after every change
npm run test               # vitest --run — the full unit test suite (2000+ tests as of writing)
npm run i18n:check         # verifies all 11 locale files have matching key structure
npm run build:mac          # FULL production build: native helpers + tsc + vite + electron-builder
                            # → produces release/mac-arm64/Screenly.app and release/*.dmg
                            # Takes several minutes. Needed to test anything that only
                            # exists in the packaged app (native capture, real IPC, etc.)
```

There is no `npm run build:win` capability in this environment (no Windows machine available in any session so far) — Windows-specific code has been written per the PRD's dual-platform requirement but never build-tested.

## How to actually verify a change works (the technique that matters most)

This project's sessions established a reliable pattern for verifying Electron-specific behavior (IPC, native capture, cross-window state) that goes beyond unit tests: **launch the real built app with Chrome DevTools Protocol (CDP) remote debugging, then drive it via `Runtime.evaluate` calls against `window.electronAPI`**, exactly like a real user's renderer would.

```bash
# 1. Build first if you changed anything (unit tests don't cover Electron glue)
npm run build:mac

# 2. Kill any stale instance (there's a single-instance lock — a half-dead old
#    process can silently keep running stale code for a long time undetected)
pkill -9 -f "Screenly.app"

# 3. Launch with remote debugging
/Users/iamadarsha/Screenly/release/mac-arm64/Screenly.app/Contents/MacOS/Screenly \
  --remote-debugging-port=9333 "--remote-allow-origins=*" &

# 4. List CDP targets (each open window is a separate target)
curl -s http://localhost:9333/json
```

Then drive it with a small Python script using the `websocket` package (`Runtime.enable`, then `Runtime.evaluate` with `awaitPromise: true` against `window.electronAPI.xxx()` calls). Full example scripts and results are in `03_FEATURE_STATUS_AND_TESTING.md`.

**Known gotchas with this technique** (all discovered the hard way — don't rediscover them):
- The HUD/dashboard window's CDP target is (almost) always available immediately after launch. The **editor window's CDP target sometimes fails to appear** even though the window is visibly open and working (confirmed via screenshot) — a tooling quirk, not an app bug. If this happens, don't fall back to blind OS-level coordinate clicks (see the safety rule below) — just note the gap honestly and rely on unit tests instead, or try relaunching.
- **The editor window can get into a "stuck" state after many `setCurrentVideoPath`/`switchToEditor` calls in the same session** without ever navigating back through the dashboard — subsequent video loads start failing with "Failed to load video (format not supported)" for files that are actually completely valid. The fix is a full app restart (`pkill -9` + relaunch), not debugging the file. This cost significant time before it was understood — if you see this error, restart the app first before assuming the file or the encoder is broken.
- `startNativeScreenRecording` takes **two separate arguments**: `(source, options)` — NOT one merged object. Passing `{ id, capturesSystemAudio: true, ... }` as a single arg silently drops `capturesSystemAudio` (it lands in the wrong parameter) and the resulting recording has no audio track. Correct call: `window.electronAPI.startNativeScreenRecording({ id: 'screen:1:0', name: '...' }, { capturesSystemAudio: true, capturesMicrophone: false })`.
- Recording audio is **off by default** (`microphoneEnabled: false, systemAudioEnabled: false` in preferences) — a recording made without explicitly passing `capturesSystemAudio`/`capturesMicrophone` in the `options` argument above will have zero audio tracks, silently.
- `electron-builder`'s codesign step (`codesign --timestamp ...`) can fail transiently with `"A timestamp was expected but was not found"` — this is a network/Apple-timestamp-server flake, not a real problem. Just retry `npm run build:mac`.
- When running a build in the background and also running `npm install` concurrently in the same repo, the build can silently stall (observed once, root cause presumed to be `node_modules` being read mid-scan by electron-builder). Don't `npm install` while a build you care about is mid-flight; if a build seems to hang at the exact same log line for many minutes, kill it and restart clean.
- Background-task completion notifications in this tooling can fire prematurely for nested `nohup ... & ` patterns (the wrapper process exits before the detached child actually finishes). **Always verify with `pgrep`/`ps` before trusting a "completed" notification for a long-running build or download.**

## Hard safety rule established this project (do not violate)

**Never do blind OS-level coordinate clicks** (AppleScript/CoreGraphics `click at x,y`) to drive the app for testing. Earlier in this project, a blind coordinate click intended for this app's own HUD window instead landed on the user's unrelated Chrome tab — no lasting harm, but it's exactly the kind of mistake this rule exists to prevent. Always prefer:
1. CDP `Runtime.evaluate` calling `window.electronAPI.*` directly (confined to the specific renderer target, cannot misfire onto other apps/windows).
2. DOM-scoped `element.click()` inside a `Runtime.evaluate` call (confined to that page's DOM).
3. Real OS keystrokes via `osascript keystroke` **only** for genuinely global keyboard shortcuts (e.g. the Instant Replay save shortcut) — proven safe because a keystroke, unlike a coordinate click, goes to whichever window/app is actually focused, and you control focus deliberately beforehand.

## Where to go next

- **`01_PRD_AND_ROADMAP.md`** — the full product requirements (all 6 original phases + the AI/voiceover features added beyond the original PRD), and exactly what's done vs. not done, phase by phase.
- **`02_ARCHITECTURE.md`** — how the codebase is actually built: Electron process model, IPC conventions, the editor's data model, undo/history system, testing conventions.
- **`03_FEATURE_STATUS_AND_TESTING.md`** — feature-by-feature ledger: built/tested/live-verified status for every feature, exact commands to re-verify each one, and the current list of known issues.
- **`04_DECISIONS_AND_NEXT_STEPS.md`** — the reasoning behind every non-obvious choice made (model selection, architecture tradeoffs, things deliberately deferred and why), plus the prioritized list of what to do next.
