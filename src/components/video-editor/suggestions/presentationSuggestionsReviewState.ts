import type { PresentationSuggestion, PresentationSuggestionKind } from "./presentationSuggestions";

export type SuggestionReviewStatus = "pending" | "accepted" | "rejected";

export interface SuggestionReviewItem extends PresentationSuggestion {
	status: SuggestionReviewStatus;
}

/**
 * Suggestion kinds this build can actually turn into a project edit. The
 * schema (`presentationSuggestions.ts`) covers all 10 PRD kinds, but only
 * "zoom" has a real overlay type to apply to today — there is no persisted
 * click-effect or chapter-marker region in this app yet. Kinds outside this
 * set can still be previewed and rejected, just not accepted, and the UI
 * says so rather than silently no-op'ing "Accept."
 */
const APPLICABLE_SUGGESTION_KINDS = new Set<PresentationSuggestionKind>(["zoom"]);

export function canApplySuggestionKind(kind: PresentationSuggestionKind): boolean {
	return APPLICABLE_SUGGESTION_KINDS.has(kind);
}

export function toReviewItems(suggestions: PresentationSuggestion[]): SuggestionReviewItem[] {
	return suggestions.map((suggestion) => ({ ...suggestion, status: "pending" }));
}

export function markSuggestionStatus(
	items: SuggestionReviewItem[],
	id: string,
	status: SuggestionReviewStatus,
): SuggestionReviewItem[] {
	return items.map((item) => (item.id === id ? { ...item, status } : item));
}

export function getAcceptableSuggestion(
	items: SuggestionReviewItem[],
	id: string,
): SuggestionReviewItem | undefined {
	return items.find(
		(item) => item.id === id && item.status === "pending" && canApplySuggestionKind(item.kind),
	);
}

export function getPreviewTarget(
	items: SuggestionReviewItem[],
	id: string,
): SuggestionReviewItem | undefined {
	return items.find((item) => item.id === id);
}

export function getAllPendingApplicable(items: SuggestionReviewItem[]): SuggestionReviewItem[] {
	return items.filter((item) => item.status === "pending" && canApplySuggestionKind(item.kind));
}

export function markAllPendingApplicableAccepted(
	items: SuggestionReviewItem[],
): SuggestionReviewItem[] {
	return items.map((item) =>
		item.status === "pending" && canApplySuggestionKind(item.kind)
			? { ...item, status: "accepted" }
			: item,
	);
}

export function markAllPendingRejected(items: SuggestionReviewItem[]): SuggestionReviewItem[] {
	return items.map((item) => (item.status === "pending" ? { ...item, status: "rejected" } : item));
}

export function countByStatus(
	items: SuggestionReviewItem[],
	status: SuggestionReviewStatus,
): number {
	return items.filter((item) => item.status === status).length;
}

export function countPendingApplicable(items: SuggestionReviewItem[]): number {
	return getAllPendingApplicable(items).length;
}
