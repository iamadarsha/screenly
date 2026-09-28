import { useCallback, useMemo, useState } from "react";
import type { CursorTelemetryPoint, ZoomFocus } from "../types";
import {
	buildPresentationSuggestions,
	type PresentationSuggestion,
	type PresentationSuggestionStatus,
} from "./presentationSuggestions";
import {
	countPendingApplicable,
	getAcceptableSuggestion,
	getAllPendingApplicable,
	getPreviewTarget,
	markAllPendingApplicableAccepted,
	markAllPendingRejected,
	markSuggestionStatus,
	type SuggestionReviewItem,
	toReviewItems,
} from "./presentationSuggestionsReviewState";

export type { SuggestionReviewItem } from "./presentationSuggestionsReviewState";
export { canApplySuggestionKind } from "./presentationSuggestionsReviewState";

export function usePresentationSuggestionsReview(params: {
	cursorTelemetry: CursorTelemetryPoint[];
	totalMs: number;
	reservedZoomSpans: Array<{ start: number; end: number }>;
	onAcceptZoom: (span: { start: number; end: number }, focus: ZoomFocus) => void;
	onPreview: (startMs: number) => void;
}) {
	const { onAcceptZoom, onPreview } = params;
	const [isOpen, setIsOpen] = useState(false);
	const [items, setItems] = useState<SuggestionReviewItem[]>([]);
	const [generationStatus, setGenerationStatus] =
		useState<PresentationSuggestionStatus | "idle">("idle");

	const generate = useCallback(() => {
		const result = buildPresentationSuggestions({
			cursorTelemetry: params.cursorTelemetry,
			totalMs: params.totalMs,
			reservedSpans: params.reservedZoomSpans,
		});
		setGenerationStatus(result.status);
		setItems(toReviewItems(result.suggestions));
		setIsOpen(true);
	}, [params.cursorTelemetry, params.totalMs, params.reservedZoomSpans]);

	const applySuggestion = useCallback(
		(suggestion: PresentationSuggestion) => {
			if (suggestion.kind === "zoom" && suggestion.focus) {
				onAcceptZoom({ start: suggestion.startMs, end: suggestion.endMs }, suggestion.focus);
			}
		},
		[onAcceptZoom],
	);

	const acceptSuggestion = useCallback(
		(id: string) => {
			const target = getAcceptableSuggestion(items, id);
			if (!target) return;
			applySuggestion(target);
			setItems((current) => markSuggestionStatus(current, id, "accepted"));
		},
		[items, applySuggestion],
	);

	const rejectSuggestion = useCallback((id: string) => {
		setItems((current) => markSuggestionStatus(current, id, "rejected"));
	}, []);

	const acceptAllPending = useCallback(() => {
		const pendingApplicable = getAllPendingApplicable(items);
		if (pendingApplicable.length === 0) return;
		for (const item of pendingApplicable) {
			applySuggestion(item);
		}
		setItems((current) => markAllPendingApplicableAccepted(current));
	}, [items, applySuggestion]);

	const rejectAllPending = useCallback(() => {
		setItems((current) => markAllPendingRejected(current));
	}, []);

	const previewSuggestion = useCallback(
		(id: string) => {
			const target = getPreviewTarget(items, id);
			if (target) onPreview(target.startMs);
		},
		[items, onPreview],
	);

	const close = useCallback(() => setIsOpen(false), []);

	const pendingCount = useMemo(
		() => items.filter((item) => item.status === "pending").length,
		[items],
	);
	const applicablePendingCount = useMemo(() => countPendingApplicable(items), [items]);

	return {
		isOpen,
		items,
		generationStatus,
		pendingCount,
		applicablePendingCount,
		generate,
		acceptSuggestion,
		rejectSuggestion,
		acceptAllPending,
		rejectAllPending,
		previewSuggestion,
		close,
	};
}

export type PresentationSuggestionsReview = ReturnType<typeof usePresentationSuggestionsReview>;
