/**
 * Minimal shared vocabulary for Phase 4C's local-reasoning fallback hierarchy
 * (PRD: model installed → local model; model unavailable → deterministic
 * heuristic; heuristic unavailable → disable only that enhancement). Kept
 * intentionally small — a full provider/class abstraction would be
 * speculative until there's a second real tier to abstract over. Every AI
 * feature built on top of this reports which tier actually answered, so the
 * UI can be honest about it (same spirit as the export pipeline always
 * reporting its actual route, and presentation suggestions always reporting
 * their real confidence).
 */
export type ReasoningTier =
	| "tier-0-heuristic"
	| "tier-1-small-local"
	| "tier-2-multimodal-local"
	| "apple-native";

export interface ReasoningResult<T> {
	tier: ReasoningTier;
	/** 0–1. Never fabricated — a heuristic reports its real, usually modest, confidence. */
	confidence: number;
	data: T;
}

export type ReasoningOutcome<T> =
	| { status: "ok"; result: ReasoningResult<T> }
	| { status: "unavailable"; reason: string };
