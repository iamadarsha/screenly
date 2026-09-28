import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptionCue } from "@/components/video-editor/types";
import { generatePublishingPackWithAi, sanitizeTags } from "./aiPublishingPack";
import { promptLocalModelForJson } from "./localModelProvider";

vi.mock("./localModelProvider", () => ({
	promptLocalModelForJson: vi.fn(),
}));

beforeEach(() => {
	vi.mocked(promptLocalModelForJson).mockReset();
});

const cues: CaptionCue[] = [
	{ id: "1", startMs: 0, endMs: 3000, text: "Today we build a dashboard with charts" },
	{ id: "2", startMs: 9000, endMs: 12000, text: "The dashboard charts update every second" },
];

describe("sanitizeTags", () => {
	it("lowercases, strips hashes and punctuation, dedupes and caps at 8", () => {
		const tags = sanitizeTags(["#Dashboard", "dashboard", "Charts!", 5, "", "a", ...Array.from({ length: 20 }, (_, i) => `tag${i}`)]);
		expect(tags.slice(0, 2)).toEqual(["dashboard", "charts"]);
		expect(tags.length).toBe(8);
	});
});

describe("generatePublishingPackWithAi", () => {
	it("without the model returns title proxy, tags and chapters but no fake summary or social copy", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({ ok: false, reason: "no model" });
		const outcome = await generatePublishingPackWithAi(cues);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-0-heuristic");
		expect(outcome.result.data.summary).toBe("");
		expect(outcome.result.data.socialCopy).toEqual({ twitter: "", linkedin: "" });
		expect(outcome.result.data.tags).toContain("dashboard");
	});

	it("uses and sanitizes model output when available", async () => {
		// First call is the chapters request (falls back to heuristics), second is the pack.
		vi.mocked(promptLocalModelForJson).mockResolvedValueOnce({ ok: false, reason: "chapters skipped" });
		vi.mocked(promptLocalModelForJson).mockResolvedValueOnce({
			ok: true,
			data: {
				title: "Building a live dashboard",
				summary: "A walkthrough.",
				tags: ["#Dashboard", "Charts"],
				twitter: "x".repeat(400),
				linkedin: "Post body",
			},
		});
		const outcome = await generatePublishingPackWithAi(cues);
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.tier).toBe("tier-2-multimodal-local");
		expect(outcome.result.data.tags).toEqual(["dashboard", "charts"]);
		expect(outcome.result.data.socialCopy.twitter.length).toBe(280);
	});

	it("is unavailable for an empty transcript", async () => {
		const outcome = await generatePublishingPackWithAi([]);
		expect(outcome.status).toBe("unavailable");
	});
});
