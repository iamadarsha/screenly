# SCREENLY — Design Divergence Audit

**Date:** 2026-09-28  
**Scope:** Complete UI/UX redesign audit comparing current baseline (Recordly lineage) against the authoritative SCREENLY Design Directive (`docs/reference/SCREENLY_DESIGN_DIRECTIVE_VERBATIM.md`) and Master PRD v3 (`docs/reference/SCREENLY_MASTER_PRD_v3_READONLY.md`).  
**Baseline Screenshots Captured:** Saved in `docs/visual-qa/before/` (`hud-default.png`, `dashboard-project-browser.png`, `editor-1280x800-dark.png`, `editor-1920x1080-dark.png`, `editor-1280x800-light.png`, `editor-tab-*.png`, `editor-clips-open.png`, `editor-export-menu.png`).

---

## 1. Executive Summary

While Phase 1 succeeded in rebranding strings, app metadata, window titles, icons, and bundle IDs, the layout structure, information architecture, visual styling, and wallpaper assets remain structurally and visually identical to Recordly. 

The application currently still has:
1. **Persistent left vertical icon rail (64px)** docked to a **fixed left inspector (320px)**.
2. **Dense left-side SettingsPanel** with ~3450 lines of single-column accordion/group controls.
3. **Flat, single-height timeline** resembling a basic filmstrip rather than a modern professional multi-track editor.
4. **Unwired Design Tokens**: The official palette (Electric Blue, Violet, Magenta, Coral, Amber, Navy, Slate, Light, White) and radii exist in `SCREENLY_Brand_Kit_Concept_2/` but are imported by zero components.
5. **Lack of Liquid Glass styling**: Windows use standard flat dark/light CSS card surfaces (`bg-editor-bg`, `bg-card`) with opaque borders rather than Apple-grade translucent glass materials.
6. **25 Bundled Wallpapers** using Apple-derived names (`tahoe-light.jpg`, `sequoia-blue.jpg`, `ventura-dark.jpg`) without documented licensing provenance.

---

## 2. Detailed Surface-by-Surface Divergence Audit

### 2.1 Workspace Navigation & Editor Header
- **Current Baseline (`EditorHeader.tsx`)**:
  - A single horizontal header bar (`border-b border-separator h-14`).
  - Left: Home button with breadcrumb `/`, inline project rename input, and a "Clips" button.
  - Right: Undo/Redo icon buttons, Feedback button, and the Export dropdown button.
  - Resemblance to Recordly: 100% identical layout and control placement.
- **Directive Requirement**:
  - Horizontal workspace switcher with distinct destinations: **Home · Record · Studio · Library · Publish**.
  - Floating, translucent navigation surface with context-aware actions.
  - Retain quick project rename, undo/redo, export, and status indicators without crowding.
- **Proposed Redesign**:
  - Replace the monolithic header with a refined, floating translucent glass bar featuring the centralized workspace switcher.
  - Add `Cmd+K` command palette trigger and active mode indicators.
- **Affected Files**:
  - `src/components/video-editor/layout/EditorHeader.tsx`
  - `src/components/video-editor/layout/EditorShell.tsx`
  - New component: `src/components/video-editor/layout/WorkspaceNav.tsx`
  - New component: `src/components/video-editor/layout/CommandPalette.tsx`

---

### 2.2 Inspector Placement & Layout (Left vs Right)
- **Current Baseline (`EditorSidebar.tsx`, `SettingsPanel.tsx`)**:
  - Left-docked 64px icon rail (`nav`) with 5 icons (Scene, Cursor, Webcam, Captions, Settings) + account avatar at the bottom.
  - Left-docked 320px fixed inspector (`aside`) containing `SettingsPanel.tsx` (~3450 lines) with vertical accordion groups.
  - Several sections (`clip`, `zoom`, `audio`, `annotation`) are only accessible when an item is selected on the timeline.
- **Directive Requirement**:
  - **Canvas-first Studio**: Video preview must be the visual center of the editor.
  - Move contextual editing controls to a **collapsible inspector on the RIGHT**, eliminating the left-side panel.
  - Dedicated, clean editing modes sharing underlying state:
    1. **Composition** (canvas size, fit/fill, aspect ratio, frame styling, padding, shadow, rounded corners)
    2. **Motion** (smart zooms, manual zooms, camera follow, ease curves)
    3. **Cursor** (style, size, click-pulse, smoothing, sway, click effects)
    4. **Camera** (webcam toggle, shape/roundness, size, 9 position presets, mirror, crop, shadow)
    5. **Audio** (mic/system track volumes, mute, ducking, denoise, voiceover tracks)
    6. **Captions** (Whisper ASR, language detection, styling, transcript delete-to-cut, AI tools)
    7. **Backgrounds** (new wallpaper collection, gradients, blurs, custom image import)
- **Proposed Redesign**:
  - Create `EditorRightInspector.tsx` hosting modern, collapsible glass-styled panels for each mode.
  - Remove `EditorSidebar.tsx` and free up the left edge for a spacious, clean canvas.
  - Preserve all existing callbacks, setters, and state hooks (`appearance`, `timeline`, `project`, `ui`).
- **Affected Files**:
  - `src/components/video-editor/layout/EditorSidebar.tsx` (remove / replace)
  - `src/components/video-editor/layout/EditorRightInspector.tsx` (new)
  - `src/components/video-editor/SettingsPanel.tsx` (recompose into modular mode inspectors)
  - `src/components/video-editor/layout/EditorShell.tsx`

---

### 2.3 Video Preview Canvas ("Canvas-First Studio")
- **Current Baseline (`EditorPreviewPanel.tsx`)**:
  - Docked directly between the left sidebar and right edge.
  - Fixed-ratio container with standard dark background (`bg-editor-preview-bg`).
  - Bottom-docked 3-column playback transport bar (`grid-cols-[1fr_auto_1fr]`).
- **Directive Requirement**:
  - Spacious visual stage where the preview feels like an elevated physical document or canvas floating in space.
  - Subtle layered depth, soft ambient glow matching the background/content, and controlled glass reflection borders.
  - Floating translucent playback transport overlay or clean bottom stage bar.
  - Quick action floating overlay: Aspect ratio quick-switch, Crop, Zoom level, Make Video Better.
- **Proposed Redesign**:
  - Re-theme `EditorPreviewPanel.tsx` with Apple-like canvas staging.
  - Floating translucent glass transport bar with high-contrast playback controls, timecode display, and scrubber.
- **Affected Files**:
  - `src/components/video-editor/layout/EditorPreviewPanel.tsx`
  - `src/components/video-editor/videoPlayback/VideoPlayback.tsx`

---

### 2.4 Timeline Subsystem
- **Current Baseline (`EditorTimelinePanel.tsx`)**:
  - Single fixed-percentage-height strip (22% / 180–280px) at the bottom.
  - 6 row types stacked with subtle visual difference: zoom, clip, annotation, audio, source-audio, captions.
  - Standard filmstrip frames without distinct track badge headers.
  - No mode switch between compact overview and expanded precision editing.
- **Directive Requirement**:
  - Expressive, expandable multi-track timeline with distinct visual track identities:
    - **Video & Retakes** (filmstrip, take badges, clip cuts)
    - **Camera** (webcam presence, PiP cues)
    - **Audio** (compact waveforms, volume indicators)
    - **Captions** (legible text blocks, detected language badge)
    - **Zooms** (depth tags, target focus indicators)
    - **Annotations** (pills for text, blur, figure)
    - **Voiceover** (dedicated narration track)
  - Two operational modes: **Compact Focused Mode** (high-level view) and **Expanded Precision Mode** (deep millisecond trimming, keyframing).
  - Prominent playhead with timestamp indicator and snapping guidelines.
- **Proposed Redesign**:
  - Add compact / expanded precision toggle button to timeline header.
  - Style each track type with distinct color accents (Blue for Video, Violet for Zooms/AI, Magenta for Annotations, Amber for Audio, Emerald for Captions).
  - Enhance playhead with high-visibility glass needle and glowing timecode head.
- **Affected Files**:
  - `src/components/video-editor/layout/EditorTimelinePanel.tsx`
  - `src/components/video-editor/timeline/Timeline.tsx`
  - `src/components/video-editor/timeline/TrackHeader.tsx` / `TimelineHeader.tsx`

---

### 2.5 Liquid Glass Visual Language & Design Tokens
- **Current Baseline**:
  - `SCREENLY_Brand_Kit_Concept_2/screenly-design-tokens.css` has palette tokens but is not imported.
  - UI uses generic Tailwind/HeroUI classes (`bg-card`, `bg-neutral-900`, `border-border`).
  - No `backdrop-filter: blur(...)` glass materials.
  - No `prefers-reduced-transparency` accessibility support.
- **Directive Requirement**:
  - Standardized Material Hierarchy:
    - **Ultra Thin / Regular Glass**: Floating workspace nav, floating transport controls, modals (`backdrop-blur-xl bg-navy/60 border border-white/10 shadow-2xl`).
    - **Inspector Glass**: Right-hand inspector surface (`backdrop-blur-md bg-navy/80 border-l border-white/5`).
    - **Content Surface**: High-contrast, highly legible card surfaces for text-heavy settings (`bg-slate-900/90`).
  - Token integration:
    - Electric Blue `#3882F6` (Primary action, capture, selected tabs)
    - Violet `#8B5CF6` (AI intelligence, chapters, suggestions)
    - Magenta `#EC4899` (Creative accents, annotations)
    - Coral `#FF686B` (Recording active, retakes)
    - Amber `#F59E0B` (Warnings, audio levels)
    - Navy `#0B1020` & Slate `#334155` (Dark surfaces and cards)
    - Light `#F1F5F9` & White `#FFFFFF` (Light mode and typography)
  - Accessibility:
    - Full `prefers-reduced-transparency` fallback (opaque high-contrast surfaces).
    - Full `prefers-reduced-motion` compliance (zero animations or subtle fades).
    - Minimum 32px touch/click target sizes with visible keyboard focus rings.
- **Affected Files**:
  - `src/index.css`, `src/App.css`
  - `src/components/ui/button.tsx`, `card.tsx`, `popover.tsx`, `dialog.tsx`
  - All editor layout components.

---

### 2.6 Wallpaper Collection & Wallpaper Browser
- **Current Baseline (`src/lib/wallpapers.ts`, `public/wallpapers/`)**:
  - 25 files using Apple stock names: `tahoe-light.jpg`, `sequoia-blue.jpg`, `ventura-dark.jpg`, etc.
  - Zero licensing provenance or attribution records.
  - Old standard grid browser in `SettingsPanel.tsx` (`WallpaperGrid.tsx`).
- **Directive Requirement**:
  - Complete removal of Apple-named assets from defaults and bundle.
  - At least 20 new high-resolution (≥3840×2160, up to 5120×2880) wallpapers across 8 categories:
    1. **Abstract** (Original procedural gradients and fluid ribbon shapes)
    2. **Aurora** (Atmospheric polar lights with gaussian ribbon curves)
    3. **Alpine** (Cinematic mountain peaks with soft dawn atmospheric lighting)
    4. **Coast** (Calm ocean horizons and deep coastal water gradients)
    5. **Botanical** (Minimal leafy silhouettes, deep rich greens)
    6. **Cosmic** (Celestial nebulae and starfield compositions)
    7. **Topographic** (Contour terrain lines with subtle depth)
    8. **Minimal** (Subtle color fields for clean professional demos)
  - Every third-party asset verified and attributed in `SCREENLY_WALLPAPER_CREDITS.md`.
  - Brand-new Wallpaper Browser:
    - Large high-DPI visual cards with category filter pills (All, Abstract, Aurora, Alpine, Coast, Botanical, Cosmic, Topographic, Minimal).
    - Search, Favorites, Recently Used, Custom Import.
    - Live stage preview on hover/select.
- **Affected Files**:
  - `src/lib/wallpapers.ts`
  - `public/wallpapers/*`
  - `SCREENLY_WALLPAPER_CREDITS.md` (new)
  - `src/components/video-editor/scene/WallpaperBrowser.tsx` (new/revamped)

---

### 2.7 Recording HUD & Launch Surfaces
- **Current Baseline (`src/components/launch/`)**:
  - Dark pill with Recordly button styling and small icons.
  - Popovers have generic flat dropdown styling.
- **Directive Requirement**:
  - Sleek, floating Liquid Glass pill with a prominent, unambiguous Primary Record Button.
  - Live webcam preview bubble embedded right into the launch workflow when camera is enabled.
  - Redesigned screen/window source selector, countdown, and audio level meters.
- **Affected Files**:
  - `src/components/launch/RecordingHud.tsx`
  - `src/components/launch/popovers/WebcamPopover.tsx`
  - `src/components/launch/popovers/AudioSourcePopover.tsx`
  - `src/components/launch/popovers/ScreenSourcePopover.tsx`

---

## 3. Implementation Phasing Plan

1. **Phase 5.2 — Design Token & Material System**:
   - Import and integrate `screenly-design-tokens.css` into `src/index.css`.
   - Build utility glass classes (`glass-surface`, `glass-floating`, `glass-inspector`, `glass-card`).
   - Implement accessibility fallbacks for `prefers-reduced-transparency` and `prefers-reduced-motion`.

2. **Phase 5.3 — Information Architecture & Canvas-First Studio Layout**:
   - Build `WorkspaceNav.tsx` (Home · Record · Studio · Library · Publish).
   - Build `CommandPalette.tsx` (`Cmd+K` quick actions).
   - Build `EditorRightInspector.tsx` with modes: Composition, Motion, Cursor, Camera, Audio, Captions, Backgrounds.
   - Refactor `EditorShell.tsx` to mount the right inspector and spacious center preview.
   - Enhance `EditorTimelinePanel.tsx` with track identity styling and compact/precision toggle.

3. **Phase 5.4 — Surface Redesign**:
   - Refactor Dashboard / Project Browser with glass grid cards and search.
   - Refactor Recording HUD with glass pill styling and prominent record CTA.
   - Refactor Export Doctor modal and Settings dialogs.

4. **Phase 5.5 — Complete Wallpaper Collection Replacement**:
   - Procedural generation pipeline (Python + PIL + numpy) for Abstract, Aurora, Topographic, Cosmic, and Minimal categories at 3840×2160+.
   - Licensed CC0 / Wikimedia / NASA images for Alpine, Coast, and Botanical categories.
   - Create `SCREENLY_WALLPAPER_CREDITS.md` documenting every asset's provenance.
   - Implement the new category-filtered `WallpaperBrowser.tsx`.

5. **Phase 5.6 — Visual QA & Regression Verification**:
   - Capture after-screenshots at identical sizes (1280x800 & 1920x1080).
   - Compile `SCREENLY_VISUAL_QA.md` proving complete divergence from Recordly.
   - Run typecheck, lint, test, i18n:check, and full recording regression suite.

---
*Audit completed and baseline screenshots preserved in `docs/visual-qa/before/`.*
