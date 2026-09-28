import { describe, expect, it } from "vitest";
import type { CursorTelemetryPoint } from "../types";
import {
	buildChapterMarkerSuggestions,
	buildClickEffectSuggestions,
	buildPresentationSuggestions,
	buildZoomPresentationSuggestions,
} from "./presentationSuggestions";

function click(
	timeMs: number,
	cx = 0.5,
	cy = 0.5,
	interactionType: CursorTelemetryPoint["interactionType"] = "click",
): CursorTelemetryPoint {
	return { timeMs, cx, cy, interactionType };
}

function move(timeMs: number, cx = 0.5, cy = 0.5): CursorTelemetryPoint {
	return { timeMs, cx, cy, interactionType: "move" };
}

const TOTAL_MS = 30_000;

describe("buildZoomPresentationSuggestions", () => {
	it("wraps the existing click-cluster zoom heuristic with confidence and reason", () => {
		const telemetry = [move(0), click(5_000), move(TOTAL_MS)];
		const suggestions = buildZoomPresentationSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
		});

		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].kind).toBe("zoom");
		expect(suggestions[0].confidence).toBeGreaterThan(0);
		expect(suggestions[0].confidence).toBeLessThanOrEqual(1);
		expect(suggestions[0].reason).toMatch(/click/i);
	});

	it("returns no suggestions when there is no telemetry", () => {
		expect(buildZoomPresentationSuggestions({ cursorTelemetry: [], totalMs: TOTAL_MS })).toEqual(
			[],
		);
	});
});

describe("buildClickEffectSuggestions", () => {
	it("proposes a click-effect at an explicit click outside any zoom span", () => {
		const telemetry = [move(0), click(10_000), move(TOTAL_MS)];
		const suggestions = buildClickEffectSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
		});

		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].kind).toBe("click-effect");
		expect(suggestions[0].startMs).toBeLessThanOrEqual(10_000);
		expect(suggestions[0].endMs).toBeGreaterThanOrEqual(10_000);
	});

	it("gives double-clicks higher confidence than single clicks", () => {
		const singleClick = buildClickEffectSuggestions({
			cursorTelemetry: [move(0), click(5_000, 0.5, 0.5, "click"), move(TOTAL_MS)],
			totalMs: TOTAL_MS,
		})[0];
		const doubleClick = buildClickEffectSuggestions({
			cursorTelemetry: [move(0), click(5_000, 0.5, 0.5, "double-click"), move(TOTAL_MS)],
			totalMs: TOTAL_MS,
		})[0];

		expect(doubleClick.confidence).toBeGreaterThan(singleClick.confidence);
	});

	it("excludes clicks that fall inside an already-suggested zoom span", () => {
		const suggestions = buildClickEffectSuggestions({
			cursorTelemetry: [move(0), click(10_000), move(TOTAL_MS)],
			totalMs: TOTAL_MS,
			excludeSpans: [{ start: 9_500, end: 10_500 }],
		});
		expect(suggestions).toEqual([]);
	});
});

describe("buildChapterMarkerSuggestions", () => {
	it("flags a long gap in cursor activity as a candidate chapter boundary", () => {
		const telemetry = [move(0), move(1_000), move(12_000), move(13_000)];
		const suggestions = buildChapterMarkerSuggestions({
			cursorTelemetry: telemetry,
			totalMs: TOTAL_MS,
		});

		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].kind).toBe("chapter-marker");
		expect(suggestions[0].startMs).toBe(12_000);
		expect(suggestions[0].confidence).toBeLessThan(0.7); // deliberately conservative
	});

	it("does not flag short, normal gaps between samples", () => {
		const telemetry = [move(0), move(1_000), move(2_000), move(3_000)];
		expect(
			buildChapterMarkerSuggestions({ cursorTelemetry: telemetry, totalMs: TOTAL_MS }),
		).toEqual([]);
	});
});

describe("buildPresentationSuggestions", () => {
	it("reports no-telemetry when nothing was captured", () => {
		expect(buildPresentationSuggestions({ cursorTelemetry: [], totalMs: TOTAL_MS })).toEqual({
			status: "no-telemetry",
			suggestions: [],
		});
	});

	it("reports no-interactions when telemetry exists but nothing actionable was found", () => {
		const telemetry = [move(0), move(1_000)];
		const result = buildPresentationSuggestions({ cursorTelemetry: telemetry, totalMs: TOTAL_MS });
		expect(result.status).toBe("no-interactions");
		expect(result.suggestions).toEqual([]);
	});

	it("combines zoom, click-effect, and chapter-marker suggestions in chronological order", () => {
		const telemetry = [
			move(0),
			click(2_000),
			move(2_500),
			move(20_000), // long gap since 2_500 -> chapter marker at 20_000
			click(20_500),
			move(TOTAL_MS),
		];
		const result = buildPresentationSuggestions({ cursorTelemetry: telemetry, totalMs: TOTAL_MS });

		expect(result.status).toBe("ok");
		expect(result.suggestions.length).toBeGreaterThan(1);
		const times = result.suggestions.map((s) => s.startMs);
		expect(times).toEqual([...times].sort((a, b) => a - b));
		const kinds = new Set(result.suggestions.map((s) => s.kind));
		expect(kinds.has("zoom")).toBe(true);
		expect(kinds.has("chapter-marker")).toBe(true);
	});

	it("never produces overlapping zoom and click-effect suggestions for the same click", () => {
		const telemetry = [move(0), click(10_000), move(TOTAL_MS)];
		const result = buildPresentationSuggestions({ cursorTelemetry: telemetry, totalMs: TOTAL_MS });
		const zoomSpans = result.suggestions.filter((s) => s.kind === "zoom");
		const clickSpans = result.suggestions.filter((s) => s.kind === "click-effect");
		for (const clickSuggestion of clickSpans) {
			for (const zoomSuggestion of zoomSpans) {
				const overlaps =
					clickSuggestion.endMs > zoomSuggestion.startMs &&
					clickSuggestion.startMs < zoomSuggestion.endMs;
				expect(overlaps).toBe(false);
			}
		}
	});
});
