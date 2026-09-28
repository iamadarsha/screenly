import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { app } from "electron";
import {
	KOKORO_TTS_MODEL_PATH,
	KOKORO_TTS_MODEL_SHA256,
	KOKORO_TTS_MODEL_URL,
	VOICEOVERS_DIR,
} from "../constants";
import { isRecordingActive } from "../../recordingActiveState";
import { getFfmpegBinaryPath } from "../ffmpeg/binary";
import {
	deleteModel,
	downloadModel,
	getModelStatus,
	type ModelDescriptor,
	type ModelDownloadResult,
	type ModelStatus,
} from "./modelManager";

const execFileAsync = promisify(execFile);

export const KOKORO_MODEL_DESCRIPTOR: ModelDescriptor = {
	id: "kokoro-82m-v1.0-q8",
	url: KOKORO_TTS_MODEL_URL,
	sha256: KOKORO_TTS_MODEL_SHA256,
	destinationPath: KOKORO_TTS_MODEL_PATH,
};

export interface VoiceoverVoice {
	id: string;
	name: string;
	language: string;
	gender: "Female" | "Male";
	grade?: string;
	traits?: string;
}

export const KOKORO_VOICES: VoiceoverVoice[] = [
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

export interface GenerateVoiceoverOptions {
	text: string;
	voice?: string;
	speed?: number;
}

export interface GenerateVoiceoverResult {
	success: boolean;
	audioPath?: string;
	durationMs?: number;
	tier?: "kokoro-onnx" | "apple-native-speech" | "system-speech";
	error?: string;
}

export async function getVoiceoverModelStatus(): Promise<{
	success: boolean;
	status: ModelStatus;
	path: string;
}> {
	const status = await getModelStatus(KOKORO_MODEL_DESCRIPTOR);
	return { success: true, status, path: KOKORO_TTS_MODEL_PATH };
}

export function downloadVoiceoverModel(options: {
	onProgress?: (progress: number) => void;
	signal?: AbortSignal;
}): Promise<ModelDownloadResult> {
	return downloadModel(KOKORO_MODEL_DESCRIPTOR, options);
}

export async function deleteVoiceoverModel(): Promise<{ success: boolean }> {
	await deleteModel(KOKORO_MODEL_DESCRIPTOR);
	return { success: true };
}

export function listVoiceoverVoices(): { success: boolean; voices: VoiceoverVoice[] } {
	return { success: true, voices: KOKORO_VOICES };
}

/**
 * Extracts exact duration in milliseconds from a RIFF WAV file header.
 */
export async function readWavDurationMs(wavFilePath: string): Promise<number> {
	try {
		const buffer = await fs.readFile(wavFilePath);
		if (
			buffer.length >= 44 &&
			buffer.toString("ascii", 0, 4) === "RIFF" &&
			buffer.toString("ascii", 8, 12) === "WAVE"
		) {
			const byteRate = buffer.readUInt32LE(28);
			let offset = 36;
			while (offset + 8 <= buffer.length) {
				const chunkId = buffer.toString("ascii", offset, offset + 4);
				const chunkSize = buffer.readUInt32LE(offset + 4);
				if (chunkId === "data" && byteRate > 0) {
					return Math.max(100, Math.round((chunkSize / byteRate) * 1000));
				}
				offset += 8 + chunkSize;
			}
			if (byteRate > 0) {
				return Math.max(100, Math.round(((buffer.length - 44) / byteRate) * 1000));
			}
		}
		const stats = await fs.stat(wavFilePath);
		return Math.max(100, Math.round((stats.size / 48000) * 1000));
	} catch {
		return 1000;
	}
}

/**
 * Generates speech audio using Kokoro-82M ONNX if the model is downloaded,
 * or deterministically falls back to zero-cloud native speech synthesis.
 */
export async function generateVoiceoverAudio(
	options: GenerateVoiceoverOptions,
): Promise<GenerateVoiceoverResult> {
	const trimmedText = options.text?.trim();
	if (!trimmedText) {
		return { success: false, error: "Cannot generate voiceover for empty text." };
	}

	await fs.mkdir(VOICEOVERS_DIR, { recursive: true });
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).slice(2, 8);
	const targetWavPath = path.join(VOICEOVERS_DIR, `voiceover_${timestamp}_${randomSuffix}.wav`);

	const selectedVoiceId = options.voice || "af_heart";
	const selectedSpeed = Math.min(1.5, Math.max(0.7, options.speed ?? 1.0));

	// Tier 1: Kokoro ONNX local inference if model is downloaded and ready.
	// Kokoro inference runs synchronously on this (main) process — unlike the Gemma
	// LLM, which @electron/llm isolates in its own utility process, kokoro-js has no
	// such isolation available. Skip straight to the fast native-speech fallback while
	// a recording is active, rather than risk stalling IPC (pause/stop) responsiveness
	// during CPU-bound ONNX inference. See PRD "AI must not block the recorder" and the
	// Phase 4 test case "recording during AI processing".
	const modelStatus = await getModelStatus(KOKORO_MODEL_DESCRIPTOR);
	if (modelStatus === "downloaded" && !isRecordingActive()) {
		try {
			const { KokoroTTS } = await import("kokoro-js");
			const tts = await KokoroTTS.from_pretrained(KOKORO_TTS_MODEL_PATH, {
				dtype: "q8",
				device: "cpu",
			});
			const rawAudio = await tts.generate(trimmedText, {
				voice: selectedVoiceId as Parameters<typeof tts.generate>[1] extends { voice?: infer V } ? V : never,
				speed: selectedSpeed,
			});
			await rawAudio.save(targetWavPath);
			const durationMs = Math.round((rawAudio.audio.length / rawAudio.sampling_rate) * 1000);
			return {
				success: true,
				audioPath: targetWavPath,
				durationMs,
				tier: "kokoro-onnx",
			};
		} catch (error) {
			console.warn("[voiceover] Kokoro ONNX generation failed, falling back to native speech:", error);
		}
	}

	// Tier 2: Deterministic local native speech fallback (Zero Cloud Telemetry)
	const ffmpegPath = getFfmpegBinaryPath();

	if (process.platform === "darwin") {
		const tempDir = app?.getPath ? app.getPath("temp") : os.tmpdir();
		const tempAiffPath = path.join(tempDir, `voiceover_temp_${timestamp}_${randomSuffix}.aiff`);
		try {
			// Map Kokoro voice prefix / id to macOS voice
			const isBritish = selectedVoiceId.startsWith("b");
			const isMale = selectedVoiceId.includes("m_") || selectedVoiceId.startsWith("bm_") || selectedVoiceId.startsWith("am_");
			let macVoice = isBritish
				? (isMale ? "Daniel" : "Serena")
				: (isMale ? "Alex" : "Samantha");

			if (selectedVoiceId === "af_bella" || selectedVoiceId === "af_nicole") {
				macVoice = "Ava";
			}

			// macOS say speech rate: ~175 wpm is default 1.0x
			const rate = Math.round(175 * selectedSpeed);

			await execFileAsync("/usr/bin/say", [
				"-v",
				macVoice,
				"-r",
				String(rate),
				"-o",
				tempAiffPath,
				trimmedText,
			]);

			// Convert AIFF to standard PCM 24kHz 16-bit mono WAV
			await execFileAsync(ffmpegPath, [
				"-y",
				"-i",
				tempAiffPath,
				"-c:a",
				"pcm_s16le",
				"-ar",
				"24000",
				"-ac",
				"1",
				targetWavPath,
			]);

			const durationMs = await readWavDurationMs(targetWavPath);
			return {
				success: true,
				audioPath: targetWavPath,
				durationMs,
				tier: "apple-native-speech",
			};
		} catch (fallbackError) {
			return {
				success: false,
				error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
			};
		} finally {
			await fs.rm(tempAiffPath, { force: true }).catch(() => undefined);
		}
	}

	if (process.platform === "win32") {
		try {
			// Windows PowerShell SAPI fallback
			const rateParam = Math.round((selectedSpeed - 1.0) * 10);
			const escapedText = trimmedText.replace(/"/g, '`"').replace(/'/g, "''");
			const script = `
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.Rate = ${rateParam};
$synth.SetOutputToWaveFile('${targetWavPath.replace(/\\/g, "\\\\")}');
$synth.Speak('${escapedText}');
$synth.Dispose();
`;
			await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
			const durationMs = await readWavDurationMs(targetWavPath);
			return {
				success: true,
				audioPath: targetWavPath,
				durationMs,
				tier: "system-speech",
			};
		} catch (winError) {
			return {
				success: false,
				error: winError instanceof Error ? winError.message : String(winError),
			};
		}
	}

	// Linux fallback (e.g. espeak)
	try {
		await execFileAsync("espeak", ["-w", targetWavPath, "-s", String(Math.round(175 * selectedSpeed)), trimmedText]);
		const durationMs = await readWavDurationMs(targetWavPath);
		return {
			success: true,
			audioPath: targetWavPath,
			durationMs,
			tier: "system-speech",
		};
	} catch (_linuxError) {
		return {
			success: false,
			error: "Local speech synthesis is unavailable on this platform. Please install espeak or download Kokoro TTS model.",
		};
	}
}
