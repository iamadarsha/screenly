import { ipcMain } from "electron";
import {
	GEMMA4_E4B_MODEL_PATH,
	GEMMA4_E4B_MODEL_SHA256,
	GEMMA4_E4B_MODEL_URL,
} from "../constants";
import { deleteModel, downloadModel, getModelStatus, type ModelDescriptor } from "../ai/modelManager";

const GEMMA4_E4B_DESCRIPTOR: ModelDescriptor = {
	id: "gemma-4-e4b-it-q4_0",
	url: GEMMA4_E4B_MODEL_URL,
	sha256: GEMMA4_E4B_MODEL_SHA256,
	destinationPath: GEMMA4_E4B_MODEL_PATH,
};

const activeDownloadControllers = new Map<string, AbortController>();

export function registerAiModelHandlers() {
	ipcMain.handle("get-ai-model-status", async () => {
		const status = await getModelStatus(GEMMA4_E4B_DESCRIPTOR);
		return { success: true, status, path: GEMMA4_E4B_MODEL_PATH };
	});

	ipcMain.handle("download-ai-model", async (event) => {
		const controller = new AbortController();
		activeDownloadControllers.set(GEMMA4_E4B_DESCRIPTOR.id, controller);
		try {
			const result = await downloadModel(GEMMA4_E4B_DESCRIPTOR, {
				signal: controller.signal,
				onProgress: (progress) => {
					event.sender.send("ai-model-download-progress", { progress });
				},
			});
			return result;
		} finally {
			activeDownloadControllers.delete(GEMMA4_E4B_DESCRIPTOR.id);
		}
	});

	ipcMain.handle("cancel-ai-model-download", async () => {
		const controller = activeDownloadControllers.get(GEMMA4_E4B_DESCRIPTOR.id);
		controller?.abort();
		return { success: true };
	});

	ipcMain.handle("delete-ai-model", async () => {
		await deleteModel(GEMMA4_E4B_DESCRIPTOR);
		return { success: true };
	});
}
