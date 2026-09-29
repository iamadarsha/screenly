# SCREENLY Release Readiness

Status as of 2026-09-29 (Claude Code, production pass): **Functionally ready for an unsigned public launch. Signing is the remaining gap.**

## Primary operator target
A dmg (mac) / exe or nsis installer (win) that can be installed via a GitHub release/command on any Mac or Windows machine.

## What's in place (verified this pass)
- `electron-builder.json5` fully rebranded: `appId app.screenly.desktop`, `productName Screenly`, GitHub publish target `iamadarsha/screenly`, mac/win artifact naming, protocol scheme `screenly://`, document type registration.
- Full app icon set (icns/ico/png at all standard sizes) generated and in place, matches the corrected reference logo — verified by checksum against the built app bundle's `icon.icns`.
- `npm run build:mac` runs to completion and produces a real, launchable `Screenly.app` + signed-with-local-dev-identity `.dmg`/`.zip` for both `arm64` and `x64` (see build log; the earlier "build7" failure was a transient codesign timestamp/clock-skew error, not a code defect — a clean retry succeeded).
- Full regression suite green: `npm run typecheck` (0 errors), `npm run lint` (1 pre-existing warning, unrelated), `npm test` (186 files / 1625 tests passing).
- Kokoro neural voiceover bug fixed and unit-tested (see `04_DECISIONS_AND_NEXT_STEPS.md` and commit `84f0750`); live end-to-end verification against the rebuilt app is the one item still in progress as of this pass.
- **README.md / README.zh-CN.md fully rebranded.** Both were still describing "Recordly" throughout (title, feature copy, screenshots, install instructions, AUR package references, issues/releases links pointing at the nonexistent `webadderallorg/Recordly` repo) — rewritten to Screenly branding, correct `iamadarsha/screenly` links, and real one-command install instructions (see below). The AUR section was removed rather than renamed, since no `screenly-bin`/`screenly-aur` package actually exists — renaming it would have made a false claim.
- **In-app "Report an issue" link fixed**: `TutorialHelp.tsx`'s `RECORDLY_ISSUES_URL` pointed at `github.com/webadderallorg/Screenly/issues` (wrong org — 404), corrected to `github.com/iamadarsha/screenly/issues`.
- **CI branding fixed**: `.github/workflows/homebrew-tap.yml` and `.github/workflows/winget-releaser.yml` were still templated for "Recordly"/"Webadderall.Recordly" (cask name, app filename, tap repo default, winget identifier) — corrected to Screenly. These workflows are still **not wired to real infrastructure** (no `HOMEBREW_TAP_TOKEN`/`WINGET_ACC_TOKEN` secrets configured, no `iamadarsha/homebrew-tap` repo exists, and a winget submission needs review time regardless) — see "Still not done" below.
- **New: real one-command installers.** `scripts/install.sh` (macOS, `curl | bash`) and `scripts/install.ps1` (Windows, `irm | iex`) added and referenced from both READMEs. These hit the GitHub Releases API directly for the latest tag, so they need zero extra infrastructure (no Homebrew tap, no winget approval) and work as soon as a real release exists. The macOS script also sidesteps the Gatekeeper "unidentified developer" dialog, since files fetched with `curl` aren't quarantine-flagged the way browser downloads are.

## Blocking items before a fully signed, warning-free installer exists
1. ~~`iamadarsha/screenly` GitHub repo does not exist yet.~~ Exists, was private — **operator has approved making it public for today's launch.**
2. ~~No build has been run.~~ Built and verified this pass (both arch dmgs).
3. **Code signing / notarization — deliberately deferred for today's launch** (operator decision, 2026-09-29): shipping unsigned. Consequence: macOS Gatekeeper will warn on a browser-downloaded dmg (mitigated for the one-command install path, not for manual downloads — see the README's "App cannot be opened" section); Windows SmartScreen will warn once per machine on the exe (also documented in the README/install.ps1 output). Revisit with a real Apple Developer ID + notarization and a Windows code-signing cert when the operator is ready to remove these warnings.
4. **Homebrew tap and Winget are not live.** Branding in the workflows is now correct, but: no `iamadarsha/homebrew-tap` repo exists, no `HOMEBREW_TAP_TOKEN` secret is configured, and no `Screenly.Screenly` winget package has been submitted/approved. These are the "brew install" / "winget install" single-command paths; the `curl|bash` / `irm|iex` scripts are the ones that work today without further setup.
5. Bucket 4 (cloud share sub-service, `services/recordly-share/`) is still unresolved and still unrebranded — the allowlisted cloud-share origin in `electron/ipc/cloudShareContract.ts` still points at `videos.recordly.dev`, which the operator does not control. Left untouched again this pass (same as the prior session) since repointing it to an unowned/unconfigured domain would silently break cloud sharing rather than fix anything — needs an explicit operator decision on where (or whether) this service now lives.

## Next concrete step toward a fully polished release
1. Make the repo public and cut the first real GitHub release (tag `v1.4.0`) from `main` — unblocks both install scripts and the manual-download path immediately.
2. Decide on and provision code signing (Apple Developer ID + notarization, Windows code-signing cert) for a warning-free installer.
3. If the Homebrew/Winget distribution paths matter beyond today: create `iamadarsha/homebrew-tap`, set `HOMEBREW_TAP_TOKEN`, and submit the winget package under a real `WINGET_ACC_TOKEN`.
4. Resolve the `services/recordly-share/` naming/domain question.
