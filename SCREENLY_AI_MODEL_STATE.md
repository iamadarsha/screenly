# SCREENLY AI Model State

Status as of 2026-09-25: **Phase 4 has not started.** This file is a placeholder per PRD §1.6 (state must survive context loss) and will track:
- Installed local models (ASR, reasoning) and their versions/checksums
- Provider abstraction status (local Gemma runtime, whisper.cpp, optional Apple-native route)
- Model manager UI status
- AI evaluation suite results

The existing repository already has a bundled Whisper-based caption runtime (`scripts/build-whisper-runtime.mjs`, `electron/ipc/captions/`) — this is the Phase 1 baseline to preserve and extend in Phase 4, not replace speculatively. No changes made to it this session.
