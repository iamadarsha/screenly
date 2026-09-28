import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptionCue } from "@/components/video-editor/types";
import { generateTitleWithAi, isValidTitle } from "./aiTitle";
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

describe("isValidTitle", () => {
	it("accepts a well-formed title", () => {
		expect(isValidTitle({ title: "A great title" })).toBe(true);
	});

	it("rejects missing, empty, non-string, or oversized titles", () => {
		expect(isValidTitle({})).toBe(false);
		expect(isValidTitle({ title: "" })).toBe(false);
		expect(isValidTitle({ title: "   " })).toBe(false);
		expect(isValidTitle({ title: 5 })).toBe(false);
		expect(isValidTitle({ title: "x".repeat(101) })).toBe(false);
		expect(isValidTitle(null)).toBe(false);
	});
});

describe("generateTitleWithAi", () => {
	it("uses the model's title when it succeeds", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: { title: "How to Use This App" },
		});
		const outcome = await generateTitleWithAi([cue({ text: "some real speech" })]);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-2-multimodal-local");
		expect(outcome.result.data.title).toBe("How to Use This App");
	});

	it("falls back to a deterministic proxy title from the opening words when the model fails", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({ ok: false, reason: "unavailable" });
		const outcome = await generateTitleWithAi([
			cue({ startMs: 0, endMs: 1000, text: "Welcome to this demo of the app" }),
		]);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-0-heuristic");
		expect(outcome.result.data.title).toBe("Welcome to this demo of the app");
	});

	it("reports unavailable when there are no cues at all", async () => {
		const outcome = await generateTitleWithAi([]);
		expect(outcome.status).toBe("unavailable");
	});
});
