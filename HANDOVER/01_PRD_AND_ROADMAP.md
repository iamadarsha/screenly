# SCREENLY — PRD & Roadmap

This is the complete governing plan: the original 6-phase PRD (summarized faithfully, not paraphrased away from its intent), plus the features added *beyond* that original PRD at the operator's explicit request (local AI, voiceover, full design redesign). Status is marked per phase/feature as of the date at the bottom of this file — **update the status marks whenever work changes them.**

The original PRD's full text lives at `/Users/iamadarsha/Downloads/SCREENLY_END_TO_END_PRD_CLAUDE_CODE_PROMPT_v3.md` (outside the repo — this summary is the authoritative in-repo reference; do not edit the original PRD file itself per the operator's standing instruction).

## Governing principles (apply to every phase, every feature, forever)

1. **Exactly six original phases** — don't reorder or restart them.
2. **No unnecessary rewrite** — reuse/compose existing code; the capture and export pipelines are especially sacred.
3. **Deterministic editing** — every AI-assisted feature must reduce to real, deterministic editor operations. No AI feature is allowed to directly and silently mutate project state — always preview/accept/reject, never "automatic silent mutation."
4. **Recovery beats failure** — prefer graceful degradation and safe fallbacks over hard failures, everywhere (recording, export, AI).
5. **AI must not block the recorder** — any AI/local-model work must never stall the core recording/editing/export path.
6. **AI fallback hierarchy** (applies to every AI feature): model installed → use local model. Model unavailable → deterministic heuristic. Heuristic unavailable → disable only that one enhancement, never crash or corrupt project state.

## Phase 1 — Foundation, Identity, Rebrand — ✅ DONE

Rebranded the forked Recordly codebase to Screenly: app icon, bundle IDs, window titles, project file extension (`.screenly`, with legacy `.recordly`/`.openscreen` still openable), i18n strings across 11 locales, GitHub release target, electron-builder config. Verified by grepping the *compiled* app bundle for leftover "Recordly" strings (source-only grep repeatedly missed real occurrences — always verify the built artifact, not just source, for this kind of check) — took 7 build cycles to reach zero.

**Known deliberate exceptions** (not oversights): `services/recordly-share/` (a separate deployed Cloudflare Worker, left untouched — renaming might break a live deployed API), native capture helper internal binary/file names (`electron/native/bin/recordly-*` — zero user visibility, real regression risk to rename), some internal auth symbol/file names (`recordlyAuth.ts` etc. — the actual user-facing text in them is already fixed, only internal identifiers lag).

**Newly found and flagged this session, not yet fixed**: saved project files still use the `.recordly` file extension (should be `.screenly`) — spun off as a separate background task, see `03_FEATURE_STATUS_AND_TESTING.md` known issues.

**App icon**: was hand-built as an SVG approximation in Phase 1 (no clean vector export existed in the brand kit at the time). **Corrected in a later session** once the operator supplied real reference images — see `04_DECISIONS_AND_NEXT_STEPS.md` for the exact construction technique (two overlapping rounded-rect "ribbon" bars, not a single thin stroke). Source: `branding/source-assets/Screenly.svg`. Regenerate the full icon set with the Python/PIL/`iconutil` pipeline documented in `02_ARCHITECTURE.md` whenever the SVG changes.

## Phase 2 — Recording Reliability + Capture Workflow — ✅ DONE, regression-gated

- **Recording Guardian**: disk-space monitoring, checkpoint files (crash recovery), media-health (stall detection).
- **Retake Mode**: both a file-picker retake path and a fully inline in-editor re-recording path (cross-window HUD↔editor handoff via a `pendingRetake` main-process state slot).
- **Instant Replay**: rolling background capture buffer + global-shortcut save. Shipped with a real, live-discovered native bug fixed: avfoundation reported a broken/nonsensical timebase in the test environment, silently preventing the segment muxer from ever rotating chunks — fixed by forcing a constant output frame rate (`-r 30`) in the segment-capture ffmpeg args (`electron/ipc/recording/replayBuffer.ts`).
- **Full regression gate** run live against the real signed app via CDP: record → pause → resume → stop → edit → export, confirmed end-to-end. Retake-mode's live interactive click-through was not re-verified in the final gate pass (a CDP editor-window-target availability gap, not an app defect) — still covered by its own unit tests and an earlier session's live cross-window verification.

## Phase 3 — Editor, Studio, Export, Sharing — ✅ DONE, acceptance criteria met

- **Export Doctor** (Feature 5): real pre-export validation (`src/components/video-editor/export/exportPreflight.ts` — source readiness, timeline validity, disk space, caption availability) blocks hard failures before wasting an export attempt; a new automatic one-shot "safe export" retry (`safeExportSettings.ts`) falls back to the most conservative legacy/WebCodecs/1080p30 profile before ever reporting "Export failed," matching the PRD's explicit "don't show failure when a fallback exists" requirement.
- **Smart Presentation Director** (Feature 4): a deterministic suggestion engine (`src/components/video-editor/suggestions/presentationSuggestions.ts`) covering a 10-kind schema, with real generation for the 3 kinds backed by actual telemetry (zoom, click-effect, chapter-marker). A full review UI (`PresentationSuggestionsPanel.tsx`) with Preview/Accept/Dismiss/Accept-all, honestly gating "Accept" off for kinds with no real overlay type to apply to yet (click-effect, chapter-marker) rather than faking it.
- **Studio Polish** (Feature 6): most of the PRD's list already existed pre-session (crop, frame styling, wallpapers, cursor styling, zooms, speed regions, annotations). Two real gaps identified and *deliberately deferred* (not built): webcam background blur/removal (genuinely needs AI person-segmentation to be a real feature — blurring the whole webcam frame indiscriminately would blur the presenter's own face too, so this correctly belongs with the Phase 4 AI work, not Phase 3) and a keyboard-shortcut timeline overlay (buildable without AI, but a real standalone feature of its own — not started).
- Pre-export "route / estimated size / estimated time" display from the PRD's example copy was not built (UI-only nicety, not in the acceptance criteria, safe to pick up anytime).

## Phase 4 — Local AI Intelligence — 🟡 IN PROGRESS

The PRD's own sub-phases:

### 4A — ASR foundation — ✅ DONE
Whisper.cpp integration already existed substantially (dual mic+system-track transcription, silence-aware resegmentation, word-level JSON output with an SRT fallback) before this work started. Built the 3 genuinely-missing pieces:
- **Transcript validation** (`src/components/video-editor/captionValidation.ts`): `validateCaptionCues`/`sanitizeCaptionCues`, wired defensively into the caption-generation pipeline so a corrupt whisper JSON parse can no longer corrupt project state.
- **Language detection**: whisper's JSON output already contained a `result.language` field that nothing read — now threaded end-to-end from the parser through to a "Detected language: English" line in the Captions settings UI. **Live-verified with a real recording and real speech** (see `03_FEATURE_STATUS_AND_TESTING.md`).
- **Multilingual data model**: `AutoCaptionSettings.detectedLanguage` (distinct from the pre-existing `language` field, which is only whisper's input *hint*, never a detection result), persisted across save/load.
- Not done: persisting the raw pre-segmentation transcript as its own storage artifact (no consumer needs it yet).

### 4B — Transcript editor — ✅ DONE
A real "delete-to-cut" ripple edit: select a word range in a new transcript panel (`TranscriptPanel.tsx`), delete it, and the cut ripples through the whole timeline (clips, zoom, annotations, audio, remaining captions) as one atomic, single-undo-step action. Built by composing existing primitives (`rippleRegions`, `packClipSequence`, a new `planClipSplit`-based `planTimeRangeDeletion` in `clipSequence.ts`) rather than inventing new low-level timeline logic. Also: filler-word detection (deliberately conservative word list — um/uh/erm/hmm/huh only, to avoid false positives on real words like "so"/"like"), and within-cue repeated-phrase (stutter/false-start) detection with a one-click fix.
Not built: silence-region detection surfaced in the editor UI (the underlying ffmpeg logic is pure/reusable but only reachable today via the caption-generation IPC flow — exposing it standalone needs a new IPC handler, a real but modest lift); cross-cue-boundary repeated-phrase detection (scoped to within-cue only).

### 4C — Local reasoning runtime — ✅ DONE (infra + one real model integration)
The operator explicitly deferred the model *decision* initially ("skip the model decisions for now"), then later explicitly approved and requested a real model be downloaded and used ("so download it and proceed" / "ensure whatever llm you download must be the latest available as of today"). Built:
- **`electron/ipc/ai/modelManager.ts`**: a generic model download/checksum/storage manager (works for any future model, not hardcoded to one) — real SHA-256 corruption detection, cancellation via `AbortSignal`, atomic temp-file-then-rename downloads.
- **Real local LLM integration**: **Gemma 4 E4B** (instruction-tuned, Q4_0 GGUF quantization, ~4.3 GiB), verified as the actual current model via live web research (real release: April 2026, Apache-2.0, from Google DeepMind; GGUF conversion from the official `ggml-org` Hugging Face org — the same maintainers as whisper.cpp/llama.cpp). URL and SHA-256 checksum verified directly against the live Hugging Face repo listing before use (never guessed). Inference via **`@electron/llm`** (official Electron-org package, wraps `node-llama-cpp`, runs the model in a utility process via Chromium Mojo IPC — exactly matching the PRD's "AI must not block" / "background worker" requirement) — see `02_ARCHITECTURE.md` for the exact wiring.
- Model has been **downloaded and its checksum verified live** (`a555b900214b477d8880e7832e0b8925e139b0159640036b09fe472b6f2097f2` — matched exactly).
- **`src/lib/ai/reasoningOutcome.ts`**: a minimal shared vocabulary (`ReasoningTier`, `ReasoningOutcome<T>`) for the PRD's fallback hierarchy — deliberately small rather than a speculative provider/class hierarchy.

### 4D — AI features — 🟡 IN PROGRESS
Three real features built on the 4C runtime, each demonstrating a different point in the fallback hierarchy:
- **AI Chapters** (`src/lib/ai/aiChapters.ts`): tries the model for real topic-aware chaptering; falls back to the existing deterministic pause-based heuristic (`chapterHeuristics.ts`) if the model isn't available. Every model-proposed chapter is re-validated (timestamp bounds, title length) before being trusted, never blindly accepted.
- **AI Title** (`aiTitle.ts`): model-generated title; falls back to a deterministic proxy (opening words of the transcript) without a model.
- **AI Summary** (`aiSummary.ts`): model-generated only — **deliberately has no heuristic fallback** (there is no honest deterministic substitute for real summarization), reports "unavailable" rather than faking a summary when the model can't be used. This is the intentional demonstration of the fallback hierarchy's third tier ("heuristic unavailable → disable only that enhancement").
- UI: `AiToolsPanel.tsx`, rendered in the Captions settings section (model download/status/delete controls + the 3 feature buttons with results).
- **Status as of last update**: code complete, unit-tested (27 tests across the 3 feature modules + validators), typechecked, model downloaded and checksum-verified. **Not yet live-tested end-to-end in the running app** (a build was in progress / had just completed when this phase of work was paused for other urgent requests — see `03_FEATURE_STATUS_AND_TESTING.md` for exact pending-verification status, and pick this up first if you're continuing this thread).
- Remaining 4D features from the original PRD list not yet started: "Make This Video Better," AI publishing pack, screen understanding, mistake detection, Ask My Recording, semantic library search, presenter-background AI, local voice cleanup.

## Phase 5 — Complete Screenly Experience + Liquid Glass — 🟡 IN PROGRESS (redesign, not yet Phase-1-style "done")

The original PRD's Phase 5 (full visual re-theme, "Liquid Glass" material system) was **explicitly never started** in any earlier session — confirmed via survey (design tokens in `SCREENLY_Brand_Kit_Concept_2/screenly-design-tokens.{css,json}` exist but are wired into zero components). The operator then issued a **separate, more detailed design-only directive** (pasted in full mid-session) that supersedes/elaborates the original Phase 5 scope. Treat that directive as the authoritative spec for this phase; summary:

- **Design divergence audit**: document every UI element that still visually/structurally resembles the original Recordly app (create `SCREENLY_DESIGN_DIVERGENCE_AUDIT.md`). A full codebase survey for this was completed — see `02_ARCHITECTURE.md`'s "Current (pre-redesign) editor layout" section for the raw findings; the audit doc itself may still need writing/finalizing — check its existence before assuming done.
- **New information architecture**: replace the current left-docked icon-rail + 320px-fixed-inspector layout with the operator's specified direction — a horizontal workspace switcher (Home/Record/Studio/Library/Publish), canvas-first studio with a right-side collapsible inspector, an expanded multi-track timeline with distinct visual identities per track type, contextual/progressive-disclosure controls instead of everything-always-visible.
- **Liquid Glass material system**: translucent floating navigation and controls, glass inspector surfaces, restrained gradients, full light/dark, and — critically — real accessibility support: reduced-transparency, reduced-motion (partial support already exists, see `02_ARCHITECTURE.md`), keyboard operability, visible focus states.
- **Complete wallpaper collection replacement**: the current 25 built-in wallpapers are **real bundled image files whose filenames closely mirror Apple's own stock macOS wallpaper names** (`tahoe-light.jpg`, `sequoia-blue.jpg`, `ventura-dark.jpg`, etc.) with **zero licensing/credits documentation anywhere in the repo** — a real risk, not a cosmetic one. Must be replaced with ≥20 new wallpapers across 8 categories (Abstract, Aurora, Alpine, Coast, Botanical, Cosmic, Topographic, Minimal), ≥3840×2160, each with verified/recorded licensing (`SCREENLY_WALLPAPER_CREDITS.md`) or original/procedural generation. The operator's own explicit additional instruction: **"all wallpapers must be Apple-like, Mac-like"** in aesthetic (i.e., match the current polish/style direction, just with original/licensed source material instead of Apple's own filenames/assets).
- **Visual QA report** (`SCREENLY_VISUAL_QA.md`): before/after screenshot comparison proving material difference from Recordly, even with the logo hidden.
- **Status**: audit research done (see `02_ARCHITECTURE.md`); wallpaper generation infrastructure (procedural Python/PIL pipeline) started; actual IA rewrite, Liquid Glass component work, and the wallpaper asset production itself are **not yet done** as of this file's last update. This is explicitly the largest remaining body of work — treat it as its own multi-session effort, not something to rush.

## Phase 6 — Final polish, torture testing, release — ⬜ NOT STARTED
Full test pass, capture/export/AI torture testing, performance pass, release packaging. Blocked on Phases 4 and 5 reaching a stable state first, per the PRD's own phase-gating rule.

## Features added beyond the original PRD (operator-requested, not in the original 6 phases)

1. **Voiceover / local TTS narration** — requested, researched, **not yet built**. Recommended approach: `kokoro-js` (npm, Apache-2.0, runs Kokoro-82M fully locally via ONNX/Transformers.js, no Python subprocess) for the actual engine; reference implementations exist at `davealaw/kokoro-electron` and `gooidtto/domekokoro-electron` on GitHub for the Electron integration pattern. See `04_DECISIONS_AND_NEXT_STEPS.md` for the full reasoning and alternative considered (Chatterbox, for voice cloning — heavier, no ready-made Node wrapper found).
2. **This `HANDOVER/` folder itself** — a standing requirement to keep 5 synthesized markdown docs current after every meaningful change, so any future agent (in this tool or another) can onboard from these files alone.

---
*Last updated: 2026-09-28. Update the phase/feature status marks above whenever work changes them — this file must always reflect current reality, not the state at time of writing.*
