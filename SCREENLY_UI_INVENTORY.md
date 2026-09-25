# SCREENLY UI / Identity Inventory

Snapshot taken 2026-09-25, after the Phase 1 partial rebrand (release identity + app icons + core storage constants renamed). Regenerate this list with the command below before resuming — it will shrink as work continues.

```bash
grep -rliE "recordly" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.html" --include="*.rb" --include="*.json5" --include="*.mjs" --include="*.cjs" . | grep -v node_modules
```

## Bucket 1 — Must keep (legal, do not touch)
- `LICENSE.md` — AGPL-3.0 + Recordly's additional attribution/branding terms. PRD §4: do not strip.
- `THIRD_PARTY_NOTICES.md` — third-party license notices.
- `CONTRIBUTING.md` — likely references original project/contributors; review before editing, don't strip attribution.
- Git history itself (do not rewrite/squash to hide lineage — PRD §4 explicitly forbids this).

## Bucket 2 — Done this session (release identity, app icon, core storage constants)
See `SCREENLY_EXECUTION_STATE.md` §"What was actually completed" for the full list. ~15 files.

## Bucket 3 — Auth (needs careful handling, not yet done)
- `src/lib/auth/recordlyAuth.ts`, `src/lib/auth/recordlyAuth.test.ts`
- `src/components/auth/useRecordlyAuth.ts`
- `src/components/auth/RecordlySignInDialog.tsx`
- `electron/authCallback.ts` — **check this first**: must confirm whether it hardcodes a `recordly://` OAuth redirect scheme match, since `electron-builder.json5`'s protocol registration was already changed to `screenly://` this session. If `authCallback.ts` still checks for `recordly://`, sign-in is currently broken until reconciled.
- Supabase config/callback URLs — verify whether any are environment-configured (safe) vs hardcoded (needs updating + coordinating with whatever Supabase project backs auth).

## Bucket 4 — Cloud share sub-service (needs operator sign-off before touching)
- `services/recordly-share/` — an entire separate Cloudflare Worker + web app (`worker/web/src/components/{ShareFeedback,ThemeToggle,LibraryPage,ShareUI,SharePage}.tsx`). Has its own build/deploy pipeline and possibly a live domain. **Do not rename directory or deployed identifiers without confirming with the operator whether this is deployed and who/what depends on its current name/URL.**

## Bucket 5 — User-facing UI strings/components (largest remaining bucket, ~90 files)
Representative files (full list via the grep command above):
- `src/components/video-editor/layout/{EditorDialogs,EditorSidebar,EditorShell}.tsx`
- `src/components/video-editor/dashboard/{DashboardSidebar,useRawLibrary,useProjectFolders,useDashboardMetadata,sidebarCardConfig}.ts(x)`
- `src/components/video-editor/TutorialHelp.tsx`, `src/components/feedback/FeedbackDialog.tsx`
- `src/components/launch/{LaunchWindow,UpdateToastWindow}.tsx`
- `src/contexts/{I18nContext,ThemeContext}.tsx` — check i18n string tables specifically, likely has many "Recordly" literals across locale strings
- `src/lib/{announcementActions,customFonts}.ts`, `src/lib/exporter/{exportSavePolicy,modernVideoExporter}.ts`
- Many `electron/ipc/register/*.ts` (settings, captions, cloudShare, export, project, announcements) — mix of internal constants and IPC channel names; each needs individual review (some are wire-protocol channel name strings that must stay in sync between main/preload/renderer if renamed).

**Recommended approach for Bucket 5**: work file-by-file or small logical group at a time (e.g., "dashboard", "editor shell", "i18n strings"), re-running `npm run typecheck && npm run test` after each group — not one giant sed pass across all ~90 files at once. IPC channel name strings in particular are a functional risk if renamed inconsistently between main-process registration and renderer-side invocation.

## Bucket 6 — Visual/theme (Phase 5 per PRD, not Phase 1)
- `screenly-design-tokens.css` / `.json` exist in the brand kit but are not yet wired into `src/index.css` / `src/App.css`.
- No component has been re-themed with the SCREENLY gradient/Liquid Glass system yet.
