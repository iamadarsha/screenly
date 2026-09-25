# SCREENLY Execution State

Last updated: 2026-09-26 (Phase 1, identity/rebrand essentially done; resuming next session)

## Current phase
**Phase 1 — Foundation, Audit, Identity, Assets.** The identity/rebrand slice is done and verified against a real running app. Phase 1's remaining items (below) are mostly deferred by deliberate choice, not oversight. **Operator has explicitly said: keep building forward through the phases first ("build everything then fix"), come back for performance/polish later.** Do not stop to polish Phase 1 further unless something is actually broken.

## Environment
- Working dir: `/Users/iamadarsha/Screenly`, git repo, pushed to **https://github.com/iamadarsha/screenly** (private), branch `main`, 13 commits.
- Node v24.14.0 / npm 11.9.0. `gh` CLI authenticated as `iamadarsha`.
- Bundle id: `app.screenly.desktop`. Protocol scheme: `screenly://`.
- Primary target: signed dmg (mac) / exe (win) installable via GitHub release.

## What is actually done and verified (don't redo this)
1. **Release/packaging identity**: `package.json`, `electron-builder.json5` (appId, productName, protocol, GitHub publish target, macOS Info.plist strings, Windows names), `screenly.rb` Homebrew cask (sha256 placeholders pending a real release).
2. **App icon**: hand-built SVG (`branding/source-assets/Screenly.svg`) matching the supplied brand guideline, refined against operator-supplied reference logo renders, rasterized into the full icns/ico/PNG set. Confirmed rendering correctly in a real launched app (see below).
3. **Core runtime identity**: window title, project file extension (`.screenly`, with `.recordly` kept in `LEGACY_PROJECT_FILE_EXTENSIONS` so old projects still open), session-manifest/trash/media-dir naming, tray tooltip, OAuth callback scheme and landing page, updater messages, project save/open dialogs, export error messages, auth error messages, cloud-share error copy, the full 11-language i18n locale system, announcements feed URL.
4. **Verification method that actually worked**: static grepping alone repeatedly missed real strings (i18n fallback defaults, duplicate literals in main-process vs renderer, a second/third copy of the same sentence). What worked: run `npm run build:mac`, then `strings release/mac-arm64/Screenly.app/Contents/Resources/app.asar | grep -c Recordly`, fix whatever surfaces, rebuild, repeat. Took **7 build cycles** to reach zero. **Use this technique again for any future "make sure X is really gone/present" question** — don't trust source grep alone for a compiled Electron app.
5. **Two real signed dmgs exist right now**: `release/Screenly-arm64.dmg` (203M), `release/Screenly-x64.dmg` (208M). Signed with a local Apple Development identity (ad-hoc/dev signing, NOT notarized — fine for local testing, not for public distribution).
6. **App launches and was screenshotted**: menu bar correctly reads "Screenly", compact recorder HUD renders correctly, icon correct.
7. Every change verified against the full baseline: `npm run typecheck` (clean), `npm run lint` (clean, 1 pre-existing unrelated warning), `npm run test` (1396/1396 passing throughout).

## Deliberately NOT done (documented reasoning, not oversights — see SCREENLY_UI_INVENTORY.md for full detail)
- `services/recordly-share/` — a live deployed Cloudflare Worker. Operator explicitly said leave it alone.
- Native capture helper toolchain internal naming (`electron/native/bin/recordly-*`, Swift/C++/PowerShell producer scripts, `electron/ipc/paths/binaries.ts`) — zero user visibility, real regression risk to the core recording feature if renamed incompletely.
- `src/lib/auth/{recordlyAuth.ts,useRecordlyAuth.ts,RecordlySignInDialog.tsx}` **filenames/symbol names** — the actual user-visible text inside them (dialog heading, aria-labels, error message) IS fixed; only the filenames/internal identifiers still say Recordly. Cosmetic refactor, no functional or user-visible effect.
- Full SCREENLY visual re-theme (`screenly-design-tokens.css` wired into components, Liquid Glass system) — this is PRD Phase 5, not Phase 1. Don't start it prematurely.
- Windows build (`npm run build:win`) — not attempted this session (dev machine is macOS). Will need a Windows machine or CI runner.
- Code signing / notarization for real public distribution — current dmgs are dev-signed only.

## NEW as of tonight's launch test: known issue to track, not fix yet
**Operator reports: "features are working but very laggy."** This was said after actually using the built app (record → edit, presumably). Operator's explicit instruction: **finish building out the remaining phases first, come back and fix performance later.** Do not get pulled into performance investigation/optimization until told to. When it's time: PRD §20 (Performance Budget) is the relevant section — profile before guessing, check for the known `EditorWindow` bundle being 1.6MB unminified-equivalent (vite warned about chunks >1000kB at every build — `EditorWindow-*.js` is consistently the largest at ~1.62MB), and check whether AI/background work is interfering with the main thread per PRD §1.3's "capture path is sacred" rule.

## Next session: recommended order
1. Read this file, `SCREENLY_DECISIONS.md`, `SCREENLY_UI_INVENTORY.md`, `SCREENLY_RELEASE_READINESS.md` before doing anything else.
2. Do NOT re-run the identity/branding sweep — it's done. Do NOT start performance work — operator said later.
3. Per operator's "build everything then fix" instruction: move into **Phase 2 (Recording Reliability + Capture Workflow)** — Recording Guardian, checkpoint/session manifest, Retake Mode, Clips, Replay Buffer. Re-read PRD §25 Phase 2 section in full before starting.
4. Keep using the build → asar-dump → fix cycle for any future "is this really gone" verification.
5. Keep the same discipline: typecheck + lint + full test suite after every logical change, real commits with clear messages, update these state files at natural checkpoints (not necessarily every single commit).
