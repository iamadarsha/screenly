import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptionCue } from "@/components/video-editor/types";
import { generateChaptersWithAi, isValidChapters } from "./aiChapters";
import { promptLocalModelForJson } from "./localModelProvider";

vi.mock("./localModelProvider", () => ({
	promptLocalModelForJson: vi.fn(),
}));

beforeEach(() => {
	vi.mocked(promptLocalModelForJson).mockReset();
});

function cue(overrides: Partial<CaptionCue> = {}): CaptionCue {
	return { id: "c", startMs: 0, endMs: 1000, text: "hello world", ...overrides };
}

describe("isValidChapters", () => {
	it("accepts a well-formed chapters payload", () => {
		expect(isValidChapters({ chapters: [{ atMs: 0, title: "Intro" }] }, 60_000)).toBe(true);
	});

	it("rejects a non-array/empty chapters field", () => {
		expect(isValidChapters({ chapters: [] }, 60_000)).toBe(false);
		expect(isValidChapters({ chapters: "nope" }, 60_000)).toBe(false);
		expect(isValidChapters({}, 60_000)).toBe(false);
		expect(isValidChapters(null, 60_000)).toBe(false);
	});

	it("rejects a chapter whose atMs is out of the recording's duration", () => {
		expect(isValidChapters({ chapters: [{ atMs: 999_999, title: "Late" }] }, 60_000)).toBe(false);
	});

	it("rejects a chapter with a non-numeric or negative atMs", () => {
		expect(isValidChapters({ chapters: [{ atMs: "0", title: "x" }] }, 60_000)).toBe(false);
		expect(isValidChapters({ chapters: [{ atMs: -1, title: "x" }] }, 60_000)).toBe(false);
		expect(isValidChapters({ chapters: [{ atMs: Number.NaN, title: "x" }] }, 60_000)).toBe(false);
	});

	it("rejects a chapter with an empty or oversized title", () => {
		expect(isValidChapters({ chapters: [{ atMs: 0, title: "" }] }, 60_000)).toBe(false);
		expect(isValidChapters({ chapters: [{ atMs: 0, title: "x".repeat(81) }] }, 60_000)).toBe(
			false,
		);
	});
});

describe("generateChaptersWithAi", () => {
	it("uses the model's chapters when it succeeds, sorted and tagged tier-2", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				chapters: [
					{ atMs: 5000, title: "Second" },
					{ atMs: 0, title: "First" },
				],
			},
		});

		const outcome = await generateChaptersWithAi([cue({ text: "some real speech here" })], 60_000);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-2-multimodal-local");
		expect(outcome.result.data.map((c) => c.title)).toEqual(["First", "Second"]);
	});

	it("clamps a model-reported atMs beyond the recording's duration rather than rejecting it outright", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: { chapters: [{ atMs: 500, title: "Ok" }] },
		});
		const outcome = await generateChaptersWithAi([cue({ text: "speech" })], 1000);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data[0].atMs).toBeLessThanOrEqual(1000);
	});

	it("falls back to the deterministic heuristic when the model call fails", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: false,
			reason: "Local AI model is not downloaded or unavailable.",
		});

		const outcome = await generateChaptersWithAi(
			[cue({ startMs: 0, endMs: 1000, text: "Welcome to the demo today" })],
			60_000,
		);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-0-heuristic");
	});

	it("falls back to the heuristic without even calling the model when there's no transcript text", async () => {
		const outcome = await generateChaptersWithAi([], 60_000);
		expect(outcome.status).toBe("unavailable");
		expect(promptLocalModelForJson).not.toHaveBeenCalled();
	});
});
