# SCREENLY — MASTER PRODUCT + ENGINEERING PRD
## Claude Code / Sonnet 5 Medium Thinking — 6-Phase End-to-End Build Directive
### Version 2.0 — 25 September 2026

> **Execution contract**
>
> This file is the single source of truth for building **SCREENLY**, a new screen-recording, editing, AI and publishing application built inside the downloaded **Recordly** working folder.
>
> The operator will provide the complete SCREENLY design asset package separately/in the working folder. Treat those assets and the supplied SCREENLY brand-guideline PDF as the visual source of truth.
>
> Use the existing Recordly repository as the starting implementation because it already contains a mature capture → editor → export pipeline. Preserve proven behavior first; add features around it. Do not rewrite working subsystems merely for aesthetic architecture.
>
> Execute the project in **exactly six phases**. Do not invent Phase 7. At every phase boundary, stop, verify, update the persistent state files, reread this PRD end-to-end, then continue.
>
> Target execution agent: **Claude Code using Sonnet 5 Medium Thinking**.
>
> Primary engineering philosophy: **stability first, thin layers, deterministic media operations, local-first AI, graceful fallback, minimal dependencies, maximum reuse of verified working code, and exhaustive regression testing**.

---

# 0. PRODUCT NORTH STAR

## Product

**SCREENLY**

### Brand line
**Record. Explain. Share. Effortlessly.**

### Brand story
**Capture Ideas. Make Them Clearer.**

SCREENLY is a local-first desktop recording and content-production application that makes high-quality screen recordings feel effortless:

**Record → Protect → Understand → Edit → Polish → Export → Share**

It should serve:
- product demos
- software tutorials
- bug reproductions
- technical walkthroughs
- sales/demo videos
- educational content
- internal documentation
- social clips
- narrated presentations

The default experience must remain simple. Advanced behavior appears progressively rather than as a dense control wall.

## Core product promise

1. A recording should almost never be lost.
2. A bad take should not force a complete re-record.
3. The application should automatically make recordings look better.
4. AI should save editing time without taking destructive control.
5. AI should be local-first and transparent.
6. Every AI edit must be reviewable and undoable.
7. Recording quality must never be sacrificed merely because AI is running.
8. Export should recover from failures instead of simply failing.
9. SCREENLY should look like its own product, not a re-skinned Recordly.
10. Existing stable Recordly functionality must remain intact unless a regression is demonstrably fixed.

---

# 1. NON-NEGOTIABLE RULES

## 1.1 Exactly six phases

The entire implementation is:

- Phase 1 — Foundation, audit, legal/identity separation, rebrand, assets
- Phase 2 — Recording reliability and capture workflow
- Phase 3 — Editing, studio polish, export, sharing
- Phase 4 — Local AI intelligence
- Phase 5 — SCREENLY visual system + complete UX integration
- Phase 6 — Hardening, regression, performance, release candidate

Do not split these into more phases in the implementation state.

## 1.2 No unnecessary rewrite

Before touching code:
- identify what already works;
- preserve it;
- extend it;
- only replace it when the replacement is measurably safer or required for a feature;
- do not perform broad architecture cleanup “because it is nicer”.

A successful existing subsystem beats a theoretically cleaner new subsystem.

## 1.3 Capture path is sacred

Never put a heavy LLM inference loop on the capture hot path.

Recording must remain responsive even with:
- webcam enabled
- microphone enabled
- system audio enabled
- 60 FPS capture
- 4K capture
- cursor telemetry
- AI features enabled

AI analysis runs primarily after or around recording using background workers. Live AI is optional and must automatically yield when recording health deteriorates.

## 1.4 Deterministic editing

AI may propose:
- cut
- trim
- zoom
- speed change
- chapter
- caption
- layout change
- annotation
- camera framing
- cleanup

But the application executes those operations through deterministic editor commands.

AI does **not** directly rewrite media bytes or own the timeline.

All AI mutations must:
- be represented as normal editor operations;
- be undoable;
- be serializable into the project;
- have timestamps;
- have a confidence/reason;
- be previewable before destructive export.

## 1.5 Recovery beats failure

Whenever a subsystem fails, prefer:

**continue degraded → preserve valid data → notify clearly → give recovery action**

over:

**abort → delete temporary media → show generic error**

Never intentionally discard the last known-good recording artifact.

## 1.6 State must survive context loss

Do not rely on conversational memory.

Create and maintain:

- `SCREENLY_EXECUTION_STATE.md`
- `SCREENLY_DECISIONS.md`
- `SCREENLY_REGRESSION_MATRIX.md`
- `SCREENLY_REUSE_LEDGER.md`
- `SCREENLY_UI_INVENTORY.md`
- `SCREENLY_AI_MODEL_STATE.md`
- `SCREENLY_RELEASE_READINESS.md`

At the end of every phase, update all affected files.

---

# 2. CURRENT RECORDLY BASELINE — WHAT TO PRESERVE

The current repository already contains substantial functionality. Do not rebuild equivalent mechanisms from scratch.

The repository currently includes:
- native capture helpers
- macOS ScreenCaptureKit integration
- Windows native capture / fallback paths
- recording state handling
- microphone and system-audio capture
- webcam capture/preview
- cursor telemetry
- interaction analysis
- automatic zoom suggestions
- project persistence
- timeline editing
- captions
- caption sidecars
- webcam overlays
- frame/background styling
- Pixi-based composition
- MP4/GIF export
- native and WebCodecs/export fallback routes
- extensive unit/UI tests
- cloud/share infrastructure
- diagnostics
- release/build scripts

Important verified paths in the current repository include:

`src/hooks/useScreenRecorder.ts`

`src/lib/exporter/modernVideoExporter.ts`

`electron/ipc/captions/`

`electron/ipc/recording/`

`electron/ipc/export/`

`electron/native/ScreenCaptureKitRecorder.*`

`src/components/launch/hooks/useWebcamPreviewOverlay.ts`

`src/components/video-editor/`

`src/components/video-editor/timeline/`

`src/components/video-editor/captions/`

`src/components/video-editor/export/`

`src/components/video-editor/hooks/useFreshRecordingAutoZoom.ts`

`src/components/video-editor/videoPlayback/`

The current repository already has extensive tests around:
- capture
- webcam
- captions
- export
- project persistence
- timeline behavior
- native helpers
- cursor telemetry
- media timing
- UI smoke flows

Treat these as a regression safety net.

---

# 3. RESEARCH-BACKED OPEN-SOURCE REUSE STRATEGY

## 3.1 Rule: clone for inspection, not blindly for copying

When useful, clone selected repositories into a disposable research directory:

`.research/opensource/<repo-name>`

Use:

`git clone --depth 1 <url> .research/opensource/<repo-name>`

Do not vendor entire external applications unless the exact portion is needed.

For every reused source component:
1. inspect its LICENSE;
2. inspect README/architecture;
3. identify exact files/functions;
4. record repository URL;
5. record commit SHA;
6. record license;
7. record what was reused;
8. preserve required notices;
9. run SCREENLY tests after integration.

Update `SCREENLY_REUSE_LEDGER.md`.

## 3.2 High-value references

### OpenScreen
Repository:
https://github.com/getopenscreen/openscreen

Current project status and README indicate:
- native capture
- auto/manual zoom
- cursor smoothing/click effects
- local Whisper captions
- transcript-driven editing
- optional translation
- local/optional AI edit workflows
- GPU export with CPU fallback
- cross-platform support
- MIT licensing

Use as a **high-value reference and possible selective source** for:
- auto-zoom behavior
- local captions
- transcript editing
- AI edit command patterns
- export fallback patterns

Current roadmap:
https://github.com/getopenscreen/openscreen/blob/main/ROADMAP.md

License:
MIT.

### OpenScreen Studio
Repository:
https://github.com/AlanRoybal/openscreen-studio

Useful ideas/code to inspect:
- local Whisper captioning
- click-driven auto zoom
- deterministic cursor rendering
- silence/filler cleanup
- local DeepFilterNet voice enhancement
- hardware H.264/HEVC export
- native capture metadata design
- preview/export consistency

License:
MIT.

Voice enhancement uses DeepFilterNet under permissive open-source licensing; verify exact bundled component notices before redistribution.

### Focra
Repository:
https://github.com/focra-app/Focra

Useful:
- local Whisper caption pipeline
- simple Electron/React integration
- caption customization
- zoom keyframe editor
- secure native save behavior

License:
MIT.

### Reframed
Repository:
https://github.com/jkuri/Reframed

Useful especially as reference for macOS:
- WhisperKit speech-to-text
- word-level timestamps
- auto-detect language
- captions as timeline/media layer
- SRT/VTT export
- auto zoom
- cursor smoothing
- camera regions
- RNNoise/noise-reduction patterns
- multi-format export

License:
MIT.

Use carefully: this is a macOS-specific project and should not force a macOS-only architecture into SCREENLY.

### whisper.cpp
Repository:
https://github.com/ggml-org/whisper.cpp

License:
MIT.

Useful as the cross-platform native local speech engine where the current bundled caption runtime is insufficient.

Supports local inference and Apple Silicon acceleration paths. Prefer this for a cross-platform post-recording ASR backend if practical.

### MLX / mlx-swift-lm
Repositories:
https://github.com/ml-explore/mlx
https://github.com/ml-explore/mlx-swift
https://github.com/ml-explore/mlx-swift-lm

Useful for:
- Apple Silicon local model acceleration
- optional native macOS local AI
- model loading/inference
- Apple-optimized local AI paths

Verify the exact license of every vendored component and preserve notices.

### llama.cpp
Repository:
https://github.com/ggml-org/llama.cpp

License:
MIT.

Useful as a compact local model runtime / optional inference backend.

Do not assume every multimodal model/runtime combination is equally stable. Probe the exact model/backend pair before adopting it.

### Gemma 4
Recommended default local reasoning model to evaluate:
`google/gemma-4-E4B-it`

Model card:
https://huggingface.co/google/gemma-4-E4B-it

Current model card identifies:
- multimodal input
- image/video/audio capabilities
- multilingual capability
- large context window
- tool/function calling
- smaller models intended for efficient local execution

The model weights page currently lists Apache 2.0 on Hugging Face, but Gemma has additional Google terms governing use/distribution. Read and comply with the current Gemma terms before redistributing model weights.

Do not bundle a 16 GB+ raw model into the default SCREENLY installer.

Preferred approach:
- base app ships without model weights;
- user opens AI settings;
- model manager downloads a verified model pack;
- checksum is verified;
- model is stored in the OS-appropriate application data directory;
- user can delete/re-download;
- AI is disabled until a model is installed;
- no network calls occur during AI inference.

### Projects to exclude from direct code reuse

#### Capso
Do not copy source from:
https://github.com/lzhgus/Capso

Its current licensing is BSL-1.1. Treat it as feature inspiration only unless legal review confirms a permitted use.

#### ClipAgent
https://github.com/DharambirAgrawal/clip-agent

This is itself derived from Recordly/AGPL code and therefore does not provide a meaningful licensing shortcut over the current base. Use it for ideas such as MCP/tool semantics only, not as a default copy source.

#### Screenity
Use only as a feature benchmark unless the exact license and source components are confirmed suitable for direct reuse.

---

# 4. LICENSING AND ORIGIN RULES

The current Recordly repository is AGPL-3.0 and its repository `LICENSE.md` includes additional attribution/branding terms.

This means:

- do not delete required Recordly attribution/legal notices merely to make the application appear unrelated;
- do not falsely claim the implementation has no lineage;
- do not strip mandatory copyright/license text;
- do not remove third-party notices;
- do not remove legal credits that a license requires.

At the same time, the shipped application should become visually and product-wise **SCREENLY**, not Recordly.

That means remove stale Recordly product branding from:
- app title
- package/product name
- user-facing labels
- onboarding
- recorder HUD
- menus
- editor headings
- empty states
- settings
- notifications
- export UI
- library labels
- website links
- application icons
- splash/loading screens
- project naming
- app storage labels
- default filenames
- file extensions
- app bundle metadata
- release channel names
- telemetry/event names
- internal product constants where safe
- docs and screenshots generated for SCREENLY

Keep required source/license/attribution information where legally necessary, preferably in a dedicated legal/about surface rather than contaminating the product UI.

Do not attempt to “hide” provenance from source/history/legal notices.

---

# 5. BRAND / DESIGN SOURCE OF TRUTH

The supplied SCREENLY brand guideline defines:

- Lettermark: flowing S ribbon + red recording dot
- Primary gradient:
  - Electric Blue `#3882F6`
  - Violet `#8B5CF6`
  - Magenta `#EC4899`
  - Coral `#FF686B`
  - Amber `#F59E0B`
- Neutrals:
  - Navy `#0B1020`
  - Slate `#334155`
  - Gray `#64748B`
  - Silver `#CBD5E1`
  - Light `#F1F5F9`
  - White `#FFFFFF`
- SF Pro Display / SF Pro Text as the primary typographic direction, with Inter as a cross-platform fallback
- 44×44pt minimum interaction targets
- Dynamic Type / accessibility
- VoiceOver labels
- Reduce Motion support
- clear state communication
- 160ms micro-interactions
- 240ms normal transitions
- 360ms emphasis motion
- easing `cubic-bezier(.2,.8,.2,1)`
- sentence-case UI copy
- restrained AI sparkle motifs
- clearly visible camera preview during camera recording

Source: supplied SCREENLY brand guideline PDF, September 2026.

The product should look **heavily Liquid Glass inspired**, but do not use a glass effect on every pixel.

Apple’s current design guidance says Liquid Glass is strongest as a distinct functional layer for controls/navigation, while content should generally use standard materials. It also emphasizes legibility, hierarchy, accessibility and adaptive layouts:

https://developer.apple.com/design/human-interface-guidelines/materials

https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass

https://developer.apple.com/wwdc26/guides/design/

Implement:
- strong translucent navigation
- translucent toolbars
- floating inspectors
- glass action controls
- glass command surfaces
- glass dialogs
- subtle background refraction
- depth through light/shadow rather than heavy borders
- content panels that remain readable
- adaptive light/dark appearance
- reduced-transparency fallback
- high-contrast fallback

Do not simply paste CSS blur onto every component.

---

# 6. TEN MAJOR PRODUCT FEATURES

These ten are mandatory.

## Feature 1 — RECORDING GUARDIAN
### “Never Lose a Recording”

SCREENLY continuously protects a recording from:
- application crash
- unexpected renderer failure
- encoder failure
- microphone failure
- webcam failure
- system-audio failure
- device disconnect
- low disk
- temporary capture interruption
- app shutdown during finalization

Implementation behavior:
- write recoverable recording artifacts incrementally;
- maintain a valid checkpoint or fragment;
- flush metadata frequently;
- never hold the entire recording only in RAM;
- maintain session manifest;
- maintain media-health state;
- monitor disk capacity;
- detect dropped-frame spikes;
- detect stalled audio/video streams;
- detect disconnected input devices;
- maintain recovery markers.

Recovery UX:
> “SCREENLY protected the recording up to 18:42.”

Actions:
- Recover
- Open Editor
- Export Safe Copy
- Discard

Never hide a recoverable artifact.

### Failsafe policy

If webcam fails:
- continue screen + audio.

If mic fails:
- continue system audio/screen.

If system audio fails:
- continue screen + mic.

If cursor telemetry fails:
- continue recording and disable only cursor-dependent enhancements.

If native capture fails:
- fall back to the best supported capture mechanism.

If preferred encoder fails:
- switch encoder route.

If disk becomes critically low:
- warn;
- stop optional processing;
- lower future bitrate/resolution only when necessary;
- preserve the already-recorded media;
- never silently delete the recording.

---

## Feature 2 — RETAKE MODE + CLIPS
### “Retake This Part”

Workflow:
1. Record long take.
2. Stop or pause.
3. Select a bad segment.
4. Click `Retake`.
5. SCREENLY re-opens recording for only that interval/context.
6. New take is inserted as an alternate clip.
7. User chooses Take A / Take B or keeps original.

Required:
- replace selected range
- append clip
- alternate takes
- reorder clips
- trim clips
- re-record clip
- preserve source media
- undo
- seamless timeline timing

Do not re-record the whole video just to correct a 12-second mistake.

---

## Feature 3 — INSTANT REPLAY + RESCUE CLIP

Add an optional rolling buffer.

Modes:
- 30s
- 60s
- 120s
- 300s

User presses a global shortcut:
`Save Replay`

SCREENLY saves the previous N seconds.

Use disk-backed rolling chunks rather than an ever-growing in-memory Blob array.

Possible uses:
- unexpected bug
- great demo moment
- accidental success
- missed recording start
- gaming/tutorial moment
- quick clip creation

Replay must not interfere with the normal recording path.

---

## Feature 4 — SMART PRESENTATION DIRECTOR

One action:

**Make This Recording Look Better**

It can generate suggested:
- zooms
- camera layout changes
- cursor emphasis
- click effects
- shortcut overlays
- timeline flags
- emphasis moments
- chapter markers
- scene transitions
- focus regions

Use deterministic telemetry first:
- click events
- cursor movement
- dwell
- scene changes
- existing zoom suggestions

Use AI only when semantic understanding materially improves the result.

Each suggestion:
- shows confidence;
- explains reason;
- previews effect;
- can be accepted/rejected;
- can be bulk-applied;
- remains undoable.

No automatic silent mutation.

---

## Feature 5 — EXPORT DOCTOR

Before export, run a preflight.

Check:
- source readable
- source duration
- track durations
- track IDs
- timing continuity
- audio availability
- camera availability
- composition validity
- output dimensions
- aspect ratio
- codec support
- hardware encoder availability
- disk capacity
- timeline segments
- captions
- media references
- project integrity

Then route through a deterministic fallback chain.

Example:
1. preferred hardware route
2. alternate hardware route
3. native software route
4. WebCodecs route
5. FFmpeg-safe route
6. conservative 1080p30 safe export

The actual available routes must be discovered from the current repository, not guessed.

Display:
> Export route: Hardware H.264
>
> Estimated size: 42 MB
>
> Estimated time: 18 s

On failure:
> “The preferred encoder failed. SCREENLY switched to Safe Export.”

Do not present “Export failed” when a viable fallback exists.

---

## Feature 6 — STUDIO POLISH

Preserve and improve the current editor while making it feel new.

Required:
- crop
- frame styling
- wallpapers
- gradients
- blur
- shadows
- rounded corners
- aspect ratios
- motion blur
- cursor smoothing
- cursor size
- cursor click bounce
- cursor sway
- synthetic cursor overlay
- zooms
- speed regions
- annotations
- image overlays
- text overlays
- keyboard-shortcut overlays
- device/browser/Mac frames where feasible
- audio cleanup
- camera layout
- presenter background controls

Add:
- background removal
- background blur
- presenter cutout
- simple auto-framing
- presenter pop-out
- camera color correction if low-risk
- camera crop
- camera position presets

Background removal must have a deterministic fallback:
- AI segmentation if available;
- camera blur;
- unchanged camera;
- never hide the camera entirely after a model failure.

---

## Feature 7 — TRANSCRIPT → TIMELINE

Make the transcript a first-class editing surface.

User can:
- click a word → jump to timestamp
- select text → cut segment
- delete filler word
- remove long silence
- remove repeated sentence
- delete false start
- edit transcript text
- regenerate only a cue range
- merge/split caption segments

Words must map to timeline timestamps.

Edits remain synchronized.

Captions are derived from the transcript data model, not separately maintained duplicate text.

---

## Feature 8 — MULTILINGUAL CAPTIONS + TRANSLATION

Generate:
- original transcript
- captions
- SRT
- VTT
- burned-in captions
- translated captions

Language:
- source auto-detect
- user-selectable source
- many target languages
- RTL support
- Indic scripts
- CJK wrapping
- punctuation/line-length controls

Maintain:
- source transcript
- translation layer
- caption styling layer

Do not replace the source transcript when translating.

---

## Feature 9 — AI PUBLISHING PACK

After analysis, generate locally:
- title
- description
- summary
- chapter names
- keywords
- social post drafts
- short clip suggestions
- thumbnail text suggestions
- “what this video teaches” summary

Allow:
`Copy`
`Edit`
`Regenerate`
`Apply to metadata`

No cloud required.

---

## Feature 10 — ASK MY RECORDING + SMART LIBRARY

Add a private local semantic search layer.

Queries:
- “Where did I talk about the API key?”
- “When did I open Settings?”
- “Show every place I clicked Submit.”
- “Where did I mention authentication?”
- “Find the first time I demonstrated login.”
- “Find mistakes.”
- “Create a 60-second summary from this recording.”

Build local indexes over:
- transcript
- timestamps
- scene boundaries
- click events
- cursor activity
- captions
- chapters
- optional sampled frames
- project metadata

Search returns:
- recording
- timestamp
- semantic result
- jump-to-time action

Do not build a giant vector database unless measurement shows it is needed. Start with simple local metadata/search structures and only introduce embeddings when useful.

---

# 7. LOCAL AI SUITE — DETAILED SPECIFICATION

## AI architecture principle

Use specialized models for specialized jobs.

### ASR
Preferred:
- existing bundled whisper runtime if already reliable;
- whisper.cpp for a robust cross-platform fallback;
- WhisperKit for a macOS-specialized option when it materially improves quality/performance.

ASR outputs:
- segment timestamps
- word timestamps
- language
- confidence where supported

### Reasoning model
Preferred model to evaluate:
**Gemma 4 E4B instruction-tuned**

Use it for:
- cleanup classification
- chapter generation
- summaries
- title generation
- translation
- edit planning
- semantic questions
- screen understanding
- mistake detection
- structured command generation

Do not use it for:
- actual video encoding
- low-level frame-by-frame rendering
- timeline execution
- capture control

### Optional Apple-native route
On macOS, probe:
- Foundation Models
- MLX
- mlx-swift-lm

The provider abstraction should allow:
- no local reasoning model
- Apple on-device model where available
- local Gemma runtime
- another explicitly supported local model in future

Never hardwire UI directly to one model implementation.

---

# 8. AI FEATURES IN DETAIL

## 8.1 Local captions

Post-recording default.

Optional live mode:
- clearly labeled;
- background priority;
- auto-pauses or disables on capture-health warning;
- never crashes the recorder.

## 8.2 AI cleanup

Detect:
- filler words
- long silence
- false starts
- repeated phrases
- sentence restarts
- dead air
- obvious “let me redo that” segments

Return structured operations:

```json
{
  "action": "remove_segment",
  "start": 42.18,
  "end": 44.71,
  "reason": "long_silence",
  "confidence": 0.96
}
```

All operations must pass validation before reaching the timeline.

## 8.3 “Make This Video Better”

Pipeline:
1. read project metadata
2. read transcript
3. read cursor/click telemetry
4. identify scene boundaries
5. sample representative frames
6. run semantic analysis
7. generate structured suggestions
8. validate every suggestion
9. display suggestion cards
10. apply only after user confirmation unless user explicitly chooses Auto Apply

## 8.4 AI screen understanding

Use sparse frame sampling, not full-frame LLM inference.

Possible labels:
- browser
- settings
- dialog
- code editor
- terminal
- spreadsheet
- document
- form
- video
- dashboard
- presentation
- menu

Semantic questions:
- What changed?
- What is the current action?
- What UI element is being demonstrated?
- Is this frame important?
- Is there a likely chapter boundary?

## 8.5 Automatic chapters

Use:
- transcript topic changes
- scene changes
- major cursor interaction clusters
- semantic frame cues

Output:
```text
00:00 Introduction
00:18 Open Settings
00:47 Configure API
01:31 Test Integration
02:05 Final Result
```

Each chapter jumps to its timestamp.

## 8.6 AI mistake detector

Compare:
- spoken instruction
- visible action
- cursor/click telemetry
- screen state

Examples:
> “Select Advanced”
>
> screen shows General selected

or:
> “Click Save”
>
> no Save action detected

Mark:
- possible mismatch
- uncertain
- strong mismatch

Never state AI guesses as fact.

## 8.7 Ask My Recording

Use local retrieval first.

Do not send the whole recording into an LLM context.

Retrieve:
- likely timestamp windows
- transcript snippets
- relevant sampled frames
- relevant events

Then ask the local model only about the retrieved context.

## 8.8 Translation

Preserve:
- source transcript
- target transcript
- original timings
- translated cues

Optimize line breaking for target language.

## 8.9 AI voice cleanup

Use local DSP/ML only.

Candidate reference:
DeepFilterNet via OpenScreen Studio.

User-facing toggle:
`Clean up voice`

Possible controls:
- Off
- Light
- Balanced
- Strong

Fallback:
- original audio remains available;
- processing failure never blocks export.

## 8.10 AI presenter/background

Pipeline:
- segmentation model if installed
- confidence threshold
- temporal smoothing
- edge cleanup
- fallback to blur
- fallback to original camera

No single bad frame should produce visible flicker.

## 8.11 AI edit command protocol

Define an internal schema.

Example:

```json
{
  "version": 1,
  "operations": [
    {
      "type": "remove_segment",
      "startMs": 42180,
      "endMs": 44710,
      "reason": "long_silence",
      "confidence": 0.96
    },
    {
      "type": "add_zoom",
      "startMs": 73100,
      "endMs": 79000,
      "focus": {
        "x": 0.63,
        "y": 0.42
      },
      "confidence": 0.91
    }
  ]
}
```

Validate against:
- timeline bounds
- nonnegative duration
- overlap rules
- supported operation types
- project schema version
- source duration
- editor invariants

Reject unsafe operations.

---

# 9. MODEL MANAGER

Implement:
- model catalog
- local installed models
- download
- pause/resume
- cancel
- checksum verification
- disk-space preflight
- remove model
- update model
- model capability display
- model version pinning
- offline operation

Example UI:

`AI Models`

`Speech`
- Whisper model
- Installed
- 1.2 GB

`Reasoning`
- Gemma 4 E4B
- Download 4-bit
- ~X GB

Never invent model size in UI. Read actual downloaded package size.

No model download occurs until user explicitly enables AI/model installation.

---

# 10. AI PRIVACY CONTRACT

By default:
- no cloud AI
- no automatic upload
- no telemetry containing transcript/video
- no remote processing
- no background network inference

The UI should say:
> “AI runs on your device.”

If an optional external provider is later supported:
- require explicit opt-in;
- name provider;
- explain what data leaves device;
- store key securely;
- provide disable button;
- show provider state.

---

# 11. RECORDING PIPELINE SAFETY

## Capture lifecycle

Implement clear state transitions:

`Idle`
→ `Preparing`
→ `Recording`
→ `Paused`
→ `Finalizing`
→ `Protected`
→ `Ready`
or
`Recoverable`
or
`FailedWithRecovery`

Do not invent parallel conflicting recording states.

## Media invariants

At every important boundary verify:
- duration > 0
- frame/time monotonicity
- no impossible negative duration
- valid dimensions
- audio/video alignment
- webcam duration independent from screen duration
- no empty required track
- no orphan composition track
- project source still exists or recovery path exists

Never clamp webcam timeline using only screen duration if the tracks have independent timing.

---

# 12. WEBCAM REQUIREMENTS

Camera mode must always show a usable live preview before and during recording.

Requirements:
- preview visible
- preview remains in sync
- selectable camera
- mirror toggle
- resize
- position
- shape
- shadow
- crop
- framing
- background options
- no headless camera mode by default

If preview cannot start:
- clearly state it;
- offer retry;
- allow screen-only recording.

Do not allow a camera-recording state where the user believes the camera is visible but the camera is actually headless.

Avoid frame-rate degradation:
- preview can use reduced-resolution stream;
- recording stream can use separate quality;
- do not run expensive AI segmentation at full capture rate;
- throttle nonessential analysis.

---

# 13. RETAKE / CLIP DATA MODEL

Extend project schema without breaking old projects.

Prefer:
- schema version
- migrations
- backward-compatible defaults

A clip should know:
- source media
- source in/out
- timeline in/out
- take ID
- selected/alternate state

Do not destructively overwrite source recordings merely to implement Retake.

---

# 14. REPLAY BUFFER

Use rolling chunks.

Requirements:
- disk-backed
- bounded storage
- explicit user limit
- cleanup old chunks
- safe shutdown
- no memory leak
- save replay atomically
- immediately open or add to library

Never create an unlimited `Blob[]` history.

---

# 15. SMART PRESENTATION ENGINE

Layered algorithm:

### Pass A — deterministic
- clicks
- dwells
- cursor movement
- scene changes
- existing zoom suggestions
- keyboard shortcuts
- explicit user flags

### Pass B — optional semantic
Use local AI to understand:
- what the click was likely demonstrating
- whether the moment is important
- whether layout should switch
- whether a chapter should start
- whether a zoom would improve comprehension

### Pass C — scoring
Score:
- interaction strength
- semantic importance
- visual importance
- duration suitability
- overlap
- already-emphasized state

### Pass D — presentation proposal
Generate:
- zoom
- emphasis
- camera layout
- chapter
- flag
- shortcut
- cleanup

Never generate 30 nearly identical zooms.

---

# 16. STUDIO EDITOR UX

The editor should have a calm high-end hierarchy.

Top:
- project title
- undo/redo
- save state
- AI action
- export

Center:
- preview

Lower:
- timeline

Side:
- contextual inspector

AI assistant should appear as an intelligent overlay/panel, not permanently occupy 30% of the screen.

Main primary action:
**Make This Video Better**

Secondary:
- Captions
- Cleanup
- Chapters
- Translate
- Export

---

# 17. DESIGN DIFFERENTIATION FROM RECORDLY

SCREENLY must not look like Recordly.

Do not merely:
- rename Recordly
- swap icon
- change primary color
- retain same navigation
- retain same sidebar layout
- retain same copy
- retain same component appearance

Use:
- SCREENLY information architecture
- new navigation hierarchy
- new iconography
- new typography hierarchy
- large liquid-glass surfaces
- gradient light effects
- floating functional layers
- new recording HUD
- new library cards
- new AI panel
- new export flow
- new empty states
- new onboarding
- new settings organization
- new terminology
- new motion language

The supplied design assets are the visual authority.

Before implementation, build a UI inventory:
- screen
- state
- component
- interaction
- responsive behavior
- empty state
- error state
- loading state
- disabled state
- reduced-motion state

---

# 18. ACCESSIBILITY

Required:
- keyboard navigation
- focus indicators
- readable text on translucent surfaces
- Dynamic Type where applicable
- VoiceOver labels
- non-color state communication
- 44×44 interaction targets
- Reduce Motion
- reduced transparency / increased contrast fallback
- screen-reader-readable progress
- captions accessible without color dependence

---

# 19. INTERNATIONALIZATION

Do not hardcode user-facing strings.

Support:
- English first
- translation-ready architecture
- RTL-safe layout
- date/time formatting
- caption wrapping
- long-language strings
- keyboard shortcuts that remain usable across locales

---

# 20. PERFORMANCE BUDGET

Do not guess. Measure.

Capture:
- stable frame rate
- low main-thread load
- bounded memory
- no uncontrolled queue growth

Editor:
- responsive scrubbing
- preview maintains usable FPS
- background AI does not freeze UI

Export:
- show actual progress
- include ETA only when measurable
- hardware path preferred
- fallback path automatic

AI:
- background worker
- cancellable
- resumable where practical
- progress
- no capture interference

---

# 21. TESTING STRATEGY

Every phase ends with:

1. targeted tests
2. existing regression suite
3. typecheck
4. lint
5. build
6. UI smoke
7. relevant media fixture tests
8. manual verification where hardware is required
9. state-file update
10. PRD reread
11. phase gate

Never say “done” because tests were not available. State exactly what passed, failed or remains environment-limited.

---

# 22. MEDIA TEST MATRIX

Maintain deterministic fixture recordings covering:

### Video
- 1080p30
- 1080p60
- 1440p30
- 1440p60
- 4K30
- 4K60 where test machine can sustain it
- variable duration
- short < 3 sec
- 10 sec
- 60 sec
- 5 min
- 30 min
- long-run stress

### Audio
- mic only
- system only
- both
- no audio
- silent audio
- mono
- stereo
- sample-rate variants when supported

### Webcam
- no camera
- camera
- camera starts late
- camera stops early
- camera duration mismatch
- camera device disconnect

### Cursor
- dense clicks
- sparse clicks
- no clicks
- drags
- double-click
- text selection
- multi-monitor movement

### Edits
- trim
- split
- zoom
- speed
- annotations
- webcam
- captions
- translation
- cleanup
- combined edit chains

### Export
- H.264
- HEVC when supported
- GIF
- multiple resolutions
- multiple aspect ratios
- captions
- webcam
- complex compositions
- fallback encoder
- interrupted export
- cancellation
- resume/retry where supported

---

# 23. AI EVALUATION SUITE

Build an AI fixture set.

Each fixture contains:
- source video
- transcript
- event metadata
- expected high-level semantic facts
- acceptable edit operations

Evaluate:
- transcript quality
- timestamp quality
- caption segmentation
- translation integrity
- chapter usefulness
- hallucination rate
- edit-operation validity
- false-positive mistake detection
- latency
- memory use

AI must never be judged only by “the model replied”.

The generated operation must survive deterministic validation.

---

# 24. RELEASE / PACKAGING IDENTITY

SCREENLY package identity must differ from Recordly.

Review:
- package.json
- product name
- application ID
- desktop bundle metadata
- executable name
- default project extension
- user-data paths
- logs
- temp folders
- update channel
- installer display names
- file associations
- MIME descriptions
- window title
- application menu
- website links
- support links

Target project extension:
`.screenly`

Use migrations to open old project formats only when technically safe.

Never silently corrupt old projects.

---

# 25. SIX PHASES — EXACT EXECUTION PLAN

# PHASE 1 — FOUNDATION, AUDIT, IDENTITY, ASSETS

### Objective
Turn the Recordly working folder into a clean SCREENLY development foundation without breaking current functionality.

### Steps
1. Read this PRD fully.
2. Inspect repository root.
3. Read package metadata.
4. Run baseline:
   - install
   - typecheck
   - lint
   - unit tests
   - UI tests if environment permits
   - build if environment permits
5. Record exact baseline.
6. Build repository inventory.
7. Identify current capture/editor/export/caption/project paths.
8. Identify all Recordly user-facing strings.
9. Identify all Recordly branding assets.
10. Identify all Recordly URLs.
11. Identify all Recordly package/app identifiers.
12. Identify current legal/third-party notices.
13. Inspect supplied SCREENLY design asset directory recursively.
14. Read supplied brand-guideline PDF if present.
15. Build SCREENLY UI inventory.
16. Create new SCREENLY theme/token system.
17. Replace visible product identity with SCREENLY.
18. Introduce `.screenly` project migration strategy.
19. Preserve existing behavior.
20. Create state/reuse/legal ledgers.
21. Clone external research repos only when needed.
22. Verify exact licenses before reuse.

### Phase 1 acceptance
- baseline tests recorded
- app still launches
- existing recording works
- existing editor works
- existing export works
- SCREENLY name appears in product UI
- stale Recordly product references removed from normal product surfaces
- required legal attribution retained
- brand assets loaded
- no destructive rewrite
- state files created
- `SCREENLY_REUSE_LEDGER.md` complete

### Regression gate
Run full current suite before proceeding.

---

# PHASE 2 — RECORDING RELIABILITY + CAPTURE WORKFLOW

### Objective
Implement Features 1–3 and harden capture.

### Build
1. Recording Guardian.
2. checkpoint/session manifest.
3. recovery artifact.
4. low-disk warning.
5. media-health monitor.
6. native capture fallback.
7. mic/audio fallback.
8. device reconnection behavior.
9. Retake Mode.
10. Clips.
11. Alternate takes.
12. Replay Buffer.
13. Save Replay.
14. recording workflow redesign.
15. visible camera preview verification.

### Preserve
- existing native capture
- existing cursor telemetry
- existing permissions
- existing diagnostics
- existing camera preview mechanics where reliable

### Phase 2 tests
- start/stop/start repeatedly
- pause/resume
- camera on/off
- mic failure
- system audio failure
- camera failure
- app interrupted
- low disk simulation
- replay save
- retake replacement
- alternate clip
- long recording
- repeated recordings in same session

### Phase 2 acceptance
No valid recording is silently lost in tested failure cases.

### Regression gate
Full existing suite + new recovery/clip/replay tests.

---

# PHASE 3 — EDITOR, STUDIO, EXPORT, SHARING

### Objective
Implement Features 4–6 and make the finished video workflow state-of-the-art without destabilizing the current renderer.

### Build
1. Smart Presentation Director.
2. deterministic auto-layout suggestions.
3. smart zoom enhancements.
4. shortcut overlay.
5. timeline flags.
6. AI-ready suggestion schema.
7. Studio background/presenter polish.
8. presenter cutout.
9. background blur.
10. cursor/click polish.
11. Export Doctor.
12. export preflight.
13. fallback chain.
14. safe export.
15. export recovery.
16. share flow polish.
17. library/share state preservation.
18. device/browser frame system if practical from available open-source references/assets.

### External reference priority
Inspect:
- OpenScreen
- OpenScreen Studio
- Focra
- Reframed

Copy only exact high-value pieces that are:
- licensed
- self-contained
- compatible
- actually better than current implementation

### Phase 3 tests
- suggestion creation
- zoom overlap
- editor preview/export consistency
- presenter fallback
- every export route
- forced fallback
- cancellation
- retry
- share after export
- share after fallback export
- corrupted source preflight

### Phase 3 acceptance
- no regression to current editing
- exports always report the actual route
- safe fallback produces valid media where possible
- AI-ready presentation suggestions are deterministic enough to function without an LLM

### Regression gate
Full suite + export matrix.

---

# PHASE 4 — LOCAL AI INTELLIGENCE

### Objective
Implement Features 7–10 plus the full local AI layer.

### Build order

#### 4A — ASR foundation
1. stabilize current caption runtime
2. word-level timestamps
3. language detection
4. transcript storage
5. transcript validation
6. caption derivation
7. SRT/VTT
8. multilingual caption data model

#### 4B — Transcript editor
1. word selection
2. delete-to-cut
3. silence regions
4. filler detection
5. repeated phrase detection
6. undoable cleanup

#### 4C — Local reasoning runtime
1. provider abstraction
2. model manager
3. model download
4. checksum
5. local storage
6. Gemma 4 E4B evaluation
7. optional Apple-native route
8. cancellation
9. background worker
10. structured JSON schema
11. deterministic validation

#### 4D — AI features
1. Make This Video Better
2. chapters
3. title
4. summary
5. translation
6. AI publishing pack
7. screen understanding
8. mistake detection
9. Ask My Recording
10. semantic library search
11. presenter background AI
12. local voice cleanup

### Critical rule
AI must not block the recorder.

### AI fallback hierarchy

For every AI feature:

`AI model installed`
→ use local model

`model unavailable`
→ use deterministic heuristic

`heuristic unavailable`
→ disable only that enhancement

Never make recording/editor/export unusable because AI is missing.

### Phase 4 tests
- model absent
- model installed
- model download interrupted
- model corrupted
- model deleted
- transcript generation
- translation
- AI cleanup
- malformed model output
- invalid JSON
- out-of-range timestamps
- overlapping edits
- hallucinated commands
- cancellation
- repeated runs
- offline mode
- recording during AI processing

### Phase 4 acceptance
All AI-generated actions remain deterministic editor operations.

No model failure can corrupt project state.

---

# PHASE 5 — COMPLETE SCREENLY EXPERIENCE + LIQUID GLASS

### Objective
Make the finished product feel like SCREENLY everywhere.

### Build
1. onboarding
2. recorder HUD
3. recording controls
4. camera preview
5. library
6. project cards
7. editor shell
8. timeline
9. AI panel
10. captions panel
11. export dialog
12. share dialog
13. settings
14. model manager
15. accessibility surfaces
16. keyboard shortcut system
17. command palette
18. empty states
19. loading states
20. failure states
21. recovery states
22. update states

### Liquid Glass execution
Use the provided assets + Apple design guidance.

Build a coherent material system:
- glass regular
- glass clear where justified
- content material
- high contrast fallback
- reduced transparency fallback

Use gradients as accent energy, not as a wallpaper on every control.

### Product copy
Use direct language:
- `Start Recording`
- `Generate Captions`
- `Make This Video Better`
- `Clean Up`
- `Translate`
- `Find in Recording`
- `Export Safely`
- `Save Replay`
- `Retake`
- `Your recording is ready.`

### Phase 5 tests
- keyboard-only flow
- reduced motion
- reduced transparency
- high contrast
- light/dark
- narrow window
- large window
- multi-display
- long translated strings
- RTL layout where supported
- camera preview
- AI panel
- export flow

### Phase 5 acceptance
The application should be unmistakably SCREENLY.

No ordinary user-facing surface should resemble Recordly’s old product identity.

---

# PHASE 6 — HARDENING, TORTURE TESTS, PERFORMANCE, RC

### Objective
No new features. Only hardening, fixing, measuring, documenting, and release preparation.

### 6A — Full test pass
Run:
- typecheck
- lint
- formatting
- unit
- integration
- browser/UI
- native helper tests
- export tests
- caption tests
- project migration tests
- accessibility tests
- AI schema tests

### 6B — Capture torture
Test:
- 30 FPS
- 60 FPS
- 4K
- camera
- mic
- system audio
- long recording
- pause/resume
- repeated start/stop
- sleep/wake where supported
- display disconnect/reconnect where practical
- audio device disconnect/reconnect
- webcam disconnect/reconnect
- disk pressure
- app crash simulation
- renderer recovery
- native backend failure

### 6C — Export torture
Test:
- hardware encoder present
- hardware encoder unavailable
- hardware encoder failure
- software route
- complex composition
- captions
- webcam mismatch
- audio mismatch
- zero-content audio
- multiple video tracks
- long recording
- cancellation
- retry
- low disk

### 6D — AI torture
Test:
- no AI model
- small model
- normal model
- corrupted model
- malformed output
- slow inference
- canceled inference
- offline mode
- huge transcript
- multilingual transcript
- RTL transcript
- long recording
- no speech
- noisy speech

### 6E — Performance
Measure:
- CPU
- memory
- GPU
- disk
- main-thread responsiveness
- capture FPS
- dropped frames
- AI latency
- export time
- model load time
- model memory

Record real measurements.

Do not invent benchmark numbers.

### 6F — Release
Create/update:
- `SCREENLY_RELEASE_READINESS.md`
- `SCREENLY_REGRESSION_MATRIX.md`
- `SCREENLY_REUSE_LEDGER.md`
- `SCREENLY_DECISIONS.md`
- `THIRD_PARTY_NOTICES`
- legal/about screen
- migration documentation
- model documentation
- recovery documentation

### Phase 6 acceptance
Release candidate only when:
- baseline behavior remains intact
- all new features work
- known failure modes have recoveries
- no open release-blocking crash
- packaging works
- legal notices are present
- third-party notices are complete
- SCREENLY branding is consistent
- AI remains optional
- offline mode is functional
- regression matrix is green except explicitly documented environment-only limitations

---

# 26. CLAUDE CODE EXECUTION PROTOCOL

## Before every phase

1. Read this full PRD.
2. Read `SCREENLY_EXECUTION_STATE.md`.
3. Read `SCREENLY_DECISIONS.md`.
4. Read only relevant entries from `SCREENLY_REGRESSION_MATRIX.md`.
5. Inspect current repository state.
6. Check uncommitted changes.
7. Do not overwrite unrelated work.
8. Identify exactly which phase is active.
9. Work only on that phase.

## During the phase

Use this loop:

`Inspect → Small change → Test → Inspect result → Small change → Test`

Do not:
- edit 20 files before testing;
- rewrite entire folders;
- replace working capture/export systems without evidence;
- introduce libraries without necessity;
- create parallel duplicate implementations.

## After every meaningful change

Run the smallest useful check.

Examples:
- data model → unit test
- React component → UI test
- export change → media fixture
- native capture change → native lifecycle test
- AI schema → malformed-output test

## End of phase

1. Run phase tests.
2. Run regression tests.
3. Run typecheck.
4. Run lint.
5. Run build if available.
6. Update state files.
7. Record failures precisely.
8. Record next-step notes.
9. Re-read this PRD end-to-end.
10. Only then begin next phase.

---

# 27. CAVEMAN / TOKEN-ECONOMY MODE

The user explicitly requests token-efficient development.

Caveman-style output compression is useful for agent communication but does not reduce reasoning complexity by itself.

Reference:
https://github.com/Karnonson/caveman

Use it when configured.

Rules:
- concise progress updates
- no repeated restatement of PRD
- use paths and symbols exactly
- keep code/error text exact
- avoid filler prose
- summarize test results in compact tables
- keep persistent state in files rather than chat
- use `rg`, `git grep`, `sed`, targeted file reads
- never dump huge files into context unless needed
- inspect directory trees before reading entire files
- use focused searches before broad reads
- use small commits/checkpoints
- keep a compact decision log

Important:
Caveman is an output/context-efficiency technique, not a license to skip verification.

If the agent has a local Caveman installation:
- use it;
- keep technical identifiers exact;
- switch to normal detailed prose for security/legal/release-blocking decisions.

## ADHAT instruction

The user also requested an “ADHAT” technique.

No authoritative public Claude Code/agent standard matching that name was verified during research.

Therefore:
- do not invent an ADHAT specification;
- if a local/user-supplied ADHAT skill/config exists, inspect and follow it;
- otherwise use the explicit token-saving protocol in this PRD;
- never pretend an unverified technique exists.

---

# 28. CONTEXT MANAGEMENT

Never make the entire repository part of every model turn.

Preferred sequence:

`locate → inspect relevant file → patch → test → record result`

Use:
- repository tree
- grep/search
- file-specific reads
- targeted tests
- state files

Do not repeatedly paste:
- package-lock
- giant generated files
- build output
- complete test logs

Persist only:
- summary
- failures
- decisions
- exact command
- exact result
- exact path

---

# 29. GIT / CHECKPOINT RULES

After a stable submilestone:
- inspect diff
- run tests
- checkpoint with a focused commit if the repository workflow permits

Examples:
- `feat: establish screenly identity`
- `feat: add recording recovery`
- `feat: add retake clips`
- `feat: add replay buffer`
- `feat: add export doctor`
- `feat: add local transcript editor`
- `feat: add local ai analysis`
- `feat: apply screenly liquid glass ui`
- `test: harden release matrix`

Do not create giant opaque commits containing unrelated changes.

Do not rewrite user work.

---

# 30. FAILURE HANDLING FOR CLAUDE CODE

When a test fails:

### Do not
- immediately rewrite the subsystem
- disable the failing test
- lower test coverage
- suppress errors
- say “probably environmental” without evidence

### Do
1. capture exact failure
2. locate smallest responsible path
3. reproduce with minimal fixture
4. fix locally
5. rerun targeted test
6. rerun regression
7. document

When blocked by unavailable hardware:
- state what could not be verified;
- preserve a deterministic software simulation/test;
- never claim the hardware path passed.

---

# 31. NO-FEATURE-CREEP RULE

Do not add:
- social network
- team collaboration suite
- full cloud DAM
- browser extension marketplace overhaul
- full mobile app
- SaaS backend rewrite
- plugin platform rewrite
- account system rewrite
- analytics platform
- arbitrary “AI agents”

unless already required to preserve existing functionality.

The product goal is:
**world-class recorder + editor + local AI + publishing, not an entire productivity platform.**

---

# 32. FINAL FEATURE CHECKLIST

Before release, verify all ten:

[ ] 1. Recording Guardian  
[ ] 2. Retake + Clips  
[ ] 3. Instant Replay + Rescue Clip  
[ ] 4. Smart Presentation Director  
[ ] 5. Export Doctor + fallback  
[ ] 6. Studio Polish + presenter/background tools  
[ ] 7. Transcript → Timeline  
[ ] 8. Multilingual Captions + Translation  
[ ] 9. AI Publishing Pack  
[ ] 10. Ask My Recording + Smart Library  

AI suite:

[ ] local transcription  
[ ] word timestamps  
[ ] language detection  
[ ] caption generation  
[ ] filler/silence cleanup  
[ ] transcript editing  
[ ] translation  
[ ] chapters  
[ ] title  
[ ] summary  
[ ] Make This Video Better  
[ ] screen understanding  
[ ] mistake detection  
[ ] Ask My Recording  
[ ] semantic recording search  
[ ] presenter background removal  
[ ] voice cleanup  
[ ] AI publishing pack  
[ ] structured edit protocol  
[ ] AI model manager  
[ ] offline operation  
[ ] no-model deterministic fallback

Reliability:

[ ] recoverable recording  
[ ] low-disk warning  
[ ] device reconnect  
[ ] audio fallback  
[ ] capture fallback  
[ ] export fallback  
[ ] safe export  
[ ] camera preview  
[ ] bounded replay buffer  
[ ] bounded AI resource usage

Design:

[ ] SCREENLY icon/assets  
[ ] SCREENLY palette  
[ ] SCREENLY typography  
[ ] heavy but disciplined Liquid Glass  
[ ] light/dark  
[ ] accessibility fallback  
[ ] motion spec  
[ ] new information architecture  
[ ] new terminology  
[ ] new empty states  
[ ] new error/recovery states

---

# 33. DEFINITION OF DONE

SCREENLY is done when a new user can:

1. Launch SCREENLY.
2. Record screen.
3. Add camera and microphone.
4. See camera preview.
5. Pause/resume.
6. Stop.
7. Open a protected project.
8. Retake a bad section.
9. Save a replay clip.
10. Click `Make This Video Better`.
11. Review zoom/edit suggestions.
12. Generate local transcript.
13. Edit the video from the transcript.
14. Generate multilingual captions.
15. Generate chapters/title/summary.
16. Search the recording with natural language.
17. Detect a likely spoken-vs-screen mismatch.
18. Clean up audio.
19. Polish webcam/background.
20. Export.
21. Survive export-route failure.
22. Share.
23. Reopen the project later.
24. Use the core application with AI disabled.
25. Use the core application fully offline after models are installed.

And most importantly:

**A normal recording must remain recoverable even when one optional subsystem fails.**

---

# 34. MASTER INSTRUCTION TO CLAUDE CODE

You are operating inside the local Recordly working folder.

You have been instructed to transform that working codebase into **SCREENLY** according to this PRD.

Do not ask the user to restate requirements already present here.

Do not create more than six phases.

Do not stop after scaffolding.

Do not replace working functionality without evidence.

Do not make AI mandatory.

Do not place heavy AI inference in the capture hot path.

Do not silently discard media.

Do not remove legally required license/attribution information.

Do not copy code from a third-party repository before verifying its current license.

Do not copy Capso code.

Prefer selective reuse from permissively licensed projects such as OpenScreen, OpenScreen Studio, Focra, Reframed, whisper.cpp and MLX-related components when technically superior and legally appropriate.

Treat the supplied SCREENLY design assets as the visual source of truth.

Build a product that is visually distinct from Recordly while respecting required legal notices.

Use deterministic media operations.

Use local AI where installed.

Use fallback behavior everywhere a subsystem may fail.

Test after every meaningful change.

Keep a persistent execution state.

At each phase boundary:
- finish
- test
- document
- reread this PRD completely
- continue

Never claim success without evidence.

---

# 35. FIRST COMMAND SEQUENCE

When this PRD is first supplied to Claude Code, execute in this order:

```text
1. Read this PRD completely.
2. Identify the repository root.
3. Read package.json, README, LICENSE.md and third-party notices.
4. Inspect the repository tree.
5. Run the baseline test/typecheck/build commands that are available.
6. Create SCREENLY_EXECUTION_STATE.md.
7. Create SCREENLY_DECISIONS.md.
8. Create SCREENLY_REGRESSION_MATRIX.md.
9. Create SCREENLY_REUSE_LEDGER.md.
10. Create SCREENLY_UI_INVENTORY.md.
11. Create SCREENLY_AI_MODEL_STATE.md.
12. Create SCREENLY_RELEASE_READINESS.md.
13. Discover all SCREENLY design assets recursively.
14. Produce a compact baseline report.
15. Start Phase 1.
```

Do not start Phase 2 until Phase 1 gate passes.

Do not start Phase 3 until Phase 2 gate passes.

Do not start Phase 4 until Phase 3 gate passes.

Do not start Phase 5 until Phase 4 gate passes.

Do not start Phase 6 until Phase 5 gate passes.

Do not declare release until Phase 6 gate passes.

---

# 36. RESEARCH SOURCES

Core technical/product references reviewed for this PRD:

OpenScreen:
https://github.com/getopenscreen/openscreen
https://github.com/getopenscreen/openscreen/blob/main/ROADMAP.md

OpenScreen Studio:
https://github.com/AlanRoybal/openscreen-studio

Focra:
https://github.com/focra-app/Focra

Reframed:
https://github.com/jkuri/Reframed

whisper.cpp:
https://github.com/ggml-org/whisper.cpp

MLX:
https://github.com/ml-explore/mlx
https://github.com/ml-explore/mlx-swift
https://github.com/ml-explore/mlx-swift-lm

llama.cpp:
https://github.com/ggml-org/llama.cpp

Gemma 4 E4B:
https://huggingface.co/google/gemma-4-E4B-it
https://ai.google.dev/gemma/terms

Caveman:
https://github.com/Karnonson/caveman

Apple Liquid Glass / HIG:
https://developer.apple.com/design/human-interface-guidelines/materials
https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass
https://developer.apple.com/wwdc26/guides/design/

Current Recordly starting repository:
https://github.com/webadderallorg/Recordly

---


---

# 38. DEEP-RESEARCH IMPLEMENTATION MAP — CURRENT REPOSITORIES

This section converts the external research into a concrete engineering rule: do not blindly clone entire projects. Inspect the smallest source unit that solves the problem, then port only when the code is compatible, the license is compatible, and the tests justify it.

## 38.1 Primary reference: OpenScreen

Current repository:
https://github.com/getopenscreen/openscreen

OpenScreen is the most relevant external benchmark because it currently combines the same broad product category with local captions, editable transcript, AI-assisted editing, cursor/click metadata, auto zoom and GPU/CPU export fallback.

Relevant current paths discovered during research:

```text
crates/compositor/src/audio.rs
crates/compositor/src/audio_jobs.rs
crates/compositor/src/camera.rs
crates/compositor/src/cursor.rs
crates/compositor/src/cursor_sdf.rs
crates/compositor/src/export_probe.rs
crates/compositor/src/gif_export.rs
crates/compositor/src/timeline_walk.rs

electron/ai-edition/
electron/ai-edition/agent-tools.ts
electron/ai-edition/caption-translate.ts
electron/ai-edition/chat-compaction.ts
electron/ai-edition/chat-service.ts
electron/ai-edition/deep-agent/
electron/ai-edition/document-service.ts
electron/ai-edition/provider-registry.ts
electron/ai-edition/style-preset-service.ts

electron/cli/cliMain.ts

electron/native/whisper-stt/
electron/stt/extractAudio.ts
electron/stt/transcriptionContract.ts
electron/stt/whisperServer.ts

electron/recording/nativeMacCaptureSalvage.ts
electron/recording/nativeMacCaptureStop.ts
electron/recording/nativeWindowsCaptureStop.ts

electron/native/screencapturekit/
electron/native/screencapturekit/Sources/OpenScreenCaptureCore/AudioTrackMixer.swift
electron/native/screencapturekit/Sources/OpenScreenScreenCaptureKitHelper/ScreenCaptureRecorder.swift

src/lib/captioning/
src/lib/captioning/transcribe.ts
src/lib/captioning/transcribe.worker.ts
src/lib/captioning/transcribeCore.ts
src/lib/captioning/transcriptEditing.ts
src/lib/cursorTelemetryBuffer.ts
```

### Exact use policy

Inspect OpenScreen first for:
- transcript editing semantics
- caption segmentation
- local Whisper integration
- AI edit command schemas
- provider abstraction
- AI chat compaction
- recording salvage/recovery
- cursor/camera composition concepts
- export fallback routing
- CLI/agent interaction patterns

Potential direct reuse:
- only MIT-compatible code;
- only the smallest self-contained implementation;
- only after dependency analysis;
- only after recording the source commit and path in the reuse ledger.

Do not merge the entire OpenScreen architecture into SCREENLY.

OpenScreen itself states that its current project is under MIT and that its current implementation includes local on-device captions, editable transcript, AI editing tools and GPU export with automatic CPU fallback.

## 38.2 OpenScreen Studio

Current repository:
https://github.com/AlanRoybal/openscreen-studio

Useful current source areas discovered:

```text
electron/ipc/recordingStream.ts
electron/native/screencapturekit/
electron/native/wgc-capture/
electron/native-bridge/cursor/
electron/recording/
src/components/video-editor/
src/components/video-editor/timeline/
src/components/video-editor/videoPlayback/
src/lib/cursor/
scripts/fetch-caption-model.mjs
```

Inspect it especially for:
- click-driven auto zoom
- cursor/click rendering
- local Whisper
- local DeepFilterNet voice enhancement
- hardware H.264/HEVC
- deterministic preview/export composition
- capture metadata
- audio cleanup integration

Its current repository is MIT-licensed and explicitly identifies DeepFilterNet and Whisper-related components.

Do not copy macOS-specific implementation into the cross-platform core unless the current SCREENLY platform boundary requires it.

## 38.3 Focra

Current repository:
https://github.com/focra-app/Focra

Useful exact source areas:

```text
src/main/recorder.ts
src/main/ipc-handlers.ts
src/renderer/components/editor/CaptionsPanel.tsx
src/renderer/components/editor/Timeline.tsx
src/renderer/components/editor/VideoPreview.tsx
src/renderer/components/editor/ZoomEditor.tsx
src/renderer/components/recording/RecordingPreview.tsx
src/renderer/lib/captioning/
src/renderer/lib/captioning/transcribe.ts
src/renderer/lib/captioning/transcribe.worker.ts
src/renderer/lib/captioning/transcribeCore.ts
src/renderer/lib/cursor/
```

Useful for:
- lightweight local Whisper integration
- Electron/React wiring
- simple caption UI
- zoom editor
- recording preview patterns

Current repository is MIT-licensed.

Do not port UI directly. Reimplement presentation according to SCREENLY assets.

## 38.4 Reframed

Current repository:
https://github.com/jkuri/Reframed

Useful exact areas:

```text
Reframed/Editor/ZoomDetector.swift
Reframed/Editor/ZoomTimeline.swift
Reframed/Editor/ZoomRegion.swift
Reframed/Editor/CursorSmoothing.swift
Reframed/Editor/CursorEffects.swift
Reframed/Editor/CameraRegionEditPopover.swift
Reframed/Editor/EditorState+Captions.swift
Reframed/Editor/EditorState+CameraRegions.swift
Reframed/Editor/EditorState+Zoom.swift

Reframed/Recording/SharedRecordingClock.swift
Reframed/Recording/WebcamCapture.swift
Reframed/Recording/WebcamPreviewWindow.swift
Reframed/Recording/RecordingCoordinator+Lifecycle.swift

Reframed/Utilities/TranscriptionService.swift
Reframed/Utilities/WhisperModelManager.swift
Reframed/Utilities/SubtitleExporter.swift
Reframed/Compositor/FrameRenderer+Captions.swift
Reframed/Compositor/FrameRenderer+Webcam.swift
```

Use for algorithm/reference comparison:
- word-level timestamp handling
- caption model separation
- auto-detect language
- webcam/camera regions
- cursor smoothing
- camera background replacement
- zoom detection
- export options

Current repository is MIT-licensed.

It is macOS-native Swift and therefore is primarily a design/algorithm reference for SCREENLY's Electron/TypeScript architecture.

## 38.5 Screenize

Current repository:
https://github.com/syi0808/screenize

Screenize is paused as of May 2026 and uses Apache-2.0.

It is useful for:
- auto zoom generator decomposition
- cursor/click/keystroke telemetry concepts
- AI-agent-friendly repository instructions
- focused macOS capture/editor patterns

Use as a reference. Do not prioritize it over active projects.

## 38.6 Screenity

Current repository:
https://github.com/alyssaxuu/screenity

Current main branch uses GPLv3.

Use as a feature/reference benchmark only unless the project’s current terms are separately cleared for the intended SCREENLY distribution model.

Do not copy source simply because an implementation looks useful.

## 38.7 ClipAgent

Current repository:
https://github.com/DharambirAgrawal/clip-agent

ClipAgent is a Recordly-derived AGPL project that exposes an MCP server for AI-driven video editing.

Useful concept:
- a model can call small, deterministic media tools:
  - list projects
  - inspect media
  - detect silence
  - detect scene changes
  - scan frames
  - cut silence
  - trim range
  - edit project
  - export

However, because it is itself based on Recordly, it is NOT a clean licensing shortcut.

Design SCREENLY's internal AI tool protocol independently.

## 38.8 Capso

Current repository:
https://github.com/lzhgus/Capso

Current repository license:
Business Source License 1.1.

Its current README explicitly says that for the current license, forking and shipping a competing screen-capture product is not allowed.

Therefore:
- feature inspiration: allowed;
- architecture study: allowed;
- direct source copying for SCREENLY: prohibited unless legal counsel confirms a separate permission/license right.

Do not use Capso code as an implementation shortcut.

---

# 39. EXACT SELECTIVE-REUSE DECISION TREE

For every external code candidate:

```text
Candidate found
      ↓
Read LICENSE
      ↓
Compatible?
 ┌────┴────┐
 NO       YES
 ↓         ↓
REFERENCE  Inspect dependencies
ONLY       ↓
        Smaller self-contained unit?
          ┌────┴────┐
          NO       YES
          ↓         ↓
       REIMPLEMENT  Port selectively
                    ↓
              Add legal notice
                    ↓
              Add source path + SHA
                    ↓
              Add tests
                    ↓
              Run regression
```

Never copy:
- entire repositories;
- whole UI trees;
- branding;
- screenshots;
- logos;
- copyrighted design assets;
- unrelated framework configuration.

Prefer:
- algorithms
- isolated utilities
- state models
- parsers
- deterministic transforms
- test fixtures where their license explicitly permits reuse

When source is ported rather than copied, document:
- original repository
- source file
- source commit
- license
- modifications
- SCREENLY destination path

---

# 40. CURRENT RECORDLY → SCREENLY CODE MAP

Treat the downloaded Recordly tree as the starting implementation.

Do not create a second application beside it.

The agent operates from the repository root.

### Preserve first

```text
src/hooks/useScreenRecorder.ts

electron/ipc/recording/
electron/ipc/export/
electron/ipc/captions/
electron/native/

src/components/video-editor/
src/components/video-editor/timeline/
src/components/video-editor/captions/
src/components/video-editor/export/
src/components/video-editor/project/
src/components/video-editor/videoPlayback/

src/lib/exporter/
src/lib/captioning/
src/lib/cursor/

tests/ui/
```

### Extend rather than replace

Recording:
- `useScreenRecorder`
- native capture helpers
- audio fallback
- diagnostics
- camera preview

Editing:
- timeline model
- editor history
- clip sequence
- captions
- zoom regions
- webcam overlay

Export:
- modern exporter
- native video export
- export routing
- GIF export
- MP4 support
- smoke export automation

Project:
- atomic save
- migration
- metadata
- library

Do not create duplicate second versions of these systems unless a targeted migration plan explicitly requires it.

---

# 41. NEW SCREENLY DOMAIN LAYER

Add small domain modules where new behavior needs a home.

Suggested names only; adapt to actual repository conventions:

```text
src/lib/screenly/
  ai/
  recording/
  recovery/
  retake/
  replay/
  presentation/
  captions/
  translation/
  publishing/
  semantic-search/
  models/
  project/

electron/screenly/
  ai/
  model-runtime/
  recording/
  recovery/
  export/
```

Do not create these directories solely for organization.

Create a directory only when it contains real behavior that improves locality and testing.

---

# 42. LOCAL AI PROVIDER CONTRACT

Define one stable application-level interface.

Conceptually:

```ts
interface ScreenlyAIProvider {
  capabilities(): AICapabilities;
  transcribe(input: AudioInput, options: TranscriptionOptions): Promise<Transcript>;
  translate(input: TranslationInput): Promise<TranslationResult>;
  analyzeRecording(input: RecordingContext): Promise<AnalysisResult>;
  generatePublishingPack(input: PublishingContext): Promise<PublishingPack>;
  answerRecordingQuery(input: RecordingQuery): Promise<RecordingAnswer>;
  proposeEdits(input: EditContext): Promise<EditProposal>;
}
```

Do not expose model-specific APIs to React components.

Provider implementations can be:
- `DeterministicAIProvider`
- `WhisperLocalProvider`
- `GemmaLocalProvider`
- `AppleFoundationModelsProvider` on supported Apple systems
- future providers

All provider outputs must be versioned.

---

# 43. TWO-SPEED AI ARCHITECTURE

SCREENLY should operate in two speeds.

## Fast path

Used while recording:
- no heavy LLM
- minimal telemetry
- audio level
- frame health
- cursor events
- deterministic click detection
- recovery checkpoints

## Deep path

Used after recording:
- Whisper
- scene analysis
- semantic frames
- Gemma
- translation
- cleanup
- chapters
- publishing
- semantic index
- mistake detection

This is a hard reliability boundary.

If deep AI takes:
- 20 seconds
- 2 minutes
- 15 minutes

the recording is already safe and usable.

---

# 44. FRAME SAMPLING STRATEGY FOR LOCAL VISION

Do not feed all video frames to a multimodal model.

Default:
- scene-change candidates
- click-centered frames
- periodic sparse samples
- key timeline boundaries
- frames around suspected mistakes
- user-requested time ranges

Adaptive sampling:
- low-activity section → fewer frames
- high interaction section → more frames
- scene transition → one or several representatives
- important click cluster → pre/post frames

Store compact metadata:
```text
timestamp
frame path
scene id
click-nearby boolean
semantic tags
```

Do not store duplicate high-resolution frames unnecessarily.

---

# 45. LOCAL SEMANTIC INDEX

Phase 4 should begin without a heavy vector database.

First index:
- transcript words
- caption segments
- chapters
- scene timestamps
- clicks
- keyboard shortcuts
- project metadata

Support exact/fuzzy text search.

Then add embeddings only if measured semantic-search quality requires them.

Store:
- index version
- source project version
- model version
- createdAt
- invalidation state

When a source project changes:
- mark index stale;
- rebuild incrementally.

---

# 46. AI SAFETY / VALIDATION GATE

Every AI operation follows:

```text
AI output
  ↓
JSON/schema parse
  ↓
type validation
  ↓
project/timeline invariant validation
  ↓
conflict validation
  ↓
confidence threshold
  ↓
human review / explicit auto-apply setting
  ↓
normal editor command
  ↓
undo history
  ↓
project save
```

The model never gets direct:
- filesystem write access
- arbitrary shell execution
- arbitrary ffmpeg arguments
- unrestricted project mutation
- network access solely to complete an AI edit

Tool calls must be allow-listed.

---

# 47. AI TOOL CATALOG

Create only narrow tools.

Examples:

```text
get_project_metadata
get_transcript_range
find_transcript
get_scene_boundaries
get_interaction_events
scan_representative_frames
detect_silence
suggest_zoom
suggest_camera_layout
suggest_chapters
propose_trim
propose_caption_changes
propose_translation
create_clip
save_project
```

A tool should return structured, bounded data.

A tool should not return an entire 500 MB media file.

For user-visible “Ask My Recording”, retrieval should be:

`query → local search → narrow evidence → model synthesis → answer with timestamps`

---

# 48. MODEL DOWNLOAD / PACKAGING POLICY

Model weights are not part of the base application download unless licensing, installer size, update behavior and distribution rights are explicitly cleared.

Default:
- application installer = no large model weights
- model manager = explicit user action
- checksum = required
- version = pinned
- model package = independently removable

For Gemma:
- read the current official Gemma terms before distribution;
- include any required notices;
- do not assume “Apache 2.0 on the model page” is the entire distribution obligation.

For Whisper:
- preserve the relevant model/runtime license/notice;
- keep runtime and model licensing separately documented.

---

# 49. MODEL SELECTION RULES

## Speech

Preferred evaluation order:

1. existing SCREENLY/Recordly local Whisper pipeline if reliable;
2. whisper.cpp;
3. WhisperKit on macOS when a native implementation is materially better;
4. deterministic fallback / disable caption AI if no model available.

Whisper large-v3-turbo is a candidate quality model for offline speech-to-text. It is listed as 99-language and MIT on Hugging Face.

Do not automatically choose the largest model.

Select based on:
- quality
- speed
- memory
- language coverage
- device
- recording length

## Reasoning / multimodal

Evaluate:
1. Gemma 4 E4B local
2. Apple Foundation Models on supported systems for text-centric operations
3. another local provider only after measurable benefit

Gemma 4 E4B is currently documented as:
- multimodal
- native audio on E4B
- video via sequences of frames
- multilingual
- long-context
- function-calling capable
- designed to have smaller models suitable for local devices

Still require a SCREENLY runtime spike before adopting a specific inference stack.

## Apple Foundation Models

Apple's current Foundation Models framework supports:
- language understanding
- structured generation
- tool calling
- text/image understanding
- on-device models

SCREENLY may use it for:
- summaries
- title/description
- chapter names
- transcript cleanup
- command interpretation
- semantic retrieval synthesis

Do not make it mandatory because it is platform-specific.

---

# 50. MODEL QUALITY / COST POLICY

For each feature classify model effort:

### Tier 0 — no model
- click detection
- zoom geometry
- scene boundaries
- silence detection
- timeline validation

### Tier 1 — small local model
- title
- summary
- cleanup classification
- translation
- chapters

### Tier 2 — multimodal local model
- screen understanding
- mistake detection
- “Make This Video Better”
- visual semantic search

Use the lowest tier that produces acceptable quality.

This keeps latency and memory reasonable.

---

# 51. DESIGN ASSET INTAKE PROCEDURE

The user will provide the entire SCREENLY asset package.

At Phase 1:

```text
find <asset-root> -type f
```

Then classify:
- app icon
- lettermark
- product logo
- screenshots
- illustrations
- backgrounds
- cursor assets
- font files
- icons
- mockups
- export presets
- decorative assets

Create:

`SCREENLY_ASSET_MANIFEST.md`

For every asset record:
- path
- file type
- dimensions
- intended usage
- light/dark surface
- whether source or derivative
- license/source if not user-created

Use the supplied brand assets rather than generating substitutes.

Do not share or expose font files outside the project where prohibited.

Use system-installed SF Pro on platforms where licensed/available; use Inter fallback where required.

---

# 52. SCREENLY VISUAL RULE: LIQUID GLASS WITHOUT UI NOISE

“Heavy Liquid Glass” means:
- unmistakable translucent surfaces;
- layered depth;
- floating controls;
- blurred/translucent toolbars;
- glass AI panels;
- glass export controls;
- glass recorder HUD;
- clear separation between floating controls and content.

It does NOT mean:
- every text container is translucent;
- every panel has animated blur;
- readability is sacrificed;
- content itself is obscured.

For every glass surface, test:
- text contrast
- backdrop contrast
- selected state
- disabled state
- reduced transparency
- high contrast
- light/dark
- 125%/150% UI scale where applicable

---

# 53. COMPLETE PHASE-GATE MATRIX

## Phase 1 gate

Required:
```text
typecheck PASS
lint PASS
unit baseline recorded
UI baseline recorded where environment permits
app launch verified
recording baseline verified
editor baseline verified
export baseline verified
SCREENLY identity applied
asset manifest created
license/reuse ledger created
```

No major feature work begins before this gate.

## Phase 2 gate

Required:
```text
capture regression PASS
recovery tests PASS
camera preview PASS
retake tests PASS
clip tests PASS
replay tests PASS
long-run test recorded
full regression PASS
```

## Phase 3 gate

Required:
```text
editor regression PASS
presentation tests PASS
export preflight PASS
fallback export PASS
safe export PASS
share flow PASS
full regression PASS
```

## Phase 4 gate

Required:
```text
caption tests PASS
translation tests PASS
structured AI schema tests PASS
AI-disabled path PASS
model-installed path PASS
model-failure path PASS
offline path PASS
AI/capture concurrency PASS
full regression PASS
```

## Phase 5 gate

Required:
```text
visual inventory complete
all primary flows styled
light/dark PASS
accessibility PASS
reduced motion PASS
reduced transparency PASS
keyboard navigation PASS
camera preview visible
AI surfaces integrated
full regression PASS
```

## Phase 6 gate

Required:
```text
full test suite PASS
build PASS where environment permits
packaging PASS where environment permits
capture torture documented
export torture documented
AI torture documented
performance measurements recorded
legal/reuse review recorded
release checklist complete
no release-blocking crash
```

---

# 54. CLAUDE CODE PER-PHASE EXECUTION MICRO-PROMPT

At the beginning of each phase, internally follow this exact pattern:

```text
READ:
- SCREENLY PRD (entire file)
- SCREENLY_EXECUTION_STATE.md
- SCREENLY_DECISIONS.md
- relevant regression matrix sections

INSPECT:
- git status
- current diff
- repository tree
- target files only

PLAN:
- identify smallest implementation path
- identify existing code to preserve
- identify tests to extend

IMPLEMENT:
- make small changes
- avoid unrelated refactors
- preserve behavior

VERIFY:
- targeted test
- relevant regression tests
- typecheck/lint as appropriate

RECORD:
- exact files changed
- exact tests run
- exact outcomes
- unresolved issues
- next action

GATE:
- phase acceptance criteria
- no silent exceptions

THEN:
- reread the entire PRD
- continue only if the phase gate passes
```

Keep user-facing progress compressed:
```text
P2 / 6 — Recording Guardian
Changed: 4 files
Tests: 18 pass
Regression: 311 pass
Blocked: device reconnect hardware test
Next: replay buffer
```

Do not spend output tokens narrating obvious implementation details.

---

# 55. CLAUDE CODE DECISION PRIORITY

When requirements conflict, use this order:

1. Preserve recording integrity.
2. Preserve user media.
3. Preserve existing verified behavior.
4. Preserve timeline correctness.
5. Preserve export validity.
6. Preserve privacy/offline behavior.
7. Follow SCREENLY design source.
8. Add new feature.
9. Refactor for elegance.

Never trade recording safety for architectural cleanliness.

---

# 56. “STATE OF THE ART” DEFINITION FOR SCREENLY

State of the art does not mean the largest feature count.

For SCREENLY it means:

**Capture**
- reliable
- cross-platform
- camera preview
- multiple audio sources
- cursor/click metadata
- recoverable

**Edit**
- non-destructive
- fast preview
- auto zoom
- cursor polish
- presenter composition
- transcript editing
- captions

**AI**
- local
- multilingual
- structured
- reviewable
- timestamp-grounded
- visually aware
- optional

**Export**
- hardware first
- software fallback
- preflight
- safe export
- honest progress

**UX**
- one obvious recording action
- calm
- liquid glass
- high accessibility
- direct copy
- clear recovery

That is the bar.

---

# 57. SOURCE-VERIFIED RESEARCH SUMMARY FOR THE AGENT

Current research verifies these implementation directions:

OpenScreen currently documents:
- local/offline captions
- editable transcript
- optional subtitle translation
- AI timeline editing
- auto/manual zoom
- cursor polish
- GPU rendering with CPU fallback
- CLI support for automation/agents

OpenScreen Studio currently documents:
- click metadata
- auto zoom
- on-device Whisper
- DeepFilterNet local voice enhancement
- H.264/HEVC hardware export
- deterministic compositor behavior

Focra currently documents:
- local Whisper captions
- zoom keyframes
- Electron/React architecture
- caption worker architecture

Reframed currently documents:
- WhisperKit
- word-level timestamps
- language detection
- caption export
- webcam regions
- auto zoom
- cursor effects
- noise reduction

Screenize currently documents:
- auto zoom from cursor/click/keystroke activity
- Apache-2.0 license
- active development paused

Capso currently documents:
- BSL-1.1
- direct competing-product forks prohibited under current terms

Screenity currently documents:
- GPLv3 for its current MV3 version

Gemma 4 E4B currently documents:
- multimodal support
- audio/video processing capability
- multilingual support
- long context
- function calling
- local/edge-oriented smaller models

Whisper.cpp currently documents:
- MIT license
- Apple Silicon optimization
- Metal/Core ML
- multiple CPU/GPU backends
- quantized models
- VAD

Apple Foundation Models currently document:
- on-device language models
- structured generation
- tool calling
- language and image understanding
- model/provider abstractions

Use these facts as research anchors, but verify exact repository commits, model versions and licenses at implementation time.

---

# 58. FINAL PRE-CODING CHECKLIST

Before making the first meaningful code change:

[ ] working inside the downloaded Recordly repository root  
[ ] no second sibling app created  
[ ] design asset directory identified  
[ ] SCREENLY brand PDF located  
[ ] baseline test state recorded  
[ ] license read  
[ ] third-party notices read  
[ ] source reuse ledger created  
[ ] state files created  
[ ] current capture/editor/export paths mapped  
[ ] current camera preview mapped  
[ ] current captions mapped  
[ ] current auto-zoom mapped  
[ ] current project persistence mapped  
[ ] current export routes mapped  
[ ] model strategy documented  
[ ] offline policy documented  
[ ] six phases loaded  
[ ] Phase 1 active

---

# 59. FINAL COMMAND FOR CLAUDE CODE

After placing this file in the Recordly repository root and placing the SCREENLY design assets in the repository/workspace, send Claude Code this single instruction:

```text
Read SCREENLY_END_TO_END_PRD_CLAUDE_CODE_PROMPT_v3.md from top to bottom before changing any code.

You are working directly inside the downloaded Recordly repository root. Transform it into SCREENLY according to the PRD.

The PRD is authoritative.

Execute exactly six phases.

Do not invent additional phases.

Do not blindly rewrite the repository.

Preserve working functionality.

Use selective reuse only after current-license verification.

Use the supplied SCREENLY assets as the visual source of truth.

Implement the ten product features and the complete local AI suite.

Keep AI off the capture hot path.

Make recording recovery and export fallback first-class.

Keep all AI edits structured, validated and undoable.

Run regression tests after every meaningful change.

Maintain the persistent SCREENLY state/decision/regression/reuse/UI/AI/release documents.

At every phase boundary:
1. finish the phase,
2. run its tests,
3. run relevant regression,
4. update the persistent state files,
5. reread this entire PRD,
6. verify the phase gate,
7. then begin the next phase.

Do not claim a feature works without test or direct verification evidence.

Begin Phase 1 now.
```

The agent must continue until Phase 6 is complete or a genuine release-blocking environment limitation prevents a specific verification. In the latter case, document exactly what is blocked and continue all non-blocked work rather than stopping the project.

---

# 37. IMPORTANT OPERATING NOTE

The goal is not to “rewrite Recordly better”.

The goal is to **use the proven Recordly foundation as implementation substrate, while creating a new SCREENLY product identity and adding a carefully layered reliability, studio and local-AI experience**.

Keep the recorder boringly reliable.

Make the editor delightful.

Make AI useful.

Make recovery automatic.

Make export difficult to break.

Make the interface unmistakably SCREENLY.

Then stop.
