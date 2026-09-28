import { describe, expect, it } from "vitest";
import type { CaptionCue } from "@/components/video-editor/types";
import { generateChaptersFromCaptions } from "./chapterHeuristics";

function cue(overrides: Partial<CaptionCue> = {}): CaptionCue {
	return { id: "c", startMs: 0, endMs: 1000, text: "hello world", ...overrides };
}

describe("generateChaptersFromCaptions", () => {
	it("reports unavailable when there are no captions", () => {
		expect(generateChaptersFromCaptions([], 60_000)).toEqual({
			status: "unavailable",
			reason: "No captions available to derive chapters from.",
		});
	});

	it("always starts a first chapter at 0ms titled from the opening words", () => {
		const outcome = generateChaptersFromCaptions(
			[cue({ startMs: 500, endMs: 1500, text: "Welcome to the demo today" })],
			60_000,
		);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data[0]).toEqual({
			id: "chapter-1",
			atMs: 0,
			title: "Welcome to the demo today",
		});
		expect(outcome.result.tier).toBe("tier-0-heuristic");
	});

	it("starts a new chapter after a long pause between cues", () => {
		const cues = [
			cue({ id: "a", startMs: 0, endMs: 1000, text: "First topic starts here" }),
			// 5s gap, exceeds the 4s threshold and the 15s min-spacing from chapter 1's 0ms
			cue({ id: "b", startMs: 20_000, endMs: 21_000, text: "Now a new topic begins" }),
		];
		const outcome = generateChaptersFromCaptions(cues, 60_000);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.map((c) => c.title)).toEqual([
			"First topic starts here",
			"Now a new topic begins",
		]);
		expect(outcome.result.data[1].atMs).toBe(20_000);
	});

	it("does not start a new chapter for a short pause", () => {
		const cues = [
			cue({ id: "a", startMs: 0, endMs: 1000, text: "One continuous thought" }),
			cue({ id: "b", startMs: 1500, endMs: 2500, text: "still going" }), // 500ms gap
		];
		const outcome = generateChaptersFromCaptions(cues, 60_000);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data).toHaveLength(1);
	});

	it("respects the minimum chapter spacing even when gaps qualify", () => {
		const cues = [
			cue({ id: "a", startMs: 0, endMs: 1000, text: "Intro" }),
			cue({ id: "b", startMs: 6000, endMs: 7000, text: "Too soon after intro" }), // 5s gap, but only 6s after chapter 1
			cue({ id: "c", startMs: 30_000, endMs: 31_000, text: "Far enough now" }),
		];
		const outcome = generateChaptersFromCaptions(cues, 60_000);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.map((c) => c.title)).toEqual(["Intro", "Far enough now"]);
	});

	it("handles cues given out of order", () => {
		const cues = [
			cue({ id: "b", startMs: 20_000, endMs: 21_000, text: "Second" }),
			cue({ id: "a", startMs: 0, endMs: 1000, text: "First" }),
		];
		const outcome = generateChaptersFromCaptions(cues, 60_000);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.map((c) => c.title)).toEqual(["First", "Second"]);
	});

	it("truncates a long opening line into a short title", () => {
		const outcome = generateChaptersFromCaptions(
			[cue({ text: "This is a very long sentence that goes on and on and on past the limit" })],
			60_000,
		);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data[0].title.length).toBeLessThanOrEqual(41); // 40 chars + ellipsis
		expect(outcome.result.data[0].title.split(/\s+/).length).toBeLessThanOrEqual(6);
	});

	it("clamps chapter timestamps to the total duration", () => {
		const cues = [cue({ startMs: 0, endMs: 1000, text: "Intro" })];
		const outcome = generateChaptersFromCaptions(cues, 500);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data[0].atMs).toBeLessThanOrEqual(500);
	});
});
