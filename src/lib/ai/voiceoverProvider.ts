export interface VoiceoverVoice {
	id: string;
	name: string;
	language: string;
	gender: "Female" | "Male";
	grade?: string;
	traits?: string;
}

export type VoiceoverModelStatus = "not-downloaded" | "downloaded" | "corrupted";

export interface VoiceoverResult {
	success: boolean;
	audioPath?: string;
	durationMs?: number;
	tier?: "kokoro-onnx" | "apple-native-speech" | "system-speech";
	error?: string;
}

export const FALLBACK_VOICEOVER_VOICES: VoiceoverVoice[] = [
	{ id: "af_heart", name: "Heart", language: "en-US", gender: "Female", grade: "A", traits: "Warm, natural" },
	{ id: "af_bella", name: "Bella", language: "en-US", gender: "Female", grade: "A-", traits: "Dynamic, clear" },
	{ id: "af_nicole", name: "Nicole", language: "en-US", gender: "Female", grade: "B-", traits: "Calm, narrative" },
	{ id: "af_sarah", name: "Sarah", language: "en-US", gender: "Female", grade: "C+", traits: "Upbeat" },
	{ id: "af_sky", name: "Sky", language: "en-US", gender: "Female", grade: "C-", traits: "Crisp" },
	{ id: "am_adam", name: "Adam", language: "en-US", gender: "Male", grade: "B", traits: "Deep, formal" },
	{ id: "am_michael", name: "Michael", language: "en-US", gender: "Male", grade: "C+", traits: "Conversational" },
	{ id: "am_echo", name: "Echo", language: "en-US", gender: "Male", grade: "C", traits: "Direct" },
	{ id: "am_eric", name: "Eric", language: "en-US", gender: "Male", grade: "C", traits: "Friendly" },
	{ id: "am_liam", name: "Liam", language: "en-US", gender: "Male", grade: "C", traits: "Narrative" },
	{ id: "bf_emma", name: "Emma", language: "en-GB", gender: "Female", grade: "B-", traits: "British, polished" },
	{ id: "bf_isabella", name: "Isabella", language: "en-GB", gender: "Female", grade: "C", traits: "British, articulate" },
	{ id: "bf_alice", name: "Alice", language: "en-GB", gender: "Female", grade: "D", traits: "British, formal" },
	{ id: "bf_lily", name: "Lily", language: "en-GB", gender: "Female", grade: "D", traits: "British, expressive" },
	{ id: "bm_george", name: "George", language: "en-GB", gender: "Male", grade: "C", traits: "British, distinguished" },
	{ id: "bm_lewis", name: "Lewis", language: "en-GB", gender: "Male", grade: "D+", traits: "British, clear" },
	{ id: "bm_daniel", name: "Daniel", language: "en-GB", gender: "Male", grade: "D", traits: "British, announcer" },
	{ id: "bm_fable", name: "Fable", language: "en-GB", gender: "Male", grade: "C", traits: "British, storytelling" },
];

export async function getVoiceoverModelStatus(): Promise<{
	success: boolean;
	status: VoiceoverModelStatus;
	path?: string;
}> {
	if (typeof window === "undefined" || !window.electronAPI?.getVoiceoverModelStatus) {
		return { success: false, status: "not-downloaded" };
	}
	return window.electronAPI.getVoiceoverModelStatus();
}

export async function downloadVoiceoverModel(
	onProgress?: (progress: number) => void,
): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
	if (typeof window === "undefined" || !window.electronAPI?.downloadVoiceoverModel) {
		return { success: false, error: "Electron API unavailable" };
	}
	let cleanupProgress: (() => void) | undefined;
	if (onProgress && window.electronAPI.onVoiceoverModelDownloadProgress) {
		cleanupProgress = window.electronAPI.onVoiceoverModelDownloadProgress(({ progress }) => {
			onProgress(progress);
		});
	}
	try {
		const result = await window.electronAPI.downloadVoiceoverModel();
		return result;
	} finally {
		cleanupProgress?.();
	}
}

export async function cancelVoiceoverModelDownload(): Promise<{ success: boolean }> {
	if (typeof window === "undefined" || !window.electronAPI?.cancelVoiceoverModelDownload) {
		return { success: false };
	}
	return window.electronAPI.cancelVoiceoverModelDownload();
}

export async function deleteVoiceoverModel(): Promise<{ success: boolean }> {
	if (typeof window === "undefined" || !window.electronAPI?.deleteVoiceoverModel) {
		return { success: false };
	}
	return window.electronAPI.deleteVoiceoverModel();
}

export async function listVoiceoverVoices(): Promise<VoiceoverVoice[]> {
	if (typeof window === "undefined" || !window.electronAPI?.listVoiceoverVoices) {
		return FALLBACK_VOICEOVER_VOICES;
	}
	try {
		const result = await window.electronAPI.listVoiceoverVoices();
		return result.success && result.voices?.length ? result.voices : FALLBACK_VOICEOVER_VOICES;
	} catch {
		return FALLBACK_VOICEOVER_VOICES;
	}
}

export async function generateVoiceover(options: {
	text: string;
	voice?: string;
	speed?: number;
}): Promise<VoiceoverResult> {
	if (typeof window === "undefined" || !window.electronAPI?.generateVoiceover) {
		return {
			success: false,
			error: "Voiceover generation requires Screenly desktop runtime.",
		};
	}
	return window.electronAPI.generateVoiceover(options);
}
