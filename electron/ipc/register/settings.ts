import { createCountdownController } from "../../countdownController";
import fs from "node:fs/promises";
import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { hasAppSetting, readAppSettingsStore, writeAppSettingsStore } from "../../appSettingsStore";
import { hideCursor } from "../../cursorHider";
import { createCountdownWindow } from "../../windows";
import {
	COUNTDOWN_SETTINGS_FILE,
	RECORDINGS_SETTINGS_FILE,
	REPLAY_BUFFER_SAVE_SHORTCUT,
	REPLAY_BUFFER_SETTINGS_FILE,
	SHORTCUTS_FILE,
} from "../constants";
import {
	startReplayBufferCapture,
	stopReplayBufferCapture,
	saveReplay,
} from "../recording/replayBuffer";
import {
	createRecordingPreferencesStore,
	type RecordingPreferencesPatch,
} from "../settings/recordingPreferencesStore";
import { createReplayBufferSettingsStore } from "../settings/replayBufferSettingsStore";
import {
	countdownInProgress,
	countdownRemaining,
	setCountdownInProgress,
	setCountdownRemaining,
} from "../state";
import { parseJsonWithByteOrderMark } from "../utils";

const BROWSER_MICROPHONE_PROFILE_ENV = "SCREENLY_BROWSER_MIC_PROFILE";
const DEFAULT_BROWSER_MICROPHONE_PROFILE = "processed";
const recordingPreferencesStore = createRecordingPreferencesStore(RECORDINGS_SETTINGS_FILE);
const replayBufferSettingsStore = createReplayBufferSettingsStore(REPLAY_BUFFER_SETTINGS_FILE);
const BROWSER_MICROPHONE_PROFILES = new Set([
	"processed",
	"no-agc",
	"no-echo",
	"no-noise-suppression",
	"raw",
]);

function getBrowserMicrophoneProfileFromEnv() {
	const requested = process.env[BROWSER_MICROPHONE_PROFILE_ENV]?.trim() || null;
	const normalized = requested?.toLowerCase() ?? DEFAULT_BROWSER_MICROPHONE_PROFILE;
	return {
		browserMicrophoneProfile: BROWSER_MICROPHONE_PROFILES.has(normalized)
			? normalized
			: DEFAULT_BROWSER_MICROPHONE_PROFILE,
		requestedBrowserMicrophoneProfile: requested,
	};
}

export function registerSettingsHandlers() {
	ipcMain.handle(
		"get-window-fullscreen",
		(event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false,
	);
	ipcMain.handle("app:getVersion", () => {
		return app.getVersion();
	});

	ipcMain.handle("get-window-chrome", (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		return {
			trafficLightsVisible:
				process.platform === "darwin" &&
				!!win &&
				!win.isFullScreen() &&
				!win.isSimpleFullScreen(),
		};
	});

	ipcMain.handle("get-platform", () => {
		return process.platform;
	});

	ipcMain.on("app-settings:get", (event, key: unknown) => {
		try {
			if (typeof key !== "string" || key.length === 0) {
				event.returnValue = { success: false, value: null };
				return;
			}

			const store = readAppSettingsStore();
			event.returnValue = {
				success: true,
				value: hasAppSetting(store, key) ? store[key] : null,
			};
		} catch (error) {
			console.error("Failed to read app setting:", error);
			event.returnValue = { success: false, value: null };
		}
	});

	ipcMain.on("app-settings:set", (event, key: unknown, value: unknown) => {
		try {
			if (typeof key !== "string" || key.length === 0) {
				event.returnValue = { success: false };
				return;
			}

			const store = readAppSettingsStore();
			store[key] = value;
			writeAppSettingsStore(store);
			event.returnValue = { success: true };
		} catch (error) {
			console.error("Failed to save app setting:", error);
			event.returnValue = { success: false };
		}
	});

	// ---------------------------------------------------------------------------
	// Cursor hiding for the browser-capture fallback.
	// The IPC promise resolves only after the cursor hide attempt completes.
	// ---------------------------------------------------------------------------
	ipcMain.handle("hide-cursor", () => {
		if (process.platform !== "win32") {
			return { success: true };
		}

		return { success: hideCursor() };
	});

	ipcMain.handle("get-shortcuts", async () => {
		try {
			const data = await fs.readFile(SHORTCUTS_FILE, "utf-8");
			return parseJsonWithByteOrderMark(data);
		} catch {
			return null;
		}
	});

	ipcMain.handle("save-shortcuts", async (_, shortcuts: unknown) => {
		try {
			await fs.writeFile(SHORTCUTS_FILE, JSON.stringify(shortcuts, null, 2), "utf-8");
			return { success: true };
		} catch (error) {
			console.error("Failed to save shortcuts:", error);
			return { success: false, error: String(error) };
		}
	});

	// ---------------------------------------------------------------------------
	// Countdown timer before recording
	// ---------------------------------------------------------------------------
	ipcMain.handle("get-recording-preferences", async () => {
		try {
			const parsed = await recordingPreferencesStore.read();
			return {
				success: true,
				microphoneEnabled: parsed.microphoneEnabled === true,
				microphoneDeviceId:
					typeof parsed.microphoneDeviceId === "string"
						? parsed.microphoneDeviceId
						: undefined,
				systemAudioEnabled: parsed.systemAudioEnabled === true,
				webcamEnabled: parsed.webcamEnabled === true,
				webcamDeviceId:
					typeof parsed.webcamDeviceId === "string" ? parsed.webcamDeviceId : undefined,
			};
		} catch {
			return {
				success: true,
				microphoneEnabled: false,
				microphoneDeviceId: undefined,
				systemAudioEnabled: false,
				webcamEnabled: false,
				webcamDeviceId: undefined,
			};
		}
	});

	ipcMain.handle("get-recording-audio-lab-config", () => {
		return getBrowserMicrophoneProfileFromEnv();
	});

	ipcMain.handle("set-recording-preferences", async (_, prefs: RecordingPreferencesPatch) => {
		try {
			await recordingPreferencesStore.update(prefs);
			return { success: true };
		} catch (error) {
			console.error("Failed to save recording preferences:", error);
			return { success: false, error: String(error) };
		}
	});

	ipcMain.handle("get-replay-buffer-settings", async () => {
		const settings = await replayBufferSettingsStore.read();
		return { success: true, ...settings };
	});

	ipcMain.handle(
		"set-replay-buffer-settings",
		async (_, patch: { enabled?: boolean; durationSec?: number }) => {
			try {
				const settings = await replayBufferSettingsStore.update(patch);
				if (settings.enabled) {
					await startReplayBufferCapture(settings.durationSec);
					registerReplayBufferShortcut();
				} else {
					await stopReplayBufferCapture();
					unregisterReplayBufferShortcut();
				}
				return { success: true, ...settings };
			} catch (error) {
				console.error("Failed to update Instant Replay settings:", error);
				return { success: false, error: String(error) };
			}
		},
	);

	ipcMain.handle("save-replay", async () => {
		const settings = await replayBufferSettingsStore.read();
		return saveReplay(settings.durationSec);
	});

	ipcMain.handle("get-countdown-delay", async () => {
		try {
			const content = await fs.readFile(COUNTDOWN_SETTINGS_FILE, "utf-8");
			const parsed = parseJsonWithByteOrderMark<{ delay?: number }>(content);
			return { success: true, delay: parsed.delay ?? 3 };
		} catch {
			return { success: true, delay: 3 };
		}
	});

	ipcMain.handle("set-countdown-delay", async (_, delay: number) => {
		try {
			await fs.writeFile(
				COUNTDOWN_SETTINGS_FILE,
				JSON.stringify({ delay }, null, 2),
				"utf-8",
			);
			return { success: true };
		} catch (error) {
			console.error("Failed to save countdown delay:", error);
			return { success: false, error: String(error) };
		}
	});

	const countdown = createCountdownController(createCountdownWindow, (remaining) => {
		setCountdownRemaining(remaining);
		setCountdownInProgress(remaining !== null);
	});
	ipcMain.handle("start-countdown", (_, seconds: number) => countdown.start(seconds));
	ipcMain.handle("cancel-countdown", () => countdown.cancel());

	ipcMain.handle("get-active-countdown", () => {
		return {
			success: true,
			seconds: countdownInProgress ? countdownRemaining : null,
		};
	});
}

/** For the global "Save Replay" shortcut, which isn't triggered via ipcMain. */
async function triggerSaveReplay() {
	const settings = await replayBufferSettingsStore.read();
	const result = await saveReplay(settings.durationSec);
	for (const window of BrowserWindow.getAllWindows()) {
		if (!window.isDestroyed()) {
			window.webContents.send("replay-saved", result);
		}
	}
	return result;
}

/** Only held while Instant Replay is enabled - never competes with other apps' shortcuts otherwise. */
export function registerReplayBufferShortcut(): void {
	if (globalShortcut.isRegistered(REPLAY_BUFFER_SAVE_SHORTCUT)) return;
	globalShortcut.register(REPLAY_BUFFER_SAVE_SHORTCUT, () => {
		void triggerSaveReplay();
	});
}

export function unregisterReplayBufferShortcut(): void {
	globalShortcut.unregister(REPLAY_BUFFER_SAVE_SHORTCUT);
}

/** Resume Instant Replay's background capture (and its shortcut) on launch if left enabled. */
export async function initializeReplayBufferOnStartup(): Promise<void> {
	const settings = await replayBufferSettingsStore.read();
	if (settings.enabled) {
		await startReplayBufferCapture(settings.durationSec);
		registerReplayBufferShortcut();
	}
}
