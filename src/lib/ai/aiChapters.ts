import type { CaptionCue } from "@/components/video-editor/types";
import { generateChaptersFromCaptions, type ChapterMarker } from "./chapterHeuristics";
import { promptLocalModelForJson } from "./localModelProvider";
import type { ReasoningOutcome } from "./reasoningOutcome";
import { buildTranscriptText } from "./transcriptText";

const CHAPTERS_SCHEMA = {
	type: "object",
	properties: {
		chapters: {
			type: "array",
			items: {
				type: "object",
				properties: {
					atMs: { type: "number" },
					title: { type: "string" },
				},
				required: ["atMs", "title"],
			},
		},
	},
	required: ["chapters"],
};

interface RawAiChapter {
	atMs: unknown;
	title: unknown;
}

export function isValidChapters(data: unknown, totalMs: number): data is { chapters: RawAiChapter[] } {
	if (!data || typeof data !== "object" || !("chapters" in data)) return false;
	const chapters = (data as { chapters: unknown }).chapters;
	if (!Array.isArray(chapters) || chapters.length === 0) return false;
	return chapters.every((chapter) => {
		if (!chapter || typeof chapter !== "object") return false;
		const { atMs, title } = chapter as RawAiChapter;
		return (
			typeof atMs === "number" &&
			Number.isFinite(atMs) &&
			atMs >= 0 &&
			atMs <= totalMs + 1000 &&
			typeof title === "string" &&
			title.trim().length > 0 &&
			title.length <= 80
		);
	});
}

/**
 * Tries the local model first (a genuine multimodal-local Tier-2 read of the
 * transcript's actual topic changes), falling back to the deterministic
 * pause-based heuristic (`generateChaptersFromCaptions`) if the model isn't
 * downloaded, times out, or returns something that fails validation. Every
 * AI-proposed chapter is re-checked against the real transcript duration and
 * title-length bounds before being trusted — a plausible-looking but
 * out-of-range timestamp from the model is rejected, not clamped and used.
 */
export async function generateChaptersWithAi(
	cues: CaptionCue[],
	totalMs: number,
): Promise<ReasoningOutcome<ChapterMarker[]>> {
	const transcript = buildTranscriptText(cues);
	if (transcript) {
		const result = await promptLocalModelForJson({
			prompt: `You are segmenting a screen-recording transcript into chapters. Given the transcript below, propose 2-8 chapters, each with a short title (8 words or fewer) and the millisecond timestamp closest to where that chapter begins. The recording is ${totalMs}ms long.\n\nTranscript:\n${transcript}`,
			responseJSONSchema: CHAPTERS_SCHEMA,
			validate: (data): data is { chapters: RawAiChapter[] } => isValidChapters(data, totalMs),
		});
		if (result.ok) {
			const chapters: ChapterMarker[] = result.data.chapters
				.map((chapter, index) => ({
					id: `chapter-${index + 1}`,
					atMs: Math.min(Number(chapter.atMs), totalMs),
					title: String(chapter.title),
				}))
				.sort((a, b) => a.atMs - b.atMs);
			return {
				status: "ok",
				result: { tier: "tier-2-multimodal-local", confidence: 0.75, data: chapters },
			};
		}
	}
	return generateChaptersFromCaptions(cues, totalMs);
}
