import { describe, expect, it, vi } from "vitest";
import type { ClipRegion } from "../types";
import {
	runCaptionSidecarPreflight,
	runDiskSpacePreflight,
	runExportPreflight,
	runTimelineSegmentsPreflight,
	runVideoSourcePreflight,
} from "./exportPreflight";

function clip(overrides: Partial<ClipRegion> = {}): ClipRegion {
	return { id: "clip-1", startMs: 0, endMs: 1000, speed: 1, ...overrides };
}

describe("runVideoSourcePreflight", () => {
	it("blocks when there is no video element", () => {
		expect(runVideoSourcePreflight(null)).toEqual([
			{ code: "source-missing", message: "No video is loaded to export." },
		]);
	});

	it("blocks when the video hasn't finished loading", () => {
		const issues = runVideoSourcePreflight({ readyState: 0, duration: 10 });
		expect(issues.map((issue) => issue.code)).toContain("source-not-ready");
	});

	it("blocks when duration is not finite or non-positive", () => {
		expect(
			runVideoSourcePreflight({ readyState: 4, duration: Number.NaN }).map((i) => i.code),
		).toContain("source-duration-invalid");
		expect(runVideoSourcePreflight({ readyState: 4, duration: 0 }).map((i) => i.code)).toContain(
			"source-duration-invalid",
		);
	});

	it("passes for a ready video with a valid duration", () => {
		expect(runVideoSourcePreflight({ readyState: 4, duration: 44.9 })).toEqual([]);
	});
});

describe("runTimelineSegmentsPreflight", () => {
	it("passes when there are no clip regions (full source export)", () => {
		expect(runTimelineSegmentsPreflight([], 1000)).toEqual([]);
	});

	it("blocks on a clip with endMs <= startMs", () => {
		const issues = runTimelineSegmentsPreflight([clip({ startMs: 500, endMs: 500 })], 1000);
		expect(issues.map((i) => i.code)).toContain("clip-region-invalid");
	});

	it("blocks when the last clip extends past the source duration", () => {
		const issues = runTimelineSegmentsPreflight(
			[clip({ startMs: 0, endMs: 2000 })],
			1000,
		);
		expect(issues.map((i) => i.code)).toContain("clip-region-out-of-bounds");
	});

	it("tolerates small rounding overshoot past the source duration", () => {
		const issues = runTimelineSegmentsPreflight([clip({ startMs: 0, endMs: 1100 })], 1000);
		expect(issues).toEqual([]);
	});

	it("passes for valid, in-bounds clips regardless of array order", () => {
		const issues = runTimelineSegmentsPreflight(
			[clip({ id: "b", startMs: 500, endMs: 1000 }), clip({ id: "a", startMs: 0, endMs: 500 })],
			1000,
		);
		expect(issues).toEqual([]);
	});
});

describe("runDiskSpacePreflight", () => {
	it("returns no issues when no status getter is provided", async () => {
		expect(await runDiskSpacePreflight(undefined)).toEqual({ blockers: [], warnings: [] });
	});

	it("blocks on critical disk space", async () => {
		const result = await runDiskSpacePreflight(async () => ({
			status: "critical",
			freeBytes: 1024,
		}));
		expect(result.blockers.map((i) => i.code)).toContain("disk-space-critical");
	});

	it("warns (does not block) on low disk space", async () => {
		const result = await runDiskSpacePreflight(async () => ({
			status: "low",
			freeBytes: 1024 * 1024 * 1024,
		}));
		expect(result.blockers).toEqual([]);
		expect(result.warnings.map((i) => i.code)).toContain("disk-space-low");
	});

	it("is silent when disk status is ok or unknown", async () => {
		expect(
			await runDiskSpacePreflight(async () => ({ status: "ok", freeBytes: 1e12 })),
		).toEqual({ blockers: [], warnings: [] });
		expect(
			await runDiskSpacePreflight(async () => ({ status: "unknown", freeBytes: null })),
		).toEqual({ blockers: [], warnings: [] });
	});

	it("swallows a throwing status getter rather than blocking export", async () => {
		const getStatus = vi.fn().mockRejectedValue(new Error("boom"));
		expect(await runDiskSpacePreflight(getStatus)).toEqual({ blockers: [], warnings: [] });
	});
});

describe("runCaptionSidecarPreflight", () => {
	it("warns when captions were requested but no payload is available", () => {
		expect(runCaptionSidecarPreflight(true, false).map((i) => i.code)).toContain(
			"captions-unavailable",
		);
	});

	it("is silent when captions weren't requested, or a payload exists", () => {
		expect(runCaptionSidecarPreflight(false, false)).toEqual([]);
		expect(runCaptionSidecarPreflight(true, true)).toEqual([]);
		expect(runCaptionSidecarPreflight(undefined, false)).toEqual([]);
	});
});

describe("runExportPreflight", () => {
	it("aggregates blockers across all checks", async () => {
		const result = await runExportPreflight({
			video: { readyState: 4, duration: Number.NaN },
			clipRegions: [],
			settings: {},
			hasCaptionPayload: false,
			getDiskSpaceStatus: async () => ({ status: "critical", freeBytes: 0 }),
		});
		expect(result.blockers.map((i) => i.code)).toEqual([
			"source-duration-invalid",
			"disk-space-critical",
		]);
	});

	it("skips timeline validation when the source itself is unreadable", async () => {
		const result = await runExportPreflight({
			video: null,
			clipRegions: [clip({ startMs: 0, endMs: 2000 })],
			settings: {},
			hasCaptionPayload: false,
		});
		expect(result.blockers.map((i) => i.code)).toEqual(["source-missing"]);
	});

	it("returns no blockers or warnings for a healthy export", async () => {
		const result = await runExportPreflight({
			video: { readyState: 4, duration: 44.9 },
			clipRegions: [clip({ startMs: 0, endMs: 44_900 })],
			settings: { includeCaptionSidecar: false },
			hasCaptionPayload: false,
			getDiskSpaceStatus: async () => ({ status: "ok", freeBytes: 1e12 }),
		});
		expect(result).toEqual({ blockers: [], warnings: [] });
	});
});
