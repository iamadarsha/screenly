# SCREENLY — Brand & UI Guidelines v1.0
**Concept:** Lettermark S / Ribbon  
**Tagline:** Record. Explain. Share. Effortlessly.

## 1. Brand idea
The SCREENLY mark is a flowing S-shaped ribbon. It communicates motion, screen capture, creative flow and seamless recording. The small recording dot is the recognition cue.

## 2. Logo system
- Primary: white rounded-square icon + full SCREENLY wordmark.
- Compact: icon + wordmark without tagline.
- Icon-only: use for app icons, browser favicon, navigation and compact surfaces.
- Dark: use on dark product surfaces.
- Monochrome: only when reproduction requires a single ink/color.
- Maintain clear space equal to at least the diameter of the recording dot around the logo.
- Never stretch, skew, rotate, recolor arbitrarily, add outlines, add drop shadows to the mark, or place it on visually noisy imagery.

## 3. Color
Primary gradient: linear-gradient(135deg, #3882F6 0%, #8B5CF6 38%, #EC4899 68%, #FF686B 86%, #F59E0B 100%)
Primary colors: Electric Blue #3882F6, Violet #8B5CF6, Magenta #EC4899, Coral #FF686B, Amber #F59E0B.
Neutrals: Navy #0B1020, Slate #334155, Gray #64748B, Silver #CBD5E1, Light #F1F5F9, White #FFFFFF.

### Gradient usage
Use the gradient as a brand accent, primary CTA fill, active navigation indicator, recording state, AI highlight and hero imagery. Do not use the gradient for long body text.

## 4. Typography
Primary: SF Pro Display / SF Pro Text. Cross-platform fallback: Inter.
- Display: 34/40, Bold
- H1: 28/34, Bold
- H2: 22/28, Semibold
- H3: 20/26, Semibold
- Body: 17/24, Regular
- Body small: 15/21, Regular
- Caption: 13/18, Medium
Use sentence case for UI. Avoid all-caps except the brand wordmark.

## 5. UI principles
1. Recording should be one obvious action.
2. AI should feel assistive, not intrusive.
3. Every destructive action has a clear recovery path.
4. Preserve user work automatically.
5. Prefer progressive disclosure over dense settings.
6. Use motion to explain state changes, not decorate them.
7. Keep the interface calm: one primary gradient action per surface.

## 6. Core screen architecture
**Home:** Record, recent recordings, search, AI shortcuts.  
**Recorder:** elapsed time, camera/mic status, pause, stop, compact controls.  
**Review:** timeline, transcript, AI suggestions, chapters, summary.  
**Share:** destination, privacy, export quality, link settings.  
**Library:** recordings, filters, folders, search.  
**AI Tools:** captions, translation, chapters, summaries, zoom suggestions.  
**Settings:** account, recording, audio/video, AI/privacy, storage.

## 7. Components
Buttons: 12–16px radius. Primary button uses gradient; secondary uses neutral surface with 1px border.
Cards: 16–24px radius, subtle border, minimal shadow.
Inputs: 12px radius, 48px minimum height.
Tabs: compact, high contrast active state.
Toggles: blue/gradient active state, neutral inactive state.
Recording indicator: red/pink dot; never use the primary gradient as the sole recording-state cue.

## 8. Recording UX
- Start: clear confirmation with visible mic/camera/screen state.
- During recording: keep controls discoverable but unobtrusive.
- Failure: never discard the recording; offer retry/recovery/export of the last valid segment.
- Long recording: show elapsed time and storage/health state only when useful.
- Camera: always provide a visible preview when camera mode is enabled.

## 9. AI UX
AI features should be opt-in, explain what they do, and show processing state.
Recommended first-party features:
- On-device captions/transcription
- Multi-language subtitle generation
- Translation
- Chapter detection
- Recording summary
- Key moment detection
- Smart zoom suggestions
- Filler-word/silence detection
- Privacy-preserving local processing indicator

Use the violet-to-pink part of the gradient for AI affordances; use a small sparkle motif sparingly.

## 10. Accessibility
- Minimum interactive target: 44×44pt on iOS.
- Do not communicate state with color alone.
- Maintain strong text/background contrast.
- Support Dynamic Type.
- Respect Reduce Motion.
- Provide VoiceOver labels for recording, camera, microphone and AI controls.

## 11. Motion
Fast 160ms for micro-interactions; standard 240ms for transitions; emphasis 360ms for recording/AI reveals.
Use the standard easing: cubic-bezier(.2,.8,.2,1).
No bouncing or gratuitous parallax.

## 12. Do / Don't
DO use clean backgrounds, generous spacing, official colors, consistent corner radii and the original proportions.
DON'T recolor the S arbitrarily, add effects to the logo, place it over busy backgrounds, distort it, or use the icon as a decorative pattern.

## 13. Voice & tone
Clear, confident, human, concise.
Prefer: “Your recording is ready.”
Avoid: “Processing completed successfully.”
Prefer: “Generate captions.”
Avoid: “Initiate AI transcription workflow.”

## 14. Product naming
SCREENLY is always uppercase in the wordmark. In normal prose, use “Screenly” unless the brand system specifically requires the all-caps form.

## 15. Suggested product palette roles
- Blue: primary action / capture
- Violet: AI / intelligence
- Magenta: creative emphasis
- Coral: recording / attention
- Amber: warnings / secondary attention
- Navy: primary text / dark UI
- Slate/Gray: secondary text
