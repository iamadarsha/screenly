import { ipcMain, shell, systemPreferences } from "electron";
import { getMacPrivacySettingsUrl } from "../utils";

export function registerPermissionHandlers() {
	ipcMain.handle("open-external-url", async (_, url: string) => {
		try {
			// Security: only allow http/https URLs to prevent file:// or custom protocol abuse
			const parsed = new URL(url);
			if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
				return { success: false, error: `Blocked non-HTTP URL: ${parsed.protocol}` };
			}
			await shell.openExternal(url);
			return { success: true };
		} catch (error) {
			console.error("Failed to open URL:", error);
			return { success: false, error: String(error) };
		}
	});

	ipcMain.handle("get-accessibility-permission-status", () => {
		if (process.platform !== "darwin") {
			return { success: true, trusted: true, prompted: false };
		}

		return {
			success: true,
			trusted: systemPreferences.isTrustedAccessibilityClient(false),
			prompted: false,
		};
	});

	ipcMain.handle("request-accessibility-permission", () => {
		if (process.platform !== "darwin") {
			return { success: true, trusted: true, prompted: false };
		}

		return {
			success: true,
			trusted: systemPreferences.isTrustedAccessibilityClient(true),
			prompted: true,
		};
	});

	ipcMain.handle("get-screen-recording-permission-status", () => {
		if (process.platform !== "darwin") {
			return { success: true, status: "granted" };
		}

		try {
			return {
				success: true,
				status: systemPreferences.getMediaAccessStatus("screen"),
			};
		} catch (error) {
			console.error("Failed to get screen recording permission status:", error);
			return { success: false, status: "unknown", error: String(error) };
		}
	});

	ipcMain.handle("open-screen-recording-preferences", async () => {
		if (process.platform !== "darwin") {
			return { success: true };
		}

		try {
			await shell.openExternal(getMacPrivacySettingsUrl("screen"));
			return { success: true };
		} catch (error) {
			console.error("Failed to open Screen Recording preferences:", error);
			return { success: false, error: String(error) };
		}
	});

	ipcMain.handle("open-accessibility-preferences", async () => {
		if (process.platform !== "darwin") {
			return { success: true };
		}

		try {
			await shell.openExternal(getMacPrivacySettingsUrl("accessibility"));
			return { success: true };
		} catch (error) {
			console.error("Failed to open Accessibility preferences:", error);
			return { success: false, error: String(error) };
		}
	});

	ipcMain.handle("get-camera-permission-status", () => {
		if (process.platform !== "darwin") {
			return { success: true, status: "granted" };
		}

		try {
			return {
				success: true,
				status: systemPreferences.getMediaAccessStatus("camera"),
			};
		} catch (error) {
			console.error("Failed to get camera permission status:", error);
			return { success: false, status: "unknown", error: String(error) };
		}
	});

	ipcMain.handle("request-camera-permission", async () => {
		if (process.platform !== "darwin") {
			return { success: true, granted: true };
		}

		try {
			const currentStatus = systemPreferences.getMediaAccessStatus("camera");
			if (currentStatus === "granted") {
				return { success: true, granted: true };
			}
			const granted = await systemPreferences.askForMediaAccess("camera");
			return { success: true, granted };
		} catch (error) {
			console.error("Failed to request camera permission:", error);
			return { success: false, granted: false, error: String(error) };
		}
	});

	ipcMain.handle("open-camera-preferences", async () => {
		if (process.platform !== "darwin") {
			return { success: true };
		}

		try {
			await shell.openExternal(getMacPrivacySettingsUrl("camera"));
			return { success: true };
		} catch (error) {
			console.error("Failed to open Camera preferences:", error);
			return { success: false, error: String(error) };
		}
	});
}
