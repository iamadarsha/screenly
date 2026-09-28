import type { CaptionEditTarget } from "./captionEditing";
import { captionWordsToText, normalizeCaptionWords } from "./captionEditing";
import { sortCaptionCues } from "./captionOps";
import { planTimeRangeDeletion } from "./clipSequence";
import { rippleRegions } from "./clipSequence";
import type {
	AnnotationRegion,
	AudioRegion,
	CaptionCue,
	ClipRegion,
	ZoomRegion,
} from "./types";

export interface TranscriptWordDeletionPlan {
	/** Captions with the selected words removed; a cue emptied entirely by the selection is dropped. */
	cues: CaptionCue[];
	/** The union time span the selected words covered — what gets cut from the timeline. */
	cutStartMs: number;
	cutEndMs: number;
}

/**
 * Plans removing a word-range selection (as produced by the existing
 * on-video caption editor's `CaptionEditTarget`) from the transcript. A cue
 * that loses some but not all of its words is kept, shrunk to the span of
 * its remaining words. A cue that loses every word is dropped outright.
 * Pure and read-only w.r.t. the input — does not touch the timeline; pair
 * with `planTimeRangeDeletion` + `rippleRegions` (see `deleteTranscriptWordRange`)
 * to also cut the corresponding time range and ripple everything else.
 */
export function planTranscriptWordDeletion(
	cues: CaptionCue[],
	target: CaptionEditTarget,
): TranscriptWordDeletionPlan | null {
	if (target.words.length === 0) {
		return null;
	}

	const cutStartMs = Math.min(...target.words.map((word) => word.startMs));
	const cutEndMs = Math.max(...target.words.map((word) => word.endMs));
	if (!Number.isFinite(cutStartMs) || !Number.isFinite(cutEndMs) || cutEndMs <= cutStartMs) {
		return null;
	}

	const removedIndexesByCue = new Map<string, Set<number>>();
	for (const word of target.words) {
		const indexes = removedIndexesByCue.get(word.cueId) ?? new Set<number>();
		indexes.add(word.cueWordIndex);
		removedIndexesByCue.set(word.cueId, indexes);
	}

	const nextCues: CaptionCue[] = [];
	for (const cue of cues) {
		const removedIndexes = removedIndexesByCue.get(cue.id);
		if (!removedIndexes) {
			nextCues.push(cue);
			continue;
		}

		const existingWords = normalizeCaptionWords(cue);
		const keptWords = existingWords.filter((_, index) => !removedIndexes.has(index));
		if (keptWords.length === 0) {
			continue;
		}

		const shouldKeepWords = Array.isArray(cue.words) && cue.words.length > 0;
		nextCues.push({
			id: cue.id,
			startMs: keptWords[0].startMs,
			endMs: keptWords[keptWords.length - 1].endMs,
			text: captionWordsToText(keptWords),
			...(shouldKeepWords ? { words: keptWords } : {}),
		});
	}

	return { cues: sortCaptionCues(nextCues), cutStartMs, cutEndMs };
}

export interface TranscriptWordDeletionResult {
	autoCaptions: CaptionCue[];
	clipRegions: ClipRegion[];
	zoomRegions: ZoomRegion[];
	annotationRegions: AnnotationRegion[];
	audioRegions: AudioRegion[];
}

/**
 * The full "delete-to-cut": removes the selected transcript words, cuts the
 * exact time range they covered out of the clip sequence, and ripples every
 * other region type (remaining captions, zoom, annotations, audio) through
 * the same edit so nothing drifts out of sync. Returns `null` if the
 * selection or the resulting cut is degenerate (nothing to do).
 *
 * Callers should apply the four returned arrays via their state setters in
 * the same event handler/render — `autoCaptions` and `clipRegions` (and the
 * rest) are watched by the same whole-project history snapshot, so doing so
 * produces exactly one undo step for the whole action.
 */
export function deleteTranscriptWordRange(params: {
	target: CaptionEditTarget;
	autoCaptions: CaptionCue[];
	clipRegions: ClipRegion[];
	zoomRegions: ZoomRegion[];
	annotationRegions: AnnotationRegion[];
	audioRegions: AudioRegion[];
	createClipId: () => string;
}): TranscriptWordDeletionResult | null {
	const captionPlan = planTranscriptWordDeletion(params.autoCaptions, params.target);
	if (!captionPlan) {
		return null;
	}

	const clipPlan = planTimeRangeDeletion({
		clipRegions: params.clipRegions,
		startMs: captionPlan.cutStartMs,
		endMs: captionPlan.cutEndMs,
		createId: params.createClipId,
	});
	if (!clipPlan) {
		return null;
	}

	const { splitClips, nextClips } = clipPlan;
	return {
		clipRegions: nextClips,
		autoCaptions: rippleRegions(captionPlan.cues, splitClips, nextClips),
		zoomRegions: rippleRegions(params.zoomRegions, splitClips, nextClips),
		annotationRegions: rippleRegions(params.annotationRegions, splitClips, nextClips),
		audioRegions: rippleRegions(params.audioRegions, splitClips, nextClips),
	};
}

export interface FillerWordMatch {
	cueId: string;
	cueWordIndex: number;
	text: string;
	startMs: number;
	endMs: number;
}

/**
 * Deliberately restricted to words that are almost never anything else —
 * "so"/"like"/"actually" etc. are common real words too often to flag
 * without real language understanding, which this (Tier-0, no model)
 * detector doesn't have. Better to under-flag than to produce noisy,
 * not-actually-filler suggestions.
 */
export const DEFAULT_FILLER_WORDS = ["um", "umm", "uh", "uhh", "erm", "hmm", "huh"];

function normalizeWordForMatch(text: string): string {
	return text.toLowerCase().replace(/[^\p{L}']+/gu, "");
}

export function detectFillerWords(
	cues: CaptionCue[],
	fillerWords: string[] = DEFAULT_FILLER_WORDS,
): FillerWordMatch[] {
	const fillerSet = new Set(fillerWords.map((word) => word.toLowerCase()));
	const matches: FillerWordMatch[] = [];

	for (const cue of sortCaptionCues(cues)) {
		const words = normalizeCaptionWords(cue);
		words.forEach((word, index) => {
			if (fillerSet.has(normalizeWordForMatch(word.text))) {
				matches.push({
					cueId: cue.id,
					cueWordIndex: index,
					text: word.text,
					startMs: word.startMs,
					endMs: word.endMs,
				});
			}
		});
	}

	return matches;
}

export interface RepeatedPhraseMatch {
	cueId: string;
	/** Word indexes (into that cue's `normalizeCaptionWords` output) of the first, stuttered attempt. */
	firstStartIndex: number;
	firstEndIndexExclusive: number;
	/** Word indexes of the immediately-following repeat. */
	secondStartIndex: number;
	secondEndIndexExclusive: number;
	phrase: string;
}

const MIN_REPEATED_PHRASE_WORDS = 2;
const MAX_REPEATED_PHRASE_WORDS = 6;

/**
 * Detects immediate word-sequence repeats within a single cue (a false
 * start/stutter: "I want to- I want to show you"). Deliberately
 * within-cue-only — cues are already phrase/sentence length, so a real
 * repeat almost always lands inside one; catching one that straddles a cue
 * boundary would need cross-cue word indexing this pass doesn't build.
 * Longer phrase matches are preferred over shorter ones they contain (scans
 * longest-first and skips past anything already matched).
 */
export function detectRepeatedPhrases(cues: CaptionCue[]): RepeatedPhraseMatch[] {
	const matches: RepeatedPhraseMatch[] = [];

	for (const cue of sortCaptionCues(cues)) {
		const words = normalizeCaptionWords(cue);
		const normalized = words.map((word) => normalizeWordForMatch(word.text));
		const claimed = new Array(normalized.length).fill(false);
		const cueMatches: RepeatedPhraseMatch[] = [];

		for (let n = MAX_REPEATED_PHRASE_WORDS; n >= MIN_REPEATED_PHRASE_WORDS; n -= 1) {
			let index = 0;
			while (index + 2 * n <= normalized.length) {
				const alreadyClaimed = claimed.slice(index, index + 2 * n).some(Boolean);
				if (alreadyClaimed) {
					index += 1;
					continue;
				}

				const first = normalized.slice(index, index + n).join(" ");
				const second = normalized.slice(index + n, index + 2 * n).join(" ");
				if (first.length > 0 && first === second) {
					cueMatches.push({
						cueId: cue.id,
						firstStartIndex: index,
						firstEndIndexExclusive: index + n,
						secondStartIndex: index + n,
						secondEndIndexExclusive: index + 2 * n,
						phrase: words
							.slice(index, index + n)
							.map((word) => word.text)
							.join(" "),
					});
					for (let claim = index; claim < index + 2 * n; claim += 1) {
						claimed[claim] = true;
					}
					index += 2 * n;
				} else {
					index += 1;
				}
			}
		}

		cueMatches.sort((a, b) => a.firstStartIndex - b.firstStartIndex);
		matches.push(...cueMatches);
	}

	return matches;
}

export interface SilenceRemovalResult {
	clipRegions: ClipRegion[];
	autoCaptions: CaptionCue[];
	zoomRegions: ZoomRegion[];
	annotationRegions: AnnotationRegion[];
	audioRegions: AudioRegion[];
	removedCount: number;
}

export function planSilenceRemoval(params: {
	intervals: Array<{ startMs: number; endMs: number }>;
	autoCaptions: CaptionCue[];
	clipRegions: ClipRegion[];
	zoomRegions: ZoomRegion[];
	annotationRegions: AnnotationRegion[];
	audioRegions: AudioRegion[];
	createClipId: () => string;
}): SilenceRemovalResult | null {
	const sorted = [...params.intervals]
		.filter((i) => Number.isFinite(i.endMs) && i.endMs > i.startMs)
		.sort((a, b) => b.startMs - a.startMs); // reverse order so offsets don't shift

	if (sorted.length === 0) return null;

	let clips = [...params.clipRegions];
	let captions = [...params.autoCaptions];
	let zooms = [...params.zoomRegions];
	let annotations = [...params.annotationRegions];
	let audio = [...params.audioRegions];
	let removedCount = 0;

	for (const interval of sorted) {
		const clipPlan = planTimeRangeDeletion({
			clipRegions: clips,
			startMs: interval.startMs,
			endMs: interval.endMs,
			createId: params.createClipId,
		});
		if (!clipPlan) continue;

		const { splitClips, nextClips } = clipPlan;
		clips = nextClips;
		captions = rippleRegions(captions, splitClips, nextClips);
		zooms = rippleRegions(zooms, splitClips, nextClips);
		annotations = rippleRegions(annotations, splitClips, nextClips);
		audio = rippleRegions(audio, splitClips, nextClips);
		removedCount++;
	}

	if (removedCount === 0) return null;

	return {
		clipRegions: clips,
		autoCaptions: captions,
		zoomRegions: zooms,
		annotationRegions: annotations,
		audioRegions: audio,
		removedCount,
	};
}
