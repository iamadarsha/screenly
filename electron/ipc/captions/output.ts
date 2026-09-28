import fs from "node:fs/promises";
import { parseSrtCues, parseWhisperJsonCues } from "./parser";

/** Older Whisper builds may emit SRT without the requested word-timing JSON. */
export async function readWhisperCaptionOutput(outputBase: string, jsonEnabled: boolean) {
	if (jsonEnabled) {
		let json = "";
		try {
			json = await fs.readFile(`${outputBase}.json`, "utf8");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		const parsed = json ? parseWhisperJsonCues(json) : { cues: [] };
		if (parsed.cues.length) return parsed;
		console.warn("[auto-captions] No usable JSON timing output; falling back to SRT.");
	}
	// SRT carries no language metadata, so this path never yields a detectedLanguage.
	return { cues: parseSrtCues(await fs.readFile(`${outputBase}.srt`, "utf8")) };
}
