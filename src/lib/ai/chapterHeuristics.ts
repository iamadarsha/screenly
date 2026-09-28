import type { CaptionCue } from "@/components/video-editor/types";
import type { ReasoningOutcome } from "./reasoningOutcome";

export interface ChapterMarker {
	id: string;
	atMs: number;
	title: string;
}

/** A pause at least this long between two cues reads as a likely topic change. */
const MIN_GAP_MS_FOR_NEW_CHAPTER = 4000;
/** Never propose two chapters closer together than this, even if gaps qualify. */
const MIN_CHAPTER_SPACING_MS = 15_000;
const MAX_TITLE_WORDS = 6;
const MAX_TITLE_LENGTH = 40;

function deriveChapterTitle(text: string): string {
	const words = text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TITLE_WORDS);
	const title = words.join(" ");
	if (title.length <= MAX_TITLE_LENGTH) return title || "Untitled section";
	return `${title.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`;
}

/**
 * Tier-0 (no model) chapter generation: derives chapter boundaries purely
 * from long pauses between caption cues, titling each chapter from the
 * first few words spoken after the pause. This is a real, usable "chapters"
 * feature on its own — not a stand-in waiting for a model — reported at a
 * deliberately modest confidence since it's a pause-based proxy for topic
 * change, not actual semantic understanding of the content.
 */
export function generateChaptersFromCaptions(
	cues: CaptionCue[],
	totalMs: number,
): ReasoningOutcome<ChapterMarker[]> {
	if (cues.length === 0) {
		return { status: "unavailable", reason: "No captions available to derive chapters from." };
	}

	const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);
	const chapters: ChapterMarker[] = [
		{ id: "chapter-1", atMs: 0, title: deriveChapterTitle(sorted[0].text) },
	];
	let lastChapterMs = 0;

	for (let index = 1; index < sorted.length; index += 1) {
		const gap = sorted[index].startMs - sorted[index - 1].endMs;
		const farEnoughFromLastChapter = sorted[index].startMs - lastChapterMs >= MIN_CHAPTER_SPACING_MS;

		if (gap >= MIN_GAP_MS_FOR_NEW_CHAPTER && farEnoughFromLastChapter) {
			chapters.push({
				id: `chapter-${chapters.length + 1}`,
				atMs: sorted[index].startMs,
				title: deriveChapterTitle(sorted[index].text),
			});
			lastChapterMs = sorted[index].startMs;
		}
	}

	if (Number.isFinite(totalMs) && totalMs > 0) {
		for (const chapter of chapters) {
			chapter.atMs = Math.min(chapter.atMs, totalMs);
		}
	}

	return {
		status: "ok",
		result: { tier: "tier-0-heuristic", confidence: 0.5, data: chapters },
	};
}
