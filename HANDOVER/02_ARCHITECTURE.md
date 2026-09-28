# SCREENLY — Architecture

## Process model

Standard Electron split, strictly enforced via `contextBridge` (no `nodeIntegration` in renderers):

- **Main process** (`electron/`, Node.js): owns all native capture, file I/O, the whisper ASR subprocess, the local LLM utility process, window management, IPC handler registration.
- **Renderer processes** (`src/`, React 19 + Vite): the HUD/source-selector window, the editor window, each a separate `BrowserWindow`. They can ONLY reach main-process capability through `window.electronAPI.*` (defined in `electron/preload.ts`, typed in `electron/electron-env.d.ts`).
- **`window.electronAi`**: a second, separate global injected by `@electron/llm`'s own auto-preload (not part of our own `electronAPI` bridge) — see "Local AI / LLM integration" below.

### Adding a new main↔renderer capability (the standard pattern, follow it exactly)

1. Write the actual logic in `electron/ipc/<area>/<name>.ts` (pure functions where possible, for testability).
2. Register an `ipcMain.handle("channel-name", ...)` in `electron/ipc/register/<area>.ts`.
3. Call your new `register*Handlers()` function from `electron/ipc/handlers.ts`'s `registerIpcHandlers()`.
4. Expose it to the renderer in `electron/preload.ts` (`ipcRenderer.invoke("channel-name", ...)`).
5. Add the TypeScript type for it to the `Window.electronAPI` interface in `electron/electron-env.d.ts`.
6. Consume it in renderer code via `window.electronAPI.yourMethod()`.

This exact 6-step pattern is used for every existing IPC surface (recording, captions, export, settings, AI model management, etc.) — don't deviate from it.

## Core editor data model (`src/components/video-editor/types.ts`)

The whole timeline is a set of parallel arrays of "regions," all keyed by absolute timeline milliseconds (`startMs`/`endMs`):

- **`ClipRegion[]`** — the primary video sequence. `{ id, startMs, endMs, sourceStartMs?, sourceMinMs?, sourceMaxMs?, speed, muted?, previousTakes? }`. Multiple clips back-to-back with no gaps model cuts/retakes; `sourceStartMs` lets a clip read from anywhere in the original recording regardless of its timeline position.
- **`ZoomRegion[]`** — `{ id, startMs, endMs, depth, focus: {cx,cy}, mode: "auto"|"manual" }`.
- **`SpeedRegion[]`**, **`AudioRegion[]`**, **`AnnotationRegion[]`** (text/image/figure/blur overlays — no keyboard-shortcut-overlay type exists yet), **`CaptionCue[]`** (with optional per-word `CaptionCueWord[]` timing).

### The ripple-edit toolkit (`clipSequence.ts`) — reuse this for ANY future "edit the timeline" feature

- `packClipSequence(clips)` — repacks clips back-to-back from position 0, preserving each clip's duration and source in-point. This is THE core "close the gap after a deletion" primitive.
- `planTimeRangeDeletion({ clipRegions, startMs, endMs, createId })` — splits clips at both cut boundaries (a plain split never moves anything, so this step alone never needs rippling), drops whatever's fully inside the cut, repacks the rest. Returns `{ splitClips, nextClips }`.
- `rippleRegions(regions, before, after)` — **fully generic** over any `{startMs, endMs}` shape (works for zoom/annotation/audio/caption regions alike, or literally any future region type): maps each region's retained span through a before/after clip-array diff, dropping whatever falls entirely inside a removed span. This is the single function that makes "delete a time range and have everything else stay in sync" work, and it required zero changes to support captions when the transcript editor was built — it was already generic.
- **The pattern for any full ripple-edit feature**: call `planTimeRangeDeletion` once, then call `rippleRegions` once per region-array type you need to keep in sync, then call all the corresponding `setXxxRegions()` state setters **synchronously in the same event handler** (see undo/history below — this is what makes it one atomic undo step).

### Undo/history (`hooks/useEditorHistory.ts`)

A **whole-project-snapshot** system, not a command/patch-based undo stack. It watches `zoomRegions`, `clipRegions`, `speedRegions`, `annotationRegions`, `audioRegions`, `autoCaptions` (plus a few selection-id fields) as one combined snapshot object, and auto-records a new history entry via a `useEffect` whenever that combined snapshot changes.

**Practical consequence, important for any new feature**: if your feature mutates more than one of these arrays (e.g., a ripple edit touching both `clipRegions` and `autoCaptions`), call all the relevant `setXxxRegions()` setters in the **same synchronous function body** (same event handler, same render commit) — React batches them into one state update, so the history effect fires once, producing exactly one undo step for the whole multi-array edit. If you split them across separate handlers/renders, you'll get multiple undo steps for what should be one user action. No new undo plumbing is ever needed for a new feature that only touches these existing arrays — it's automatic.

## Export pipeline

Two parallel exporter implementations exist: `ModernVideoExporter` (`src/lib/exporter/modernVideoExporter.ts`, ~3800 lines, WebGL/WebGPU + native-static-layout + WebCodecs routes, heavily tested, the primary path) and a legacy `VideoExporter` (`src/lib/exporter/videoExporter.ts`, WebCodecs-only, simpler, used as the guaranteed-safe fallback). Routing decision logic lives in `src/components/video-editor/mp4ExportRouting.ts` + `src/lib/exporter/backendPolicy.ts`.

**Export Doctor** (Phase 3, built this project):
- `src/components/video-editor/export/exportPreflight.ts` — runs before every export, checks source readiness/duration, timeline clip validity, disk space (reuses the Phase-2 `getDiskSpaceStatus` IPC), caption-sidecar availability. Hard problems block the export before it starts; soft ones just warn.
- `src/components/video-editor/export/safeExportSettings.ts` — if a real export attempt fails (not user-cancelled, not already using the safest config), `useExportRunner.ts` automatically retries **once** with `{ pipelineModel: "legacy", backendPreference: "webcodecs", quality: "medium", encodingMode: "fast", mp4FrameRate: 30 }` before reporting failure to the user. The recursion is safe because of the existing `exportRunIdRef` bump mechanism — the outer call's own `finally` block naturally no-ops once the inner retry has taken over (verified via code-level reasoning, documented in the original commit).

## Whisper ASR pipeline (`electron/ipc/captions/`)

`generate.ts` is the orchestrator: extracts a WAV (dual-track, independently transcribing mic and system audio to avoid cross-talk confusion, then merging via `mergeSources.ts`), shells out to a locally-staged `whisper-cli` binary (built from source at `npm run build:whisper-runtime` time via `scripts/build-whisper-runtime.mjs`, whisper.cpp v1.8.4) with `-ojf` for full JSON output (word-level timestamps + detected language), falls back to `-osrt`-only parsing if the runtime doesn't support JSON. `silence.ts`'s `resegmentCuesBySilence` re-segments whisper's raw word stream into phrase/sentence-level cues using real ffmpeg `silencedetect` output. The whisper *model* itself (`ggml-small.bin`) is a separate, optional user download (`electron/ipc/captions/whisper.ts`) — distinct from the whisper *runtime binary*, which is bundled at build time.

`captionValidation.ts` (renderer-side, pure) is the defensive layer: `sanitizeCaptionCues()` drops any cue with a non-positive duration and clamps bounds into `[0, videoDurationMs]` before ASR output ever reaches project state — wired into `useAutoCaptionController.ts` right where `generateAutoCaptions` results land.

## Local AI / LLM integration (Phase 4C)

- **`electron/ipc/ai/modelManager.ts`**: a fully generic model download/checksum/storage manager, not tied to any specific model. `getModelStatus()` returns `"not-downloaded" | "downloaded" | "corrupted"` (SHA-256 verified). `downloadModel()` downloads to a `.download` temp path, verifies checksum, only then renames into place; supports cancellation via `AbortSignal`. Deliberately separate from the older whisper-model downloader in `electron/ipc/captions/whisper.ts` (which has no checksum/cancellation and was left untouched to avoid regressing a working feature).
- **Model in use**: Gemma 4 E4B, Q4_0 GGUF quant, ~4.3 GiB, stored at `AI_MODELS_DIR` (`~/Library/Application Support/Screenly/ai-models/gemma-4-E4B-it-Q4_0.gguf` on macOS). URL/SHA-256 constants live in `electron/ipc/constants.ts` (`GEMMA4_E4B_MODEL_*`).
- **Inference runtime**: `@electron/llm` (npm, official Electron org package, wraps `node-llama-cpp`). Loaded once in `electron/main.ts` via `loadElectronLlm({ getModelPath })` **before any window is created** (required by the package). This auto-injects `window.electronAi` into every renderer via its own preload mechanism (additive to our own `electronAPI` preload, not a replacement — Electron supports multiple session-level preloads). The model itself only actually loads into memory when a renderer calls `window.electronAi.create({ modelAlias })`, and the actual inference process is a separate Electron **utility process** (not the main process, not the renderer) — this is what satisfies "AI must not block the recorder."
- **Renderer-side safe wrapper**: `src/lib/ai/localModelProvider.ts` — `promptLocalModelForJson()` is the ONLY function in the app that talks to `window.electronAi` directly. It lazily initializes the model (checking `getAiModelStatus()` first — never assumes the model is ready), requests JSON-schema-constrained output (`node-llama-cpp`'s grammar-based structured generation — the model literally cannot produce invalid JSON), and re-validates the parsed result against a caller-supplied type guard before returning `{ ok: true, data }`. Any failure at any step (not downloaded, timeout, malformed JSON, failed validation) returns `{ ok: false, reason }` — **never throws**. Every AI feature is built on top of this one function and must follow the same pattern: try the model, validate deterministically, fall back to a heuristic (or report unavailable) on any failure.
- **`src/lib/ai/reasoningOutcome.ts`**: the shared `ReasoningTier` (`"tier-0-heuristic" | "tier-1-small-local" | "tier-2-multimodal-local" | "apple-native"`) / `ReasoningOutcome<T>` vocabulary every AI feature returns, so the UI can honestly label whether an answer came from the real model or a fallback.

## Testing conventions

- **Vitest**, run via `npm run test` (or `npx vitest run <path>` for a subset). ~2000+ tests as of writing.
- Convention: test **pure logic**, not React hooks/components directly (this codebase has no `@testing-library/react` dependency). When a hook wraps meaningful logic, extract that logic into a pure, separately-testable module first (e.g., `presentationSuggestionsReviewState.ts` holds the pure state transitions that `usePresentationSuggestionsReview.ts` is a thin wrapper around) — follow this pattern for new hooks.
- Network/native-module mocking convention: `vi.mock("node:https", ...)` / `vi.mock("node:child_process", ...)` etc. with a real `EventEmitter`/`Readable` stream mock, not a bare stub — see `electron/ipc/ai/modelManager.test.ts` for a full worked example (mocked HTTPS transport, real temp-file assertions).
- `npm run typecheck` and `npm run lint` (Biome) must both be clean (aside from one long-standing pre-existing warning in `ProjectThumbnail.tsx` about an effect dependency — known, not caused by this project's work, leave it alone unless specifically asked to fix it).
- `npm run i18n:check` must pass whenever any locale JSON file changes — it enforces structural (key) parity across all 11 locales (`en, de, es, fr, it, ko, nl, pt-BR, ru, zh-CN, zh-TW`). When adding a new user-facing string, add real translations to ALL 11 locale files, not just English with a fallback default — this project's convention is genuine translation, not English-everywhere-with-a-default-string.

## Current (pre-redesign) editor layout — read before touching Phase 5 work

Full survey findings (for the design-divergence audit and IA redesign):

- **`EditorShell.tsx`**: root layout. Top: `EditorHeader` (single horizontal bar — Home/breadcrumb, project rename, Clips toggle, Undo/Redo, Feedback, Export). Middle row: `EditorSidebar` (left) + `EditorPreviewPanel` (center, flex-1). Bottom: `EditorTimelinePanel` (fixed-percentage-height strip, 22% / 180–280px).
- **`EditorSidebar.tsx`** is actually TWO things combined: a persistent 64px-wide vertical icon rail (`nav`, `ToggleButtonGroup` — Scene/Cursor/Webcam/Captions/Settings, 5 icons, account avatar pinned to the bottom) **plus** a fixed 320px-wide inspector panel (`aside`) immediately to its right, hosting `SettingsPanel.tsx`. There is no separate right-side panel anywhere today.
- **`SettingsPanel.tsx`** (~3450 lines): section switching is icon-rail-driven (`EditorEffectSection` type, `switch` statement inside the component, ~12 cases). Several sections (`clip`, `zoom`, `audio`, `caption` — singular) are only reachable via timeline-item selection, not directly from the icon rail. **Naming trap already discovered and fixed once**: `captionsSectionContent` (plural — the real "Captions" tab content, Language/Animation/Generate Captions/Transcript/AI Tools) vs. `captionSectionContent` (singular — a different, per-cue-selection-only section). Adding new caption-related UI to the wrong one is an easy, silent mistake (typechecks fine, just never renders) — verify with a live click-through, not just a source read, if you touch this area.
- **`EditorPreviewPanel.tsx`**: fixed-aspect-ratio preview via CSS container queries (`containerType: "size"`, `min(100cqw, calc(100cqh * ratio))`), a 3-column playback transport (`grid-cols-[1fr_auto_1fr]`) below it.
- **Timeline subsystem** (`src/components/video-editor/timeline/`, 40+ files): 6 distinct row/track types today (zoom, clip, annotation ×N stacked, audio ×N stacked, source-audio, captions) — more than a naive "4 tracks" assumption. Real filmstrip thumbnails (`ClipFilmstrip.tsx`), real waveform rendering (`AudioWaveform.tsx`), single fixed-height mode only (no compact/expanded toggle exists yet — a real gap vs. the Phase 5 redesign brief's "compact + expanded precision mode" requirement).
- **Wallpapers** (`src/lib/wallpapers.ts` + `public/wallpapers/`): 25 curated entries in `BUILT_IN_WALLPAPERS`, all real bundled JPEG/video files (not CSS gradients) — physically at `public/wallpapers/`, mirrored into the packaged app at build time. Filenames closely mirror Apple's own macOS wallpaper names (`tahoe-light.jpg`, `sequoia-blue.jpg`, etc.) with **no licensing documentation anywhere**. `public/wallpapers/` also contains several orphaned files not referenced by the curated list (`wallpaper1.jpg`, `wallpaper7.jpg`, etc. — check before deleting, may be referenced elsewhere). `WallpaperGrid.tsx` itself is a generic, source-agnostic grid component — swapping the wallpaper collection only requires changing `wallpapers.ts` + the asset files, not the grid UI.
- **Design tokens exist but are wired into nothing**: `SCREENLY_Brand_Kit_Concept_2/screenly-design-tokens.{css,json}` define the color palette, radius scale, and motion easing — zero blur/glass/shadow tokens, zero imports anywhere in `src/`. This is the starting point for the Liquid Glass system, not a finished foundation.
- **Accessibility baseline that already exists**: `prefers-reduced-motion` is handled in `src/App.css`, `src/index.css`, and a couple of components (`RawRecordings.tsx`, `ProjectThumbnail.tsx`). `prefers-reduced-transparency` has **zero existing handling anywhere** — build it fresh for the glass system, there's no pattern to extend.
- **App icon regeneration pipeline** (used once already, will be needed again if the icon changes further): render `branding/source-assets/Screenly.svg` to a 1024px master PNG via `qlmanage -t -s 1024 -o /tmp <svg-path>` (macOS Quick Look thumbnailer — no `rsvg-convert`/`inkscape`/`cairosvg` available in this environment), then use Python/Pillow to downsample to every required size and build a macOS `.iconset` folder (`icon_16x16.png` ... `icon_512x512@2x.png` naming convention), then `iconutil -c icns <iconset-dir> -o icons/icons/mac/icon.icns`. The `.ico` (Windows) can be saved directly by Pillow with `Image.save(path, sizes=[...])`. PNG set for `icons/icons/png/*.png` (16 through 1024) generated the same way. electron-builder reads these paths directly per `electron-builder.json5`'s `icon` keys — no other wiring needed once the files are regenerated.

---
*Last updated: 2026-09-28. Update this file whenever the process model, data model, a major subsystem, or a testing convention changes.*
