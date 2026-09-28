import { describe, expect, it } from "vitest";
import type { CaptionEditTarget } from "./captionEditing";
import {
	deleteTranscriptWordRange,
	detectFillerWords,
	detectRepeatedPhrases,
	planTranscriptWordDeletion,
} from "./transcriptEditing";
import type { CaptionCue, ClipRegion } from "./types";

function wordCue(id: string, startMs: number, words: string[], wordDurationMs = 500): CaptionCue {
	const cueWords = words.map((text, index) => ({
		text,
		startMs: startMs + index * wordDurationMs,
		endMs: startMs + (index + 1) * wordDurationMs,
		...(index > 0 ? { leadingSpace: true } : {}),
	}));
	return {
		id,
		startMs: cueWords[0].startMs,
		endMs: cueWords[cueWords.length - 1].endMs,
		text: words.join(" "),
		words: cueWords,
	};
}

function targetFor(cue: CaptionCue, indexes: number[]): CaptionEditTarget {
	const words = indexes.map((cueWordIndex) => {
		const word = cue.words![cueWordIndex];
		return { cueId: cue.id, cueWordIndex, ...word, leadingSpace: Boolean(word.leadingSpace) };
	});
	return {
		id: cue.id,
		startMs: cue.startMs,
		endMs: cue.endMs,
		text: cue.text,
		words,
	};
}

describe("planTranscriptWordDeletion", () => {
	it("returns null for an empty selection", () => {
		const cue = wordCue("a", 0, ["hello", "world"]);
		expect(planTranscriptWordDeletion([cue], { id: "a", startMs: 0, endMs: 0, text: "", words: [] })).toBeNull();
	});

	it("drops a cue entirely when every word is selected", () => {
		const cue = wordCue("a", 0, ["hello", "world"]);
		const plan = planTranscriptWordDeletion([cue], targetFor(cue, [0, 1]));
		expect(plan).not.toBeNull();
		if (!plan) return;
		expect(plan.cues).toEqual([]);
		expect(plan.cutStartMs).toBe(0);
		expect(plan.cutEndMs).toBe(1000);
	});

	it("shrinks a cue's bounds to its remaining words when only some are selected", () => {
		const cue = wordCue("a", 0, ["one", "two", "three"]); // 0-500, 500-1000, 1000-1500
		const plan = planTranscriptWordDeletion([cue], targetFor(cue, [1])); // delete "two"
		expect(plan).not.toBeNull();
		if (!plan) return;
		expect(plan.cues).toHaveLength(1);
		expect(plan.cues[0].text).toBe("one three");
		expect(plan.cutStartMs).toBe(500);
		expect(plan.cutEndMs).toBe(1000);
	});

	it("leaves untouched cues alone", () => {
		const target = wordCue("a", 0, ["hello"]);
		const untouched = wordCue("b", 1000, ["world"]);
		const plan = planTranscriptWordDeletion([target, untouched], targetFor(target, [0]));
		expect(plan).not.toBeNull();
		if (!plan) return;
		expect(plan.cues.map((c) => c.id)).toEqual(["b"]);
	});
});

describe("deleteTranscriptWordRange", () => {
	function clip(id: string, startMs: number, endMs: number): ClipRegion {
		return { id, startMs, endMs, sourceStartMs: startMs, speed: 1 };
	}

	it("cuts the timeline and ripples remaining captions/regions in one atomic result", () => {
		// A single 6s clip; a cue spanning [2000,4000) whose middle word ("two") we delete.
		const cue = wordCue("cue-a", 2000, ["one", "two", "three"], 667); // ~2000-2667-3334-4001
		const clipRegions = [clip("clip-1", 0, 6000)];
		let idCounter = 0;
		const result = deleteTranscriptWordRange({
			target: targetFor(cue, [1]),
			autoCaptions: [cue],
			clipRegions,
			zoomRegions: [{ id: "z", startMs: 500, endMs: 1000, depth: 2, focus: { cx: 0.5, cy: 0.5 } }],
			annotationRegions: [],
			audioRegions: [],
			createClipId: () => `new-${idCounter++}`,
		});

		expect(result).not.toBeNull();
		if (!result) return;

		const removedMs = cue.words![1].endMs - cue.words![1].startMs;
		// clipRegions shrank by exactly the deleted word's duration.
		const totalAfter = result.clipRegions.reduce((sum, c) => sum + (c.endMs - c.startMs), 0);
		expect(totalAfter).toBe(6000 - removedMs);

		// The surviving caption text no longer contains the deleted word.
		expect(result.autoCaptions).toHaveLength(1);
		expect(result.autoCaptions[0].text).toBe("one three");

		// A region entirely before the cut is untouched.
		expect(result.zoomRegions).toEqual([
			{ id: "z", startMs: 500, endMs: 1000, depth: 2, focus: { cx: 0.5, cy: 0.5 } },
		]);
	});

	it("returns null when the selection is empty", () => {
		const result = deleteTranscriptWordRange({
			target: { id: "a", startMs: 0, endMs: 0, text: "", words: [] },
			autoCaptions: [],
			clipRegions: [clip("c", 0, 1000)],
			zoomRegions: [],
			annotationRegions: [],
			audioRegions: [],
			createClipId: () => "id",
		});
		expect(result).toBeNull();
	});
});

describe("detectFillerWords", () => {
	it("flags classic filler words", () => {
		const cue = wordCue("a", 0, ["so", "um", "I", "uh", "think"]);
		const matches = detectFillerWords([cue]);
		expect(matches.map((m) => m.text)).toEqual(["um", "uh"]);
		expect(matches[0]).toMatchObject({ cueId: "a", cueWordIndex: 1 });
	});

	it("does not flag common words that are not classic fillers", () => {
		const cue = wordCue("a", 0, ["so", "like", "actually", "I", "think", "so"]);
		expect(detectFillerWords([cue])).toEqual([]);
	});

	it("matches case-insensitively and strips trailing punctuation", () => {
		const cue = wordCue("a", 0, ["Um,", "hello"]);
		const matches = detectFillerWords([cue]);
		expect(matches).toHaveLength(1);
		expect(matches[0].text).toBe("Um,");
	});

	it("supports a custom filler-word list", () => {
		const cue = wordCue("a", 0, ["basically", "hello"]);
		expect(detectFillerWords([cue], ["basically"])).toHaveLength(1);
	});
});

describe("detectRepeatedPhrases", () => {
	it("detects an immediate single-cue phrase repeat (a stutter/false start)", () => {
		const cue = wordCue("a", 0, ["I", "want", "to", "I", "want", "to", "show", "you"]);
		const matches = detectRepeatedPhrases([cue]);
		expect(matches).toHaveLength(1);
		expect(matches[0]).toMatchObject({
			cueId: "a",
			firstStartIndex: 0,
			firstEndIndexExclusive: 3,
			secondStartIndex: 3,
			secondEndIndexExclusive: 6,
			phrase: "I want to",
		});
	});

	it("prefers the longest matching repeat over a shorter sub-match", () => {
		// "the cat sat" repeated is length-3; "cat sat" (length-2) is a sub-match that should not
		// also be reported once the longer one has claimed those indexes.
		const cue = wordCue("a", 0, ["the", "cat", "sat", "the", "cat", "sat", "down"]);
		const matches = detectRepeatedPhrases([cue]);
		expect(matches).toHaveLength(1);
		expect(matches[0].phrase).toBe("the cat sat");
	});

	it("returns nothing when there is no repeat", () => {
		const cue = wordCue("a", 0, ["hello", "there", "friend"]);
		expect(detectRepeatedPhrases([cue])).toEqual([]);
	});

	it("is case-insensitive and punctuation-insensitive", () => {
		const cue = wordCue("a", 0, ["I", "know,", "I", "know"]);
		expect(detectRepeatedPhrases([cue])).toHaveLength(1);
	});

	it("does not detect repeats across cue boundaries", () => {
		const first = wordCue("a", 0, ["I", "want", "to"]);
		const second = wordCue("b", 2000, ["I", "want", "to", "show", "you"]);
		expect(detectRepeatedPhrases([first, second])).toEqual([]);
	});
});
