import { ipcMain } from "electron";
import {
	deleteVoiceoverModel,
	downloadVoiceoverModel,
	generateVoiceoverAudio,
	getVoiceoverModelStatus,
	listVoiceoverVoices,
	type GenerateVoiceoverOptions,
} from "../ai/voiceoverService";

let activeDownloadController: AbortController | null = null;

export function registerVoiceoverHandlers() {
	ipcMain.handle("get-voiceover-model-status", async () => {
		return getVoiceoverModelStatus();
	});

	ipcMain.handle("download-voiceover-model", async (event) => {
		if (activeDownloadController) {
			activeDownloadController.abort();
		}
		const controller = new AbortController();
		activeDownloadController = controller;
		try {
			const result = await downloadVoiceoverModel({
				signal: controller.signal,
				onProgress: (progress) => {
					event.sender.send("voiceover-model-download-progress", { progress });
				},
			});
			return result;
		} finally {
			if (activeDownloadController === controller) {
				activeDownloadController = null;
			}
		}
	});

	ipcMain.handle("cancel-voiceover-model-download", async () => {
		activeDownloadController?.abort();
		activeDownloadController = null;
		return { success: true };
	});

	ipcMain.handle("delete-voiceover-model", async () => {
		return deleteVoiceoverModel();
	});

	ipcMain.handle("list-voiceover-voices", async () => {
		return listVoiceoverVoices();
	});

	ipcMain.handle("generate-voiceover", async (_event, options: GenerateVoiceoverOptions) => {
		return generateVoiceoverAudio(options);
	});
}
