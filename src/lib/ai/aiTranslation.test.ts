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

function cues(): CaptionCue[] {
	return [
		{ id: "a", startMs: 0, endMs: 1000, text: "hello there" },
		{ id: "b", startMs: 1000, endMs: 2000, text: "good morning" },
		{ id: "c", startMs: 2000, endMs: 3000, text: "see you soon" },
		{ id: "d", startMs: 3000, endMs: 4000, text: "thank you" },
		{ id: "e", startMs: 4000, endMs: 5000, text: "goodbye" },
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

	it("keeps translated text for real cue ids and ignores hallucinated ids", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "a", text: "hola" },
					{ id: "b", text: "buenos dias" },
					{ id: "c", text: "hasta pronto" },
					{ id: "d", text: "gracias" },
					{ id: "e", text: "adios" },
					{ id: "zzz", text: "invented cue" },
				],
			},
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		const ids = outcome.result.data.translatedCues.map((c) => c.id);
		expect(ids).toEqual(["a", "b", "c", "d", "e"]);
		expect(outcome.result.data.translatedCues[0]?.text).toBe("hola");
	});

	it("keeps original text for cues the model skipped when coverage is sufficient", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "a", text: "hola" },
					{ id: "b", text: "buenos dias" },
					{ id: "c", text: "hasta pronto" },
					{ id: "d", text: "gracias" },
				],
			},
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("ok");
		if (outcome.status !== "ok") return;
		expect(outcome.result.data.translatedCues[4]).toEqual({ id: "e", text: "goodbye" });
	});

	it("rejects a translation that covers too few cues", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: { translations: [{ id: "a", text: "hola" }, { id: "nope", text: "x" }] },
		});
		const outcome = await translateCaptionsWithAi(cues(), "es");
		expect(outcome.status).toBe("unavailable");
	});

	it("drops empty or absurdly long translations", async () => {
		vi.mocked(promptLocalModelForJson).mockResolvedValue({
			ok: true,
			data: {
				translations: [
					{ id: "a", text: "   " },
					{ id: "b", text: "x".repeat(5000) },
					{ id: "c", text: "hasta pronto" },
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
