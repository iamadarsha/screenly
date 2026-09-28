import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
	KOKORO_VOICES,
	generateVoiceoverAudio,
	getVoiceoverModelStatus,
	listVoiceoverVoices,
	readWavDurationMs,
} from "./voiceoverService";

vi.mock("electron", () => ({
	app: {
		getPath: (name: string) => {
			if (name === "temp") return os.tmpdir();
			if (name === "userData") return path.join(os.tmpdir(), "screenly-test-user-data");
			return os.tmpdir();
		},
	},
}));

describe("voiceoverService", () => {
	it("provides a curated list of Kokoro voices with names, languages, and genders", () => {
		const res = listVoiceoverVoices();
		expect(res.success).toBe(true);
		expect(res.voices.length).toBeGreaterThanOrEqual(10);
		expect(res.voices.some((v) => v.id === "af_heart")).toBe(true);
		expect(res.voices.some((v) => v.id === "am_adam")).toBe(true);
		expect(res.voices.some((v) => v.id === "bf_emma")).toBe(true);
	});

	it("returns model status", async () => {
		const status = await getVoiceoverModelStatus();
		expect(status.success).toBe(true);
		expect(["not-downloaded", "downloaded", "corrupted"]).toContain(status.status);
	});

	it("rejects empty text", async () => {
		const res = await generateVoiceoverAudio({ text: "   " });
		expect(res.success).toBe(false);
		expect(res.error).toMatch(/empty/i);
	});

	it("parses duration from a synthetically generated PCM WAV buffer", async () => {
		const tmpWav = path.join(os.tmpdir(), `test_dur_${Date.now()}.wav`);
		// Create a valid 44-byte RIFF header for 24kHz 16-bit mono PCM (48000 bytes/sec)
		// 96000 data bytes = exactly 2000 ms (2.0 seconds)
		const dataSize = 96000;
		const totalSize = 36 + dataSize;
		const buf = Buffer.alloc(44 + dataSize);
		buf.write("RIFF", 0);
		buf.writeUInt32LE(totalSize, 4);
		buf.write("WAVE", 8);
		buf.write("fmt ", 12);
		buf.writeUInt32LE(16, 16); // Subchunk1Size
		buf.writeUInt16LE(1, 20); // AudioFormat: PCM
		buf.writeUInt16LE(1, 22); // NumChannels: 1
		buf.writeUInt32LE(24000, 24); // SampleRate: 24000
		buf.writeUInt32LE(48000, 28); // ByteRate: 48000
		buf.writeUInt16LE(2, 32); // BlockAlign: 2
		buf.writeUInt16LE(16, 34); // BitsPerSample: 16
		buf.write("data", 36);
		buf.writeUInt32LE(dataSize, 40);

		await fs.writeFile(tmpWav, buf);
		try {
			const durationMs = await readWavDurationMs(tmpWav);
			expect(durationMs).toBe(2000);
		} finally {
			await fs.rm(tmpWav, { force: true });
		}
	});

	it("generates audio on macOS via native speech fallback when model is not downloaded", async () => {
		if (process.platform !== "darwin") return;

		const result = await generateVoiceoverAudio({
			text: "Screenly voiceover unit test.",
			voice: "af_heart",
			speed: 1.0,
		});

		expect(result.success).toBe(true);
		expect(result.audioPath).toBeDefined();
		expect(result.durationMs).toBeGreaterThan(0);
		expect(result.tier).toBe("apple-native-speech");

		if (result.audioPath) {
			const exists = await fs
				.access(result.audioPath)
				.then(() => true)
				.catch(() => false);
			expect(exists).toBe(true);
			await fs.rm(result.audioPath, { force: true });
		}
	});
});
