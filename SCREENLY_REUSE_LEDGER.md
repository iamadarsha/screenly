# SCREENLY Reuse Ledger

Per PRD §3.1: every reused external source component must be logged here with repo URL, commit SHA, license, and what was taken.

## 2026-09-25 — Phase 1
**No external repositories were cloned or code reused this session.** All Phase 1 work was: (1) rebranding existing first-party Recordly code/config in place, (2) building a new first-party SVG app icon by hand from the brand guideline description and palette.

The PRD's §3.2 high-value references (OpenScreen, OpenScreen Studio, Focra, Reframed, whisper.cpp, MLX, llama.cpp) are relevant to **Phase 3 (export/studio polish)** and **Phase 4 (local AI)**, not Phase 1. None have been cloned into `.research/opensource/` yet. When that work starts, each entry here must record:
1. repository URL
2. commit SHA cloned
3. license (verified from the actual LICENSE file, not assumed)
4. exact files/functions reused
5. required attribution preserved and where

## Explicitly excluded (per PRD §3.2, do not use as direct copy sources)
- Capso (`lzhgus/Capso`) — BSL-1.1, inspiration only pending legal review.
- ClipAgent (`DharambirAgrawal/clip-agent`) — itself derived from Recordly/AGPL code, no licensing shortcut.
- Screenity — benchmark only unless license/components confirmed suitable.
