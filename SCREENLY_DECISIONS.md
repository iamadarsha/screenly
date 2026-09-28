# SCREENLY Decisions Log

## 2026-09-25 — GitHub repo / bundle id
- Asked the operator directly (not guessed): releases target `iamadarsha/screenly` (repo not yet created — `gh repo view iamadarsha/screenly` confirms it doesn't exist yet). Bundle id: `app.screenly.desktop`.
- Rationale: electron-builder's `publish` config and macOS `CFBundleIdentifier`/UTI strings are baked into every build; guessing them would mean redoing every identity file later.

## 2026-09-25 — App icon source
- The supplied `SCREENLY_Brand_Kit_Concept_2/` folder contains brand guideline docs, design tokens, and several ChatGPT-generated *mockup* images (UI concept renders at non-square aspect ratios), but no clean, transparent, production-ready square icon asset.
- Decision: built the mark as a real SVG (`branding/source-assets/Screenly.svg`) matching the brand guideline's description ("flowing S ribbon + small recording dot") and the exact palette in `screenly-design-tokens.json`, rather than cropping a JPEG-artifact mockup screenshot into an app icon.
- Iterated against reference logo renders the operator posted mid-session (three 1024px "official" icon exports + the full brand guideline sheet image). Second iteration — tighter/taller S curve, radial-gradient glossy dot, diagonal cyan→blue→violet→magenta→amber sweep — matches the reference closely. Rendered via macOS QuickLook (`qlmanage -t`, no `rsvg-convert`/`inkscape`/`cairosvg` available in this environment) to a 1024×1024 RGBA master, then downsampled with Pillow to every required size, `iconutil` for `.icns`, Pillow for `.ico`.
- If the operator has the actual vector export (Figma/Illustrator source) of the reference logos, swap `branding/source-assets/Screenly.svg` for that and regenerate — the current mark is a close hand-built approximation, not a designer-exported original.

## 2026-09-25 — Legacy `.recordly` project files
- Kept `"recordly"` in `LEGACY_PROJECT_FILE_EXTENSIONS` (`electron/ipc/constants.ts`) alongside the pre-existing `"openscreen"` entry, so old Recordly-era project files still open under the new `.screenly` extension. Per PRD §1.5/§13: never silently corrupt/orphan old projects.

## 2026-09-28 — Phase 4C (local reasoning runtime): scope this session, deferred to a real decision
- The operator explicitly deferred picking an actual bundled/supported reasoning model ("skip the model decisions for now"), and asked me to use my judgment on the rest of 4C.
- Decision: build the **provider abstraction + a real, working Tier-0 (no-model) heuristic provider + a generic model download/checksum/storage manager**, but do NOT integrate any actual LLM inference (no GGUF/MLX/llama.cpp bindings, no Apple Foundation Models native bridge) in this pass.
- Why: the PRD's own AI fallback hierarchy (`model installed → local model`, `model unavailable → deterministic heuristic`, `heuristic unavailable → disable only that enhancement`) means the Tier-0 heuristic path is not a stopgap — it's a first-class, permanently-relevant tier every AI feature must have anyway. Building it first, and building it solid, is real forward progress usable today (Ask My Recording, chapters, etc. can call the provider abstraction and get a working heuristic-only answer right now) rather than speculative.
- Actual model integration (Gemma 4 E4B evaluation, or an Apple Foundation Models native helper analogous to `electron/native/bin/*`'s existing Swift helpers) is real native-engineering work on the scale of the original whisper.cpp integration — not something to rush into an unreviewed choice. It also carries real product tradeoffs only the operator should weigh: app size/download UX for a multi-GB model vs. an Apple-only on-device route that's free but macOS-version-gated and Mac-only (this app also targets Windows).
- The download/checksum/storage manager built now is intentionally generic (any URL + expected hash), so whichever model gets chosen later plugs into already-tested infrastructure instead of needing its own bespoke downloader.
- Follow-up needed before 4D (the 12 AI features) can do anything beyond heuristics: an explicit operator decision on which model(s) to actually support, and whether/how to build the native inference bridge.

## 2026-09-25 — Scope boundary: what was NOT renamed this session
- `services/recordly-share/` (a separate Cloudflare Worker + web app) was left untouched. Renaming it may affect a deployed domain/API that other systems could depend on — needs explicit operator confirmation before touching, not a default rename.
- User-facing UI copy (onboarding, settings, editor labels, toasts) still says "Recordly" in most places. Renaming ~100 files of UI strings in one mechanical pass, without per-file review, is exactly the kind of blind sed sweep the PRD's "no unnecessary rewrite" / "preserve proven behavior" principle warns against. Scoped as explicit follow-up work in `SCREENLY_UI_INVENTORY.md`.
- Full visual re-theme (applying `screenly-design-tokens.css` / Liquid Glass system to actual components) is PRD Phase 5 work, not Phase 1.
