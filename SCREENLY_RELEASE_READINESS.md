# SCREENLY Release Readiness

Status as of 2026-09-25: **Not release-ready. Phase 1 partial.**

## Primary operator target
A dmg (mac) / exe or nsis installer (win) that can be installed via a GitHub release/command on any Mac or Windows machine.

## What's in place
- `electron-builder.json5` fully rebranded: `appId app.screenly.desktop`, `productName Screenly`, GitHub publish target `iamadarsha/screenly`, mac/win artifact naming, protocol scheme `screenly://`, document type registration.
- Full app icon set (icns/ico/png at all standard sizes) generated and in place.
- `package.json` build scripts (`build`, `build:mac`, `build:win`, `build:linux`) are unchanged mechanically — they already call `electron-builder` with the now-rebranded config.

## Blocking items before a real installer exists
1. **`iamadarsha/screenly` GitHub repo does not exist yet.** Not created this session (repo creation wasn't explicitly requested). `electron-builder`'s `publish` step and the app's auto-updater will fail against a nonexistent repo.
2. **No build has been run.** `npm run build:mac` / `build:win` has not been executed this session — native helper compilation (whisper runtime, platform capture helpers, GPU export paths) is untested against the renamed identity.
3. **Code signing / notarization**: not configured, not addressed this session. An unsigned dmg will trigger Gatekeeper warnings on mac; an unsigned exe will trigger SmartScreen warnings on Windows. Operator needs to decide whether to pursue signing (Apple Developer ID + notarization, and a Windows code signing cert) or ship unsigned with a documented workaround for early access.
4. **`screenly.rb` Homebrew cask has placeholder `sha256: :no_check`** — only usable once a real release with real checksums exists.
5. Bucket 3 (auth) and Bucket 4 (cloud share) from `SCREENLY_UI_INVENTORY.md` are unresolved — if auth is broken (see the `screenly://` vs `recordly://` scheme risk noted there), the shipped app would have a broken sign-in flow.

## Next concrete step toward "installable dmg/exe"
1. Resolve the `authCallback.ts` protocol-scheme risk.
2. Create the `iamadarsha/screenly` GitHub repo (needs explicit operator go-ahead — this is a repo-creation action, not something to do silently).
3. Run `npm run build:mac` locally, fix whatever breaks, produce a first real (unsigned) dmg, and manually verify it installs and launches.
4. Decide on code signing before any public distribution.
