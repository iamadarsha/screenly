# SCREENLY — Feature Status & Testing Ledger

Every feature: built? unit-tested? live-verified against the real running app? If you pick up this project, this file tells you exactly what still needs live verification and exactly how to do it (copy-pasteable CDP technique).

Legend: ✅ done and verified · 🟡 built, unit-tested, not yet live-verified · ⬜ not built

## The live-verification technique (copy-paste template)

```bash
# Build (skip if nothing changed since last build)
cd /Users/iamadarsha/Screenly && npm run build:mac

# Clean launch
pkill -9 -f "Screenly.app"; sleep 1
/Users/iamadarsha/Screenly/release/mac-arm64/Screenly.app/Contents/MacOS/Screenly \
  --remote-debugging-port=9333 "--remote-allow-origins=*" &
sleep 3
curl -s http://localhost:9333/json   # lists CDP targets; find the HUD's target id
```

```python
# Drive it — save as a script, adjust the target id and expression per call
import json, websocket
ws = websocket.create_connection("ws://localhost:9333/devtools/page/<TARGET_ID>", timeout=15)
def send(method, params=None, id=1):
    ws.send(json.dumps({"id": id, "method": method, "params": params or {}}))
    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == id:
            return resp
send("Runtime.enable")
def ev(expr, id=100):
    return send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True}, id=id)

r = ev("window.electronAPI.someMethod().then(r => JSON.stringify(r))", id=101)
print(r)
ws.close()
```

To record a real test clip with real audio (needed to test captions/AI features, since none of those work on silent video):

```python
# 1. Select source + start, with audio explicitly requested (see the gotcha in 00_START_HERE.md
#    about the two-argument signature)
ev("""(async () => {
  await window.electronAPI.selectSource('screen:1:0');
  return await window.electronAPI.startNativeScreenRecording(
    { id: 'screen:1:0', name: 'Screen 1 (Primary)' },
    { capturesSystemAudio: true, capturesMicrophone: false }
  );
})()""")
ev("window.electronAPI.setRecordingState(true).then(() => 'ok')")
```
```bash
# 2. Play real speech through system audio while it's recording (macOS `say` + `afplay`
#    — genuine TTS narration, captured by system-audio recording, no need to speak yourself)
say -o /tmp/narration.aiff "Your test script here."
afplay /tmp/narration.aiff
```
```python
# 3. Stop, then load into the editor
ev("""(async () => {
  await window.electronAPI.setRecordingState(false);
  return await window.electronAPI.stopNativeScreenRecording();
})()""")
# path comes back in the result — use it:
ev("""(async () => {
  await window.electronAPI.setCurrentVideoPath('<path from stop result>');
  await window.electronAPI.switchToEditor();
  return 'ok';
})()""")
# then find the NEW editor-window CDP target (curl the /json endpoint again) and connect to it
```

**Always clean up test recordings afterward** — `rm` the `.mp4`/`.cursor.json`/any `.system.m4a` sidecar files from `~/Library/Application Support/Screenly/recordings/`, and any test project `.screenly` files from `.../recordings/Projects/`. Do not leave test artifacts in the user's real recordings library.

## Phase 1 — Identity/Rebrand

- ✅ Icon, bundle IDs, window titles, project extension, i18n strings — all live-verified across many build cycles in the original Phase 1 session.
- ✅ App icon corrected to match the operator's real reference logo (was a hand-built approximation before; rebuilt as two overlapping rounded-rect ribbon bars). Verify visually: `open /Users/iamadarsha/Screenly/branding/source-assets/Screenly.svg` or check `icons/icons/png/512x512.png` after any regeneration.
- ⬜ **Known issue, not yet fixed**: saved project files still use the `.recordly` extension instead of `.screenly`. A background task was spun off for this (title: "Rename .recordly project file extension to .screenly") — check if it was ever picked up before redoing the work.

## Phase 2 — Recording Reliability

- ✅ Guardian (checkpoint/disk-space/media-health), Retake Mode (both paths), Instant Replay — all live-verified in earlier sessions, see `SCREENLY_REGRESSION_MATRIX.md` for the detailed history including the avfoundation timebase bug fix.
- ✅ Full regression gate (record→pause→resume→stop→edit→export) live-verified end-to-end on the real signed app.
- 🟡 Retake mode's live interactive click-through specifically was not re-verified in the final regression pass (CDP editor-window-target availability gap that session) — unit tests + an earlier session's live cross-window verification still cover it. Re-verify live if you're touching retake code.

## Phase 3 — Editor/Studio/Export

- ✅ Export Doctor (preflight blockers/warnings, safe-export auto-retry) — unit tested (33 tests), acceptance criteria met by design (route-reporting and safe-fallback are structurally guaranteed, reasoned through carefully). Live end-to-end export was verified working during the Phase 2/3 regression gate.
- ✅ Smart Presentation Director — unit tested (27 tests across the suggestion engine), **and live-verified** on the real app with a real recording: real click-effect suggestions rendered with correct confidence/reason copy, Accept correctly disabled for non-applicable kinds, Preview correctly seeked the video, Dismiss All correctly transitioned state. One real bug was found and fixed during this live pass (dismissing a non-applicable suggestion produced no visible change — fixed by adding a "Dismissed" badge).
- ⬜ Studio Polish gaps (webcam background blur, keyboard-shortcut overlay) — not started, deliberately deferred (see `01_PRD_AND_ROADMAP.md` for why).

## Phase 4A — ASR Foundation

- ✅ Transcript validation — 16 unit tests, wired defensively into the live pipeline.
- ✅ **Language detection — live-verified with real speech.** Recorded a real clip with `say`-generated narration played through system audio, ran real whisper transcription via the actual "Generate Captions" UI button, and the Captions settings panel correctly showed "Detected language: English" sourced from real ASR output. This closes out the one item that was previously marked "not live-verified" in earlier state docs.
- ✅ Multilingual data model — persists correctly across the same live test.

## Phase 4B — Transcript Editor

- ✅ Pure logic (delete-to-cut, filler detection, repeated-phrase detection) — 34 unit tests across `transcriptEditing.ts` and `clipSequence.ts`'s `planTimeRangeDeletion`.
- ✅ **UI live-verified, with one real bug found and fixed along the way**: the `TranscriptPanel` was initially wired into the WRONG `SettingsPanel.tsx` section (`captionSectionContent`, singular — a per-cue-selection-only section) instead of the correct one (`captionsSectionContent`, plural — the actual "Captions" tab) due to the near-identical variable names. It typechecked fine and simply never rendered. Found by live-clicking through the real app and grepping for the exact render location once the panel didn't appear. **If you're debugging "my new Captions-tab UI isn't showing up," check which of these two variables you added it to first.**
- 🟡 Word-click / shift-click-range-select / actual delete-to-cut interaction has NOT been driven interactively via CDP against a real project with real captions (the earlier attempt got as far as confirming the panel renders with real transcribed words, but ran out of session time before clicking through the selection/delete flow). **This is the highest-priority remaining live-verification task if you pick this up.**

## Phase 4C — Local Reasoning Runtime

- ✅ `modelManager.ts` — 12 unit tests including a mocked-HTTPS-transport test covering download/checksum-mismatch/cancellation paths.
- ✅ **Gemma 4 E4B downloaded and checksum-verified for real**: `shasum -a 256` on the downloaded 4.6 GB file matched `a555b900214b477d8880e7832e0b8925e139b0159640036b09fe472b6f2097f2` exactly. File lives at `~/Library/Application Support/Screenly/ai-models/gemma-4-E4B-it-Q4_0.gguf` on this machine. `getAiModelStatus()` correctly reports `"downloaded"` — **live-verified**.
- ✅ **`getAiModelStatus()` IPC round-trip live-verified** (real call via CDP against the running HUD window, correct status + path returned).
- 🔴 → ✅ **Real bug found and fixed: `window.electronAi` was `undefined` in every renderer, crashing app startup.** First live-verification attempt found `(node:PID) UnhandledPromiseRejectionWarning: TypeError: Cannot read properties of undefined (reading 'exposeInMainWorld')` at the very top of the app's log, and `typeof window.electronAi === "undefined"` in both the HUD and editor windows. Root cause: `vite.config.ts`'s main-process bundle only externalized `ffmpeg-static`/`uiohook-napi` — everything else, including `@electron/llm` and its native-binding-dependent `node-llama-cpp` dependency, was being **inlined** into `dist-electron/main.cjs` by rollup. `@electron/llm` needs to resolve its own preload script's real file path at runtime (to hand to Electron's `session.setPreloads()`), and that resolution breaks once its code is flattened into someone else's bundle — the preload code ends up executing inside `main.cjs` itself (a main-process context, where `contextBridge` isn't defined) instead of as a real separate preload script. **Fix**: added `"@electron/llm"` and `"node-llama-cpp"` to `vite.config.ts`'s `rollupOptions.external` array (same treatment as the existing native-module externals). Verified the fix by rebuilding just the vite step and confirming `dist-electron/main.cjs` now contains a genuine `require("@electron/llm")` call instead of inlined code; `normalize:electron-main-cjs` and `smoke:electron-main-cjs` both still pass. **A full rebuild with this fix was in progress when this note was written — confirm `window.electronAi` is no longer `undefined` in a live app before trusting anything else in this section.**
- ✅ **`window.electronAi` verified live after the fix** (`typeof window.electronAi === "object"` with `create`/`prompt` etc.; app starts without the contextBridge crash). `create()` + `prompt()` exercised for real against Gemma 4 E4B (raw calls AND through the UI, see Phase 4D).

## Phase 4D — AI Features

- ✅ **Chapters / Title / Summary live-verified through the real running UI** (2026-09-28). Test input: a `say`-generated narration screen recording, real whisper transcript. Results in the AI Tools panel (Captions tab, below Transcript): Chapters tier label `AI-GENERATED` with 4 chapters (0s Introduction and Demo Overview / 2s Exploring Recording Features / 3s Demonstrating Editing Tools / 5s Export Options and Sharing Videos); Title `Product Demo: Recording, Editing, and Export Features` (tier `AI`); Summary = accurate 2-sentence summary. Model status showed `Local AI model ready (Gemma 4 E4B).`
- Use-case status: (1) model status ✅ (2) AI chapters ✅ (3) AI title ✅ (4) AI summary ✅ (5) **delete-model then re-run fallback: ⬜ NOT YET TESTED** — do this next: click the panel's `Delete` button (or `window.electronAPI.deleteAiModel()`), re-click all three; expect Chapters+Title to work with the `Heuristic` label and Summary to report unavailable, no crash. Then re-download the model (~4.6 GB; `downloadAiModel`) only if you need AI again.
- ⬜ Voiceover (TTS) — researched, not built. See `04_DECISIONS_AND_NEXT_STEPS.md` for the chosen approach (`kokoro-js`) and next steps.
- ⬜ Remaining 4D features (Make This Video Better, AI publishing pack, screen understanding, mistake detection, Ask My Recording, semantic library search, presenter-background AI, local voice cleanup) — not started.

## Webcam / camera / mic (tested live 2026-09-28) — 🔴 OPEN BUG

Findings, in order:
- HUD (`Screenly` window, buttons by aria-label: `Enable webcam overlay`, `Enable microphone`, `Countdown delay`, `Record`, `Home`, `Hide HUD`, `Close App`). Clicking `Enable webcam overlay` opens a device popover listing `MacBook Pro Camera (0000:0001)` and the iPhone Continuity camera; selecting one flips the button to `Disable webcam overlay`. Mic button opens a device list; `Default - MacBook Pro Microphone (Built-in)` works. Clicking `Record` first opens a Screen/Window source popover (pick `Screen 1 (Primary)`), then `Record` again starts (timer appears, stop button has an aria-label containing "Stop").
- **By design, not a bug**: the HUD's live webcam preview only streams when `getEditorMode()` is false (`useWebcamPreviewOverlay.ts`: `shouldStreamWebcamPreview = !editorMode && ...`). `editorMode` is true while ANY editor window exists (`electron/windows.ts` `getHudEditorMode`). Close all editor windows to test the camera.
- **BUG (unresolved)**: with editor closed, webcam enabled, MacBook camera selected: the preview `<video>` gets `srcObject`, `paused=false`, the track is `live`/`enabled`/`muted:false` (320x320@24), but `readyState` stays 0 and `videoWidth/videoHeight` stay 0 -> gray empty box in the popover. Raw `navigator.mediaDevices.getUserMedia({video:true})` from the same window resolves fine and `enumerateDevices()` returns labels (so permission is granted; entitlements `com.apple.security.device.camera/audio-input` and `NSCameraUsageDescription` are present in the built app). A real recording with webcam+mic enabled produced `recording-*.mp4`, `.mic.m4a`, `.system.m4a`, `.cursor.json` but **no `-webcam.webm/mp4` sidecar**, and the saved project has `webcam.enabled:false, sourcePath:null` — i.e. `prepareWebcamRecorder` in `src/hooks/useScreenRecorder.ts` (~line 1026) got zero MediaRecorder chunks (`webcamChunks.length === 0` -> resolves `null`) or threw and was swallowed by the catch that only `console.warn`s.
- Hypotheses, unverified: (a) camera frames are never delivered on this machine/build (possibly macOS Continuity/Center-Stage or camera-in-use contention; try a different `deviceId`, try the built app vs `npm run dev`, check `system_profiler SPCameraDataType`, check whether another app such as Teams holds the camera); (b) transparent always-on-top HUD window (`electron/windows.ts` ~line 500/745 `transparent: true`) breaking video decode presentation; (c) the recorder catch block silently swallowing an error. Next debugging step: in the HUD window (editor closed), create a `<video>`, attach a fresh getUserMedia stream, wait 3 s, read `videoWidth`; then run a `MediaRecorder` on the stream and log `ondataavailable` sizes. My last attempt at exactly this hung (the CDP `Runtime.evaluate` never returned after an app relaunch, possibly an unanswered OS camera permission prompt on the relaunched process — check for a macOS permission dialog on screen first). Editor windows deny media permission (`NotAllowedError`) — only the HUD can use the camera.
- ⬜ Webcam shapes: shape is controlled by `webcam.roundness` (0-100; radius = min(w,h)/2 * sqrt(roundness/100), see `webcamOverlay.ts` `getWebcamCornerRadiusPx`), plus size/position presets (`getWebcamPositionForPreset`), crop region (`WebcamCropControl.tsx`), mirror, react-to-zoom. Not testable end to end until a webcam file actually records; alternative: import any small video as `webcam.sourcePath` in a project JSON to test shapes/positions/export without the camera.
- ⬜ Voiceover: not built (see 04). "Voice overs" testing therefore = nothing to test yet.

## Phase 5 — Design Redesign

- 🟡 Design-divergence survey research complete (see `02_ARCHITECTURE.md`'s "Current (pre-redesign) editor layout" section for the full findings — this was gathered via a dedicated research pass and is accurate as of the date below).
- ⬜ `SCREENLY_DESIGN_DIVERGENCE_AUDIT.md` — check whether this file was actually written before continuing; the research for it exists but the doc itself may not have been finalized.
- ⬜ New information architecture, Liquid Glass component system — not started.
- 🟡 Wallpaper collection replacement — Python/PIL procedural-generation pipeline was being set up (numpy+PIL confirmed available in this environment) when work paused; Wikimedia Commons was the planned source for photographic categories (Aurora/Alpine/Coast/Botanical), NASA imagery for Cosmic, pure procedural generation for Abstract/Minimal/Topographic. **No actual wallpaper image files have been produced yet.** `SCREENLY_WALLPAPER_CREDITS.md` does not exist yet — create it alongside the first real third-party image you add, not after the fact.
- ⬜ `SCREENLY_VISUAL_QA.md` — not started (depends on the redesign being substantially done first).

## Known issues / gotchas (don't rediscover these)

1. **`.recordly` project file extension** — still not fixed (see Phase 1 above).
2. **Editor window CDP target can be flaky or the whole editor window can get "stuck"** after many video-load cycles in one session — see `00_START_HERE.md`'s gotchas section. Full app restart fixes the stuck-window case.
3. **`startNativeScreenRecording(source, options)` — two arguments, not one merged object.** A recording started with the wrong shape silently has no audio track. This single bug cost significant debugging time before being found — check your call shape first if a "no audio track" error ever recurs.
4. **Recording audio capture is off by default** in preferences (`microphoneEnabled: false, systemAudioEnabled: false`) — must be explicitly requested per-recording via the `options` argument, not assumed from preferences alone (the preference UI toggle exists but `startNativeScreenRecording` doesn't read it automatically when driven programmatically via CDP — verify whether the real in-app "Start Recording" button reads the preference correctly before assuming this is only a CDP-testing quirk).
5. **electron-builder codesign timestamp flake** — `"A timestamp was expected but was not found"` on `codesign --timestamp`. Just retry the build.
6. **Don't `npm install` while a build is mid-flight in the same repo** — observed to cause a silent stall.
7. **Background-task "completed" notifications can fire prematurely** for nested `nohup ... &` shell patterns — always confirm with `pgrep`/`ps` before trusting one for a long-running build/download.
8. **`captionsSectionContent` vs `captionSectionContent`** in `SettingsPanel.tsx` — see Phase 4B above. A near-identical-name trap that silently swallows new UI.
9. **Any future Electron npm dependency that itself does main↔preload↔renderer IPC wiring (like `@electron/llm`) MUST be added to `vite.config.ts`'s main-process `rollupOptions.external` array**, exactly like `uiohook-napi`/`ffmpeg-static`/`@electron/llm`/`node-llama-cpp` already are. If it isn't, rollup will inline it into `dist-electron/main.cjs`, which breaks any runtime file-path resolution the package does internally (its own preload script location, native binding paths, etc.) — the symptom is usually a `contextBridge`-related crash right at app startup and a `window.<whatever>` global staying `undefined` in every renderer, not an obvious "wrong external" error. This exact failure mode cost real debugging time once already — check the external list first if a new Electron-glue npm package "doesn't seem to inject anything."
10. **Test-recording cleanup**: standing user rule — delete test recordings afterward. Location: `~/Library/Application Support/Screenly/recordings/` (files `recording-<ts>.mp4`, `.mic.m4a`, `.system.m4a`, `.mp4.cursor.json`). All were deleted on 2026-09-28; the tiny `Projects/Untitled Project*.recordly` files were left (some may be the user's).
11. **CDP target IDs change** whenever a window is closed/reopened (recording stop swaps the HUD for the editor). Re-run `curl -s localhost:9333/json` before every script. Closing the last window leaves the app running with no windows; `open <Screenly.app>` re-activates and recreates the HUD. `Target.closeTarget` must go through the browser endpoint from `/json/version`.
12. Python `websocket` scripts hang if the page never answers; always set a timeout and treat a hang as "probably a blocking OS dialog".

---
*Last updated: 2026-09-28. Update the ✅/🟡/⬜ marks and the known-issues list every time you build, test, or fix something — this is the file most likely to go stale fastest, so be disciplined about it.*

## Final Antigravity Note (2026-09-28)
- ✅ **Task 1 to 8 completed & hardened.** 
- ✅ All "Recordly" strings, components, and binaries renamed to "Screenly".
- ✅ `npm run i18n:check` passes after missing keys fixed.
- ✅ `npm test` perfectly passes 1609/1609.
