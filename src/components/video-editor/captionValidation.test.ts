import { describe, expect, it } from "vitest";
import { sanitizeCaptionCues, validateCaptionCues } from "./captionValidation";
import type { CaptionCue } from "./types";

function cue(overrides: Partial<CaptionCue> = {}): CaptionCue {
	return { id: "cue-1", startMs: 0, endMs: 1000, text: "hello", ...overrides };
}

describe("validateCaptionCues", () => {
	it("reports nothing for a clean, in-bounds, non-overlapping set of cues", () => {
		const cues = [
			cue({ id: "a", startMs: 0, endMs: 1000 }),
			cue({ id: "b", startMs: 1000, endMs: 2000 }),
		];
		expect(validateCaptionCues(cues, 5000)).toEqual([]);
	});

	it("flags a cue with endMs <= startMs", () => {
		const issues = validateCaptionCues([cue({ startMs: 1000, endMs: 1000 })], 5000);
		expect(issues.map((i) => i.code)).toEqual(["cue-invalid-duration"]);
	});

	it("flags a cue that extends past the video duration", () => {
		const issues = validateCaptionCues([cue({ startMs: 0, endMs: 6000 })], 5000);
		expect(issues.map((i) => i.code)).toEqual(["cue-out-of-bounds"]);
	});

	it("tolerates small rounding overshoot past the duration", () => {
		const issues = validateCaptionCues([cue({ startMs: 0, endMs: 5100 })], 5000);
		expect(issues).toEqual([]);
	});

	it("flags overlapping adjacent cues regardless of input order", () => {
		const cues = [
			cue({ id: "b", startMs: 900, endMs: 2000 }),
			cue({ id: "a", startMs: 0, endMs: 1000 }),
		];
		const issues = validateCaptionCues(cues, 5000);
		expect(issues.map((i) => i.code)).toEqual(["cues-overlap"]);
		expect(issues[0].cueId).toBe("b");
	});

	it("flags a word with invalid duration", () => {
		const issues = validateCaptionCues(
			[cue({ words: [{ text: "hi", startMs: 500, endMs: 500 }] })],
			5000,
		);
		expect(issues.map((i) => i.code)).toEqual(["word-invalid-duration"]);
	});

	it("flags a word outside its cue's bounds", () => {
		const issues = validateCaptionCues(
			[cue({ startMs: 0, endMs: 1000, words: [{ text: "hi", startMs: 900, endMs: 2000 }] })],
			5000,
		);
		expect(issues.map((i) => i.code)).toEqual(["word-out-of-cue-bounds"]);
	});

	it("flags overlapping words within the same cue", () => {
		const issues = validateCaptionCues(
			[
				cue({
					startMs: 0,
					endMs: 1000,
					words: [
						{ text: "hi", startMs: 0, endMs: 500 },
						{ text: "there", startMs: 300, endMs: 900 },
					],
				}),
			],
			5000,
		);
		expect(issues.map((i) => i.code)).toEqual(["words-overlap"]);
	});

	it("accepts well-formed word timings within a cue", () => {
		const issues = validateCaptionCues(
			[
				cue({
					startMs: 0,
					endMs: 1000,
					words: [
						{ text: "hi", startMs: 0, endMs: 400 },
						{ text: "there", startMs: 400, endMs: 1000 },
					],
				}),
			],
			5000,
		);
		expect(issues).toEqual([]);
	});

	it("skips the duration bounds check when videoDurationMs is not usable", () => {
		expect(validateCaptionCues([cue({ startMs: 0, endMs: 999_999 })], 0)).toEqual([]);
		expect(validateCaptionCues([cue({ startMs: 0, endMs: 999_999 })], Number.NaN)).toEqual([]);
	});
});

describe("sanitizeCaptionCues", () => {
	it("drops cues with a non-positive duration", () => {
		const cues = [cue({ id: "bad", startMs: 1000, endMs: 900 }), cue({ id: "good" })];
		const result = sanitizeCaptionCues(cues, 5000);
		expect(result.map((c) => c.id)).toEqual(["good"]);
	});

	it("clamps a cue that extends past the video duration instead of dropping it", () => {
		const result = sanitizeCaptionCues([cue({ startMs: 4000, endMs: 6000 })], 5000);
		expect(result).toHaveLength(1);
		expect(result[0].startMs).toBe(4000);
		expect(result[0].endMs).toBe(5000);
	});

	it("clamps a negative startMs to zero", () => {
		const result = sanitizeCaptionCues([cue({ startMs: -500, endMs: 1000 })], 5000);
		expect(result[0].startMs).toBe(0);
	});

	it("drops invalid words but keeps the cue, clamping remaining words to the video's bounds", () => {
		// Sanitize only clamps to the video's own duration, not to the cue's endMs — a word
		// that runs past its cue but is still inside the video is a "word-out-of-cue-bounds"
		// issue for validateCaptionCues to report, not something sanitize silently corrects.
		const result = sanitizeCaptionCues(
			[
				cue({
					startMs: 1000,
					endMs: 2000,
					words: [
						{ text: "bad", startMs: 500, endMs: 500 },
						{ text: "ok", startMs: 1500, endMs: 6000 },
					],
				}),
			],
			5000,
		);
		expect(result).toHaveLength(1);
		expect(result[0].words).toHaveLength(1);
		expect(result[0].words?.[0].text).toBe("ok");
		expect(result[0].words?.[0].endMs).toBe(5000);
	});

	it("never resolves overlaps between cues — that's left for validateCaptionCues to report", () => {
		const cues = [
			cue({ id: "a", startMs: 0, endMs: 1000 }),
			cue({ id: "b", startMs: 500, endMs: 1500 }),
		];
		const result = sanitizeCaptionCues(cues, 5000);
		expect(result.map((c) => ({ id: c.id, startMs: c.startMs, endMs: c.endMs }))).toEqual([
			{ id: "a", startMs: 0, endMs: 1000 },
			{ id: "b", startMs: 500, endMs: 1500 },
		]);
	});

	it("is a no-op for already-clean cues", () => {
		const cues = [cue({ id: "a", startMs: 0, endMs: 1000 })];
		expect(sanitizeCaptionCues(cues, 5000)).toEqual(cues);
	});
});
