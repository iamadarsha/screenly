import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	FALLBACK_VOICEOVER_VOICES,
	generateVoiceover,
	getVoiceoverModelStatus,
	listVoiceoverVoices,
} from "./voiceoverProvider";

describe("voiceoverProvider", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns fallback voices when electronAPI is unavailable", async () => {
		vi.stubGlobal("window", {});
		const voices = await listVoiceoverVoices();
		expect(voices).toEqual(FALLBACK_VOICEOVER_VOICES);
	});

	it("queries electronAPI for voices when available", async () => {
		const mockVoices = [
			{ id: "custom_voice", name: "Custom", language: "en-US", gender: "Female" as const },
		];
		vi.stubGlobal("window", {
			electronAPI: {
				listVoiceoverVoices: vi.fn().mockResolvedValue({ success: true, voices: mockVoices }),
			},
		});

		const voices = await listVoiceoverVoices();
		expect(voices).toEqual(mockVoices);
	});

	it("handles getVoiceoverModelStatus when electronAPI is available", async () => {
		vi.stubGlobal("window", {
			electronAPI: {
				getVoiceoverModelStatus: vi.fn().mockResolvedValue({
					success: true,
					status: "downloaded",
					path: "/models/kokoro.onnx",
				}),
			},
		});

		const res = await getVoiceoverModelStatus();
		expect(res.status).toBe("downloaded");
	});

	it("fails safely when generateVoiceover is called without desktop runtime", async () => {
		vi.stubGlobal("window", {});
		const res = await generateVoiceover({ text: "Hello world" });
		expect(res.success).toBe(false);
		expect(res.error).toMatch(/runtime/i);
	});
});
