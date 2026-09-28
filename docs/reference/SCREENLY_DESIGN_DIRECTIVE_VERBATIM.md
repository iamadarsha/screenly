# SCREENLY design directive - verbatim copy of the owner's message (read-only reference, do not edit)

Design-only directive

Scope: SCREENLY's complete UI/UX redesign, original visual identity in the application, and an entirely new high-resolution wallpaper collection.

Do not restart the six phases, rewrite working recording or export code, or modify the master PRD.



SCREENLY — Complete Design Divergence & Wallpaper Redesign

Claude Code · Sonnet 5 Medium Thinking · Design-only task

You have already completed approximately 90% of SCREENLY's implementation. Do not restart the project or repeat completed phases. Your task is to make the application visually and experientially distinctive from the original Recordly application.

I have supplied:

The SCREENLY brand guidelines and logo assets.

The current SCREENLY application screenshots, showing the remaining similarities to Recordly.

The existing project and its completed functionality.

The current design is not acceptable as the final SCREENLY design. Replacing the logo, accent colour and background alone is insufficient.

1. First, perform a design divergence audit

Inspect the actual running application, existing React components, stylesheets and supplied screenshots.

Identify and document the elements still resembling Recordly, including:

Overall workspace and editor layout.

Persistent vertical tool rail.

Left-side inspector and its placement.

Central video preview proportions.

Bottom timeline and filmstrip.

Button placement, shapes, iconography and control hierarchy.

Caption, cursor and scene panels.

Background and wallpaper library.

Dialogs, settings and export interface.

Create SCREENLY_DESIGN_DIVERGENCE_AUDIT.md, listing the similarities found, proposed changes and affected files.

Do not change the master PRD.

2. Redesign the editor's information architecture

The editor must have a visibly different composition from Recordly.

Replace the persistent left-side tool rail and its adjacent properties panel with a genuinely different workspace hierarchy.

Use the following as a design direction, adapting it to the existing functionality:

A. Workspace navigation

Introduce a compact, horizontal workspace switcher with distinct destinations:

Home · Record · Studio · Library · Publish

Use a floating, translucent navigation surface. Contextual actions should change according to the selected workspace.

B. Canvas-first Studio

Make the video preview the visual centre of the editor. Use a spacious stage with a clear, deliberate hierarchy.

Put contextual editing controls in a collapsible inspector on the right, rather than reproducing Recordly's left-side settings panel.

Provide separate editing modes for:

Composition

Motion

Cursor

Camera

Audio

Captions

Backgrounds

These modes should share the same underlying editor state. Do not implement duplicate editing engines.

C. Redesigned timeline

Move away from the appearance of a simple filmstrip.

Use a more expressive, expandable timeline with distinct visual tracks for:

Video and retakes

Camera

Audio

Captions

Zooms

Annotations

Give each track a clear visual identity. Use compact waveforms, legible caption blocks, a prominent playhead and precise timestamp controls.

The timeline should have a focused compact mode and an expanded precision-editing mode.

D. Contextual controls

Avoid placing every editing action permanently on screen. Use contextual inspectors, floating toolbars, command search and progressive disclosure.

Preserve discoverability, keyboard shortcuts and existing functionality.

The result must not be a cosmetic rearrangement of the same Recordly screen. Design an original workspace appropriate to SCREENLY.

3. Apply a distinctive Liquid Glass visual language

Use the supplied SCREENLY brand assets and September 2026 brand guidelines.

Preserve the established palette:

Token

	

Colour




Electric Blue

	

#3882F6




Violet

	

#8B5CF6




Magenta

	

#EC4899




Coral

	

#FF686B




Amber

	

#F59E0B




Navy

	

#0B1020




Slate

	

#334155




Light

	

#F1F5F9




White

	

#FFFFFF

Build a consistent material system with:

Translucent floating navigation.

Distinctive glass inspector surfaces.

Subtle edge highlights and controlled reflections.

Carefully layered depth and soft shadows.

Restrained gradient accents.

Cohesive hover, focus, selection and pressed states.

Polished light and dark modes.

Use Liquid Glass most prominently for navigation and functional controls. Keep text-heavy panels and media content readable using appropriate standard surfaces.

Avoid excessive blur, glowing borders, decorative animations and unnecessarily transparent text backgrounds.

Follow Apple's published material guidance, particularly its separation between the functional glass layer and the content layer. 
Apple Developer Documentation
+1

Preserve accessibility:

Keyboard operation.

Clearly visible focus.

Legible text against all backdrops.

Reduced-transparency and increased-contrast support.

Reduced Motion.

Appropriate minimum target sizes.

4. Completely replace the existing wallpaper collection

This is a major part of the redesign.

The current SCREENLY backgrounds are too similar to the Recordly wallpaper assets. Remove their use as default SCREENLY wallpapers. Do not merely recolour, crop, blur or slightly alter the existing images.

Create a new, original wallpaper collection with at least 20 distinct backgrounds, grouped into these categories:

Category

	

Visual direction




Abstract

	

Original flowing shapes, smooth gradients and layered forms




Aurora

	

Atmospheric northern-light-inspired compositions




Alpine

	

Cinematic mountain ranges and soft dawn lighting




Coast

	

Calm coastlines, deep oceans and subtle horizon gradients




Botanical

	

Minimal botanical imagery and sophisticated greens




Cosmic

	

Original nebula-inspired and celestial compositions




Topographic

	

Elegant contour lines and abstract terrain




Minimal

	

Subtle colour fields suitable for professional demos

These should feel like premium desktop wallpapers: refined, minimal, cinematic and visually rich, without copying Apple's published wallpapers.

Resolution requirements

Minimum: 3840 × 2160 pixels for landscape wallpapers.

Preferred: 5120 × 2880 pixels where the source genuinely supports it.

Provide portrait variants at 2160 × 3840 where useful.

Do not artificially upscale lower-resolution photographs and label them 4K.

Preserve the original high-resolution source for rendering and export.

Generate efficient thumbnails separately from the master images.

For vector and procedural backgrounds, maintain resolution-independent sources wherever feasible.

Wallpaper sources and licensing

Prefer the following in order:

1. Original procedural and generated assets

Create distinctive SCREENLY abstract wallpapers using original gradients, vector art, procedural patterns and newly generated artwork. Record the generation method and any relevant model licensing.

2. Poly Haven

https://polyhaven.com/ 

Use its CC0 textures, HDRIs and 3D assets to produce original, high-resolution landscape or abstract wallpaper renders where suitable. Poly Haven explicitly permits commercial use and redistribution of its CC0 assets. 
Poly Haven

3. Wikimedia Commons

https://commons.wikimedia.org/ 

Consider individual high-resolution public-domain or commercially redistributable images. Inspect the license of every individual file and supply all required attribution and license information. Do not assume that every image on Commons has identical terms. 
Wikimedia Commons

4. NASA imagery

https://images.nasa.gov/ 

Use only individually checked imagery, particularly space imagery. Exclude third-party copyrighted images and ensure that any use complies with NASA's media guidelines. Do not suggest NASA endorses SCREENLY. 
nasa.gov

Do not use Apple's original macOS wallpaper files or Recordly's existing wallpapers.

Do not automatically bundle Unsplash or Pexels images as a redistributable wallpaper pack. Although they allow many types of commercial use, their current licenses impose specific restrictions on standalone redistribution and competing collections. Obtain specific permission before using an asset where its intended distribution is uncertain. 
Unsplash
+2

For every included third-party image, record:

Image filename.

Original source URL.

Creator.

Original resolution.

License and license URL.

Date checked.

Required attribution.

Modifications made.

Store this in SCREENLY_WALLPAPER_CREDITS.md.

If licensing cannot be verified, do not ship the image.

Wallpaper interaction

Build a new wallpaper browser that feels native to SCREENLY:

Large visual previews.

Category filters.

Search.

Recently used backgrounds.

Favourites.

Custom wallpaper import.

Crop and reposition controls.

Fit and fill modes.

Blur and brightness controls.

Clear reset action.

The browser itself must be visually different from Recordly's existing grid.

Include a preview that lets users judge how their recording will look against the chosen background before exporting.

5. Redesign every major application surface

Do not limit the work to the video editor.

Apply the new design consistently to:

Home and project library.

New recording setup.

Screen and window selection.

Camera and microphone setup.

Recording HUD.

Webcam preview.

Studio workspace.

Captions and translation panels.

AI suggestions and local model manager.

Export and Export Doctor.

Share screen.

Settings.

Recovery and error dialogs.

Empty, loading and disabled states.

Keep every existing feature operational. Change the presentation and interaction hierarchy, not the underlying capture, editing, export or AI engines.

Recording must still have one obvious primary action. The user must always have a visible camera preview when camera recording is enabled.

6. Add a visual identity check

After the redesign, capture full-window screenshots of the actual application, not merely design mockups.

Compare the new SCREENLY screens with the existing Recordly reference screens at identical window sizes and in matching states.

Verify that the following are materially different:

Overall layout and information architecture.

Navigation hierarchy.

Inspector design and position.

Timeline presentation.

Control arrangement.

Iconography and component styling.

Background imagery.

Typography hierarchy.

Empty and recovery states.

The design should be recognisably SCREENLY even when its logo is hidden.

Maintain a SCREENLY_VISUAL_QA.md report with screenshots, differences identified and any remaining similarities.

This is a visual distinctiveness review, not a legal guarantee. Do not remove legally required attribution or license notices.

7. Technical constraints

Work only in the existing SCREENLY/Recordly repository folder.

Do not edit the master PRD.

Do not restart or reorder the six-phase plan.

Do not rewrite the recording pipeline.

Do not change working media timing, export or AI behaviour merely to facilitate styling.

Do not delete existing functionality.

Do not replace existing project data formats without a migration requirement.

Reuse established components where useful, but do not preserve components whose only purpose is to reproduce the old visual hierarchy.

Keep the dependency footprint small.

Do not introduce broken placeholder controls.

Do not claim a feature works if it is only visually implemented.

8. Testing and acceptance

After each meaningful design change, run the relevant UI checks.

At the end, run:

Typecheck.

Lint and format checks.

Existing UI regression tests.

Relevant editor, timeline and project tests.

Build and launch verification where the environment permits.

Verify light and dark appearance, narrow and wide window sizes, reduced transparency, reduced motion and keyboard navigation.

Confirm that all 20 wallpapers meet the resolution and licensing requirements, and that none duplicates the existing Recordly wallpaper collection.

Final acceptance criteria:

The interface is recognisably different from the existing Recordly UI.

The editor has an original information architecture.

Liquid Glass is prominent but does not compromise readability.

All default wallpaper assets are new and meet the stated resolution requirements.

Every third-party wallpaper has verified reuse rights and recorded provenance.

All existing recording, editing, export and AI functionality continues to work.

No broken visual controls, missing states or obvious layout regressions remain.

Implement the redesign in the existing codebase. Start with the audit, then make the changes in small, testable steps. Finish with the visual QA report and an exact list of remaining limitations.


https://unsplash.com/s/photos/high-res-wallpaper https://www.pexels.com/search/4k%20wallpaper/

but allwallpapers must be apple like, mac like
