import type { CaptionCue, CaptionCueWord } from "./types";

export type CaptionValidationIssueCode =
	| "cue-invalid-duration"
	| "cue-out-of-bounds"
	| "cues-overlap"
	| "word-invalid-duration"
	| "words-overlap"
	| "word-out-of-cue-bounds";

export interface CaptionValidationIssue {
	code: CaptionValidationIssueCode;
	cueId: string;
	message: string;
}

const BOUNDS_TOLERANCE_MS = 250;

function sortedByStart(cues: CaptionCue[]): CaptionCue[] {
	return [...cues].sort((a, b) => a.startMs - b.startMs);
}

function validateWords(cue: CaptionCue, words: CaptionCueWord[]): CaptionValidationIssue[] {
	const issues: CaptionValidationIssue[] = [];
	let previousEndMs: number | null = null;

	for (const word of words) {
		if (!Number.isFinite(word.startMs) || !Number.isFinite(word.endMs) || word.endMs <= word.startMs) {
			issues.push({
				code: "word-invalid-duration",
				cueId: cue.id,
				message: `Word "${word.text}" has an invalid duration.`,
			});
			continue;
		}

		if (
			word.startMs < cue.startMs - BOUNDS_TOLERANCE_MS ||
			word.endMs > cue.endMs + BOUNDS_TOLERANCE_MS
		) {
			issues.push({
				code: "word-out-of-cue-bounds",
				cueId: cue.id,
				message: `Word "${word.text}" falls outside its cue's time range.`,
			});
		}

		if (previousEndMs !== null && word.startMs < previousEndMs) {
			issues.push({
				code: "words-overlap",
				cueId: cue.id,
				message: `Word "${word.text}" overlaps the previous word in this cue.`,
			});
		}
		previousEndMs = word.endMs;
	}

	return issues;
}

/**
 * Read-only check of caption cue/word timing invariants: cue durations are
 * positive, cues stay within the video's duration, adjacent cues don't
 * overlap, and (when present) per-word timings are monotonic, positive, and
 * stay within their parent cue's span. Reports every issue found — it does
 * not mutate or drop anything; pair with `sanitizeCaptionCues` to fix them up.
 */
export function validateCaptionCues(
	cues: CaptionCue[],
	videoDurationMs: number,
): CaptionValidationIssue[] {
	const issues: CaptionValidationIssue[] = [];
	const sorted = sortedByStart(cues);

	for (let index = 0; index < sorted.length; index += 1) {
		const cue = sorted[index];

		if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs) || cue.endMs <= cue.startMs) {
			issues.push({
				code: "cue-invalid-duration",
				cueId: cue.id,
				message: "Cue has an invalid duration (end time is not after start time).",
			});
			continue;
		}

		if (
			Number.isFinite(videoDurationMs) &&
			videoDurationMs > 0 &&
			(cue.startMs < -BOUNDS_TOLERANCE_MS || cue.endMs > videoDurationMs + BOUNDS_TOLERANCE_MS)
		) {
			issues.push({
				code: "cue-out-of-bounds",
				cueId: cue.id,
				message: "Cue extends outside the video's duration.",
			});
		}

		const previous = index > 0 ? sorted[index - 1] : null;
		if (previous && cue.startMs < previous.endMs) {
			issues.push({
				code: "cues-overlap",
				cueId: cue.id,
				message: "Cue overlaps the previous cue.",
			});
		}

		if (Array.isArray(cue.words) && cue.words.length > 0) {
			issues.push(...validateWords(cue, cue.words));
		}
	}

	return issues;
}

/**
 * Defensive cleanup for cue/word data from any source (ASR output, imported
 * SRT/VTT, manual edits): drops cues with a non-positive duration outright,
 * and clamps cue and word bounds into `[0, videoDurationMs]` rather than
 * discarding an otherwise-usable cue over a small out-of-range timestamp.
 * Never resolves overlaps — deciding how to shrink/reorder overlapping
 * cues is a product/editing decision, not a safety one, so overlaps are left
 * for `validateCaptionCues` to report and a human (or a future feature) to
 * resolve deliberately.
 */
export function sanitizeCaptionCues(cues: CaptionCue[], videoDurationMs: number): CaptionCue[] {
	const hasBounds = Number.isFinite(videoDurationMs) && videoDurationMs > 0;
	const maxMs = hasBounds ? videoDurationMs : Number.POSITIVE_INFINITY;

	const sanitized: CaptionCue[] = [];
	for (const cue of sortedByStart(cues)) {
		if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs) || cue.endMs <= cue.startMs) {
			continue;
		}

		const startMs = Math.max(0, Math.min(cue.startMs, maxMs));
		const endMs = Math.max(startMs + 1, Math.min(cue.endMs, maxMs));

		const words =
			Array.isArray(cue.words) && cue.words.length > 0
				? cue.words
						.filter(
							(word) =>
								Number.isFinite(word.startMs) &&
								Number.isFinite(word.endMs) &&
								word.endMs > word.startMs,
						)
						.map((word) => ({
							...word,
							startMs: Math.max(startMs, Math.min(word.startMs, maxMs)),
							endMs: Math.max(startMs + 1, Math.min(word.endMs, maxMs)),
						}))
				: undefined;

		sanitized.push({
			...cue,
			startMs,
			endMs,
			...(words && words.length > 0 ? { words } : {}),
		});
	}

	return sanitized;
}
