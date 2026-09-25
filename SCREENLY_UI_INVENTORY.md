# SCREENLY UI / Identity Inventory

Snapshot taken 2026-09-26, after: (1) the initial Phase 1 partial rebrand, (2) actually building and launching the app and fixing everything that surfaced as visibly broken/mis-branded, (3) an i18n locale rebrand, (4) a second pass fixing every genuinely user-facing string found by dumping strings from the compiled `app.asar` of a real build. Regenerate this list with the command below before resuming — it will shrink as work continues.

```bash
grep -rliE "recordly" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.html" --include="*.rb" --include="*.json5" --include="*.mjs" --include="*.cjs" . | grep -v node_modules
```

## Bucket 1 — Must keep (legal, do not touch)
- `LICENSE.md` — AGPL-3.0 + Recordly's additional attribution/branding terms. PRD §4: do not strip.
- `THIRD_PARTY_NOTICES.md` — third-party license notices.
- `CONTRIBUTING.md` — likely references original project/contributors; review before editing, don't strip attribution.
- Git history itself (do not rewrite/squash to hide lineage — PRD §4 explicitly forbids this).

## Bucket 2 — Done this session (release identity, app icon, core storage constants, permission dialogs, i18n, updater, dialog titles, announcements feed)
See `SCREENLY_EXECUTION_STATE.md` for the full list. This is now everything that was verified to actually reach a user: every string a real built-and-launched app shows (native permission dialogs, updater messages, project save/open dialog titles and filters, tray tooltip, window title fallback, OAuth callback landing page, export error messages, the remote announcements feed URL), plus the full 11-language i18n locale system.

## Bucket 3 — Auth (needs careful handling, not yet done)
- `src/lib/auth/recordlyAuth.ts`, `src/lib/auth/recordlyAuth.test.ts`
- `src/components/auth/useRecordlyAuth.ts`
- `src/components/auth/RecordlySignInDialog.tsx`
- These are filenames/exported symbol names, not user-facing copy (the OAuth callback's actual protocol scheme and landing page were already fixed in Bucket 2). Renaming the files themselves is a pure refactor with no user-visible effect — low priority, do if/when touching this area for other reasons.
- Supabase config/callback URLs — verify whether any are environment-configured (safe) vs hardcoded (needs updating + coordinating with whatever Supabase project backs auth).

## Bucket 7 — Native capture helper toolchain (deliberately NOT renamed, do not touch casually)
`electron/native/bin/*/recordly-*` binaries, their producer scripts (`scripts/build-native-helpers.mjs`, `scripts/build-nvidia-cuda-compositor.mjs`, `scripts/build-windows-gpu-export.mjs`), their consumer lookups (`electron/ipc/paths/binaries.ts`), and internal C++/Swift identifiers (`RecordlyMappedFrameHandler`, `RecordlyDisplayFramePolicy`, etc.) all still say "recordly". This is the actual screen/webcam/GPU-compositor capture pipeline — the single most important feature in the app. The names are never shown to a user and carry zero branding value; renaming them means keeping dozens of producer/consumer filename pairs across Swift, C++, PowerShell, and TypeScript in perfect sync, with a real risk of silently breaking native capture if any one reference is missed. The current build was verified working end-to-end (app launches, permission dialogs correct) with this naming untouched — leave it alone unless there's a specific reason to touch this subsystem anyway.

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
