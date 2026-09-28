import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { readWhisperCaptionOutput } from "./output";
let directory: string;
let output: string;
beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "recordly-caption-output-"));
	output = path.join(directory, "speech");
	await fs.writeFile(`${output}.srt`, "1\n00:00:01,200 --> 00:00:02,400\nFallback speech\n");
});
afterEach(async () => {
	await fs.rm(directory, { recursive: true, force: true });
});
it.each([
	undefined,
	"invalid json",
	'{"transcription":[]}',
])("uses SRT when JSON is unusable: %s", async (json) => {
	if (json !== undefined) await fs.writeFile(`${output}.json`, json);
	const result = await readWhisperCaptionOutput(output, true);
	expect(result.cues).toEqual([
		{ id: "caption-1", startMs: 1200, endMs: 2400, text: "Fallback speech" },
	]);
	expect(result.detectedLanguage).toBeUndefined();
});
it("prefers valid JSON word timing", async () => {
	await fs.writeFile(
		`${output}.json`,
		JSON.stringify({
			result: { language: "en" },
			transcription: [
				{
					offsets: { from: 1200, to: 2400 },
					text: "Timed speech",
					tokens: [
						{ text: "Timed", offsets: { from: 1200, to: 1800 } },
						{ text: " speech", offsets: { from: 1800, to: 2400 } },
					],
				},
			],
		}),
	);
	const result = await readWhisperCaptionOutput(output, true);
	expect(result.cues[0].text).toBe("Timed speech");
	expect(result.cues[0].words).toHaveLength(2);
	expect(result.cues[0].words?.[1].startMs).toBe(1800);
	expect(result.detectedLanguage).toBe("en");
});
it("still surfaces missing subtitle output", async () => {
	await fs.rm(`${output}.srt`);
	await expect(readWhisperCaptionOutput(output, false)).rejects.toMatchObject({ code: "ENOENT" });
});
