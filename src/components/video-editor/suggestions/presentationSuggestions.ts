import type { CursorTelemetryPoint, ZoomFocus } from "../types";
import {
	buildInteractionZoomSuggestions,
	detectInteractionCandidates,
	normalizeCursorTelemetry,
} from "../timeline/zoomSuggestionUtils";

/**
 * The full set of suggestion kinds from PRD Feature 4 ("Smart Presentation
 * Director"). Only kinds backed by real, already-captured telemetry
 * (cursor position/clicks) are generated today — see `buildPresentationSuggestions`.
 * The rest of the union exists so the schema is ready for future generators
 * (e.g. keyboard-shortcut capture, scene-change detection) without another
 * breaking schema change — "AI-ready suggestion schema" per the PRD build list.
 */
export type PresentationSuggestionKind =
	| "zoom"
	| "camera-layout"
	| "cursor-emphasis"
	| "click-effect"
	| "shortcut-overlay"
	| "timeline-flag"
	| "emphasis-moment"
	| "chapter-marker"
	| "scene-transition"
	| "focus-region";

export interface PresentationSuggestion {
	id: string;
	kind: PresentationSuggestionKind;
	startMs: number;
	endMs: number;
	/** 0–1. Deterministic heuristics only ever report their real confidence — never fabricated. */
	confidence: number;
	/** Human-readable justification, always derived from the telemetry that produced it. */
	reason: string;
	focus?: ZoomFocus;
}

export type PresentationSuggestionStatus = "ok" | "no-telemetry" | "no-interactions";

export interface PresentationSuggestionResult {
	status: PresentationSuggestionStatus;
	suggestions: PresentationSuggestion[];
}

/** Confidence scales with cluster duration: brief taps read as confident clicks; long dwells more so. */
function zoomConfidence(durationMs: number): number {
	const clamped = Math.max(0, Math.min(durationMs, 4000));
	return Math.round((0.55 + (clamped / 4000) * 0.35) * 100) / 100;
}

function clickEffectConfidence(interactionType: CursorTelemetryPoint["interactionType"]): number {
	if (interactionType === "double-click") return 0.8;
	if (interactionType === "right-click" || interactionType === "middle-click") return 0.65;
	return 0.6;
}

/** Reuses the existing click-cluster zoom heuristic, presented as "zoom" suggestions. */
export function buildZoomPresentationSuggestions(params: {
	cursorTelemetry: CursorTelemetryPoint[];
	totalMs: number;
	reservedSpans?: Array<{ start: number; end: number }>;
}): PresentationSuggestion[] {
	const result = buildInteractionZoomSuggestions({
		cursorTelemetry: params.cursorTelemetry,
		totalMs: params.totalMs,
		defaultDurationMs: 3000,
		reservedSpans: params.reservedSpans,
	});
	if (result.status !== "ok") return [];

	return result.suggestions.map((suggestion, index) => {
		const durationMs = suggestion.end - suggestion.start;
		return {
			id: `zoom-${suggestion.start}-${index}`,
			kind: "zoom",
			startMs: suggestion.start,
			endMs: suggestion.end,
			confidence: zoomConfidence(durationMs),
			reason: "Clicks were clustered here — zooming in keeps the audience focused on them.",
			focus: suggestion.focus,
		};
	});
}

/**
 * Proposes a brief click-effect highlight at every explicit click/double-click
 * event that falls outside an already-suggested zoom region (a zoom already
 * draws the eye there, so a redundant click ring would be noise).
 */
export function buildClickEffectSuggestions(params: {
	cursorTelemetry: CursorTelemetryPoint[];
	totalMs: number;
	excludeSpans?: Array<{ start: number; end: number }>;
}): PresentationSuggestion[] {
	const { totalMs, excludeSpans = [] } = params;
	if (totalMs <= 0) return [];

	const normalized = normalizeCursorTelemetry(params.cursorTelemetry, totalMs);
	const explicitClicks = detectInteractionCandidates(normalized).filter(
		(candidate) => candidate.source === "explicit",
	);

	const suggestions: PresentationSuggestion[] = [];
	for (const click of explicitClicks) {
		const startMs = Math.max(0, click.centerTimeMs - 100);
		const endMs = Math.min(totalMs, click.centerTimeMs + 400);
		const insideZoom = excludeSpans.some(
			(span) => endMs > span.start && startMs < span.end,
		);
		if (insideZoom) continue;

		const originalSample = normalized.find(
			(sample) => Math.abs(sample.timeMs - click.centerTimeMs) < 1,
		);
		suggestions.push({
			id: `click-effect-${click.centerTimeMs}-${suggestions.length}`,
			kind: "click-effect",
			startMs,
			endMs,
			confidence: clickEffectConfidence(originalSample?.interactionType),
			reason: "A click happened here — a click effect helps viewers see exactly where.",
			focus: click.focus,
		});
	}
	return suggestions;
}

const CHAPTER_GAP_THRESHOLD_MS = 8000;

/**
 * Flags long stretches with zero cursor activity as candidate chapter/scene
 * boundaries. Deliberately conservative (low confidence) — this is a coarse
 * proxy for "the presenter moved on to something else," not real scene-change
 * detection (which the app doesn't have yet).
 */
export function buildChapterMarkerSuggestions(params: {
	cursorTelemetry: CursorTelemetryPoint[];
	totalMs: number;
}): PresentationSuggestion[] {
	const { totalMs } = params;
	if (totalMs <= 0) return [];

	const normalized = normalizeCursorTelemetry(params.cursorTelemetry, totalMs);
	if (normalized.length < 2) return [];

	const suggestions: PresentationSuggestion[] = [];
	for (let index = 1; index < normalized.length; index += 1) {
		const gap = normalized[index].timeMs - normalized[index - 1].timeMs;
		if (gap < CHAPTER_GAP_THRESHOLD_MS) continue;

		const markerMs = normalized[index].timeMs;
		suggestions.push({
			id: `chapter-marker-${markerMs}-${suggestions.length}`,
			kind: "chapter-marker",
			startMs: markerMs,
			endMs: markerMs,
			confidence: 0.5,
			reason: `${Math.round(gap / 1000)}s of inactivity ended here — likely the start of a new section.`,
			focus: normalized[index] ? { cx: normalized[index].cx, cy: normalized[index].cy } : undefined,
		});
	}
	return suggestions;
}

/**
 * "Make This Recording Look Better": combines every deterministic generator
 * into one chronologically sorted, non-mutating suggestion list. Nothing here
 * applies anything — callers decide per PRD Feature 4 ("no automatic silent
 * mutation"): each suggestion can be previewed, accepted, rejected, or bulk-applied.
 */
export function buildPresentationSuggestions(params: {
	cursorTelemetry: CursorTelemetryPoint[];
	totalMs: number;
	reservedSpans?: Array<{ start: number; end: number }>;
}): PresentationSuggestionResult {
	if (params.totalMs <= 0) {
		return { status: "no-telemetry", suggestions: [] };
	}

	const normalized = normalizeCursorTelemetry(params.cursorTelemetry, params.totalMs);
	if (normalized.length === 0) {
		return { status: "no-telemetry", suggestions: [] };
	}

	const zoomSuggestions = buildZoomPresentationSuggestions(params);
	const zoomSpans = zoomSuggestions.map((suggestion) => ({
		start: suggestion.startMs,
		end: suggestion.endMs,
	}));
	const clickEffectSuggestions = buildClickEffectSuggestions({
		cursorTelemetry: params.cursorTelemetry,
		totalMs: params.totalMs,
		excludeSpans: zoomSpans,
	});
	const chapterMarkerSuggestions = buildChapterMarkerSuggestions(params);

	const all = [...zoomSuggestions, ...clickEffectSuggestions, ...chapterMarkerSuggestions].sort(
		(a, b) => a.startMs - b.startMs,
	);

	if (all.length === 0) {
		return { status: "no-interactions", suggestions: [] };
	}

	return { status: "ok", suggestions: all };
}
