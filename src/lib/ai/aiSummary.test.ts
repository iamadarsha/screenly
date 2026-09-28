import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptionCue } from "@/components/video-editor/types";
import { generateSummaryWithAi, isValidSummary } from "./aiSummary";
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

describe("isValidSummary", () => {
	it("accepts a well-formed summary", () => {
		expect(isValidSummary({ summary: "This video shows how to use the app." })).toBe(true);
	});

	it("rejects missing, empty, non-string, or oversized summaries", () => {
		expect(isValidSummary({})).toBe(false);
		expect(isValidSummary({ summary: "" })).toBe(false);
		expect(isValidSummary({ summary: 5 })).toBe(false);
		expect(isValidSummary({ summary: "x".repeat(1001) })).toBe(false);
	});
});

describe("generateSummaryWithAi", () => {
	it("uses the model's summary when it succeeds", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: { summary: "A short summary of the demo." },
		});
		const outcome = await generateSummaryWithAi([cue({ text: "some real speech" })]);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-2-multimodal-local");
	});

	it("reports unavailable (never a fake summary) when the model call fails", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: false,
			reason: "Local AI model is not downloaded or unavailable.",
		});
		const outcome = await generateSummaryWithAi([cue({ text: "some real speech" })]);
		expect(outcome.status).toBe("unavailable");
	});

	it("reports unavailable without even calling the model when there's no transcript", async () => {
		const outcome = await generateSummaryWithAi([]);
		expect(outcome.status).toBe("unavailable");
		expect(promptLocalModelForJson).not.toHaveBeenCalled();
	});
});
