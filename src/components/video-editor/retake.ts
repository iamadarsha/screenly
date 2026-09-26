import type { ClipRegion, ClipTake } from "./types";

function safeSpeed(clip: ClipRegion): number {
	return Number.isFinite(clip.speed) && clip.speed > 0 ? clip.speed : 1;
}

function snapshotCurrentTake(clip: ClipRegion): ClipTake {
	return {
		sourceStartMs: clip.sourceStartMs ?? clip.startMs,
		sourceMinMs: clip.sourceMinMs,
		sourceMaxMs: clip.sourceMaxMs,
		timelineDurationMs: clip.endMs - clip.startMs,
		recordedAt: Date.now(),
	};
}

/**
 * Replace a clip's footage with a newly recorded take, without moving where the
 * clip sits on the timeline. The clip's existing speed is preserved, so its
 * timeline duration adjusts to match the new take's real duration at that
 * speed. The take being replaced is pushed onto `previousTakes` rather than
 * discarded, so "Switch Take" can always bring it back.
 */
export function applyRetakeToClip(
	clip: ClipRegion,
	newTake: { sourceStartMs: number; sourceMinMs?: number; sourceMaxMs?: number; durationMs: number },
): ClipRegion {
	const speed = safeSpeed(clip);
	return {
		...clip,
		endMs: clip.startMs + Math.round(newTake.durationMs / speed),
		sourceStartMs: newTake.sourceStartMs,
		sourceMinMs: newTake.sourceMinMs,
		sourceMaxMs: newTake.sourceMaxMs,
		previousTakes: [...(clip.previousTakes ?? []), snapshotCurrentTake(clip)],
	};
}

/**
 * Swap a clip back to its most recently replaced take. Returns null when there
 * is nothing to swap back to (caller should treat this as a no-op). The
 * restored take's `timelineDurationMs` was recorded at whatever speed was in
 * effect when it was replaced, so it's applied directly with no rescaling.
 */
export function swapToPreviousTake(clip: ClipRegion): ClipRegion | null {
	const stack = clip.previousTakes;
	if (!stack || stack.length === 0) return null;

	const restored = stack[stack.length - 1];
	return {
		...clip,
		endMs: clip.startMs + Math.round(restored.timelineDurationMs),
		sourceStartMs: restored.sourceStartMs,
		sourceMinMs: restored.sourceMinMs,
		sourceMaxMs: restored.sourceMaxMs,
		previousTakes: [...stack.slice(0, -1), snapshotCurrentTake(clip)],
	};
}
