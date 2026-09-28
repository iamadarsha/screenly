/**
 * Whether the HUD is actively recording, tracked in a standalone module with zero
 * Electron dependency so other main-process modules (e.g. voiceoverService.ts) can
 * read it without pulling in windows.ts's full BrowserWindow/Tray surface — that
 * would make unit-testing them require a much heavier Electron mock.
 * The source of truth is windows.ts's setHudOverlayRecordingActive, which calls
 * setRecordingActive() alongside its own internal state.
 */
let recordingActive = false;

export function isRecordingActive(): boolean {
	return recordingActive;
}

export function setRecordingActive(active: boolean): void {
	recordingActive = active;
}
