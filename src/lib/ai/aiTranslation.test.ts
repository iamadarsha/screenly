import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptionCue } from "@/components/video-editor/types";
import { isRtlLanguage, translateCaptionsWithAi } from "./aiTranslation";
import { promptLocalModelForJson } from "./localModelProvider";

vi.mock("./localModelProvider", () => ({
	promptLocalModelForJson: vi.fn(),
}));

beforeEach(() => {
	vi.mocked(promptLocalModelForJson).mockReset();
});

// Real cue ids are opaque generated strings; index into cues() to build the
// positional {id: "<index>"} responses the model is actually asked to produce.
function cues(): CaptionCue[] {
	return [
		{ id: "cue-a1b2", startMs: 0, endMs: 1000, text: "hello there" },
		{ id: "cue-c3d4", startMs: 1000, endMs: 2000, text: "good morning" },
		{ id: "cue-e5f6", startMs: 2000, endMs: 3000, text: "see you soon" },
		{ id: "cue-g7h8", startMs: 3000, endMs: 4000, text: "thank you" },
		{ id: "cue-i9j0", startMs: 4000, endMs: 5000, text: "goodbye" },
	];
}

describe("translateCaptionsWithAi", () => {
	it("reports unavailable (no fake dictionary translation) when the model is missing", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({ ok: false, reason: "not downloaded" });
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("unavailable");
	});

	it("reports unavailable for an empty transcript without calling the model", async () => {
		const outcome = await translateCaptionsWithAi([], "es");
		expect(outcome.status).toBe("unavailable");
		expect(promptLocalModelForJson).not.toHaveBeenCalled();
	});

	it("maps positional response indices back to the real (opaque) cue ids", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "0", text: "hola" },
					{ id: "1", text: "buenos dias" },
					{ id: "2", text: "hasta pronto" },
					{ id: "3", text: "gracias" },
					{ id: "4", text: "adios" },
				],
			},
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.translatedCues.map((c) => c.id)).toEqual([
			"cue-a1b2", "cue-c3d4", "cue-e5f6", "cue-g7h8", "cue-i9j0",
		]);
		expect(outcome.result.data.translatedCues[0]?.text).toBe("hola");
	});

	it("ignores out-of-range or non-numeric indices", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "0", text: "hola" },
					{ id: "1", text: "buenos dias" },
					{ id: "2", text: "hasta pronto" },
					{ id: "3", text: "gracias" },
					{ id: "99", text: "invented" },
					{ id: "not-a-number", text: "invented" },
				],
			},
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.translatedCues[4]).toEqual({ id: "cue-i9j0", text: "goodbye" });
	});

	it("keeps original text for cues the model skipped when coverage is sufficient", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "0", text: "hola" },
					{ id: "1", text: "buenos dias" },
					{ id: "2", text: "hasta pronto" },
					{ id: "3", text: "gracias" },
				],
			},
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.translatedCues[4]).toEqual({ id: "cue-i9j0", text: "goodbye" });
	});

	it("rejects a translation that covers too few cues", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: { translations: [{ id: "0", text: "hola" }] },
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("unavailable");
	});

	it("drops empty or absurdly long translations", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "0", text: "   " },
					{ id: "1", text: "x".repeat(5000) },
					{ id: "2", text: "hasta pronto" },
				],
			},
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("unavailable");
	});
});

describe("isRtlLanguage", () => {
	it("detects right-to-left languages", () => {
		expect(isRtlLanguage("ar")).toBe(true);
		expect(isRtlLanguage("he-IL")).toBe(true);
		expect(isRtlLanguage("es")).toBe(false);
	});
});
