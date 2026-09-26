import { describe, expect, it } from "vitest";
import {
	appendMediaHealthSample,
	classifyMediaHealth,
	MEDIA_HEALTH_MAX_SAMPLES,
	MEDIA_HEALTH_STALL_THRESHOLD_MS,
} from "./mediaHealth";

describe("classifyMediaHealth", () => {
	it("returns unknown with no samples", () => {
		expect(classifyMediaHealth([], 0)).toBe("unknown");
	});

	it("returns unknown with only one sample (not enough evidence)", () => {
		expect(classifyMediaHealth([{ atMs: 0, sizeBytes: 100 }], 5_000)).toBe("unknown");
	});

	it("returns ok when the file has grown recently", () => {
		const samples = [
			{ atMs: 0, sizeBytes: 100 },
			{ atMs: 5_000, sizeBytes: 500 },
			{ atMs: 10_000, sizeBytes: 900 },
		];
		expect(classifyMediaHealth(samples, 12_000)).toBe("ok");
	});

	it("returns stalled when the file hasn't grown past the threshold", () => {
		const samples = [
			{ atMs: 0, sizeBytes: 100 },
			{ atMs: 5_000, sizeBytes: 500 },
			{ atMs: 10_000, sizeBytes: 500 },
		];
		expect(classifyMediaHealth(samples, 10_000 + MEDIA_HEALTH_STALL_THRESHOLD_MS + 1)).toBe(
			"stalled",
		);
	});

	it("is not stalled right at the threshold boundary", () => {
		const samples = [
			{ atMs: 0, sizeBytes: 100 },
			{ atMs: 5_000, sizeBytes: 500 },
		];
		expect(classifyMediaHealth(samples, 5_000 + MEDIA_HEALTH_STALL_THRESHOLD_MS)).toBe("ok");
	});

	it("recovers to ok as soon as growth resumes after a long plateau", () => {
		const samples = [
			{ atMs: 0, sizeBytes: 100 },
			{ atMs: 20_000, sizeBytes: 100 },
			{ atMs: 21_000, sizeBytes: 400 },
		];
		expect(classifyMediaHealth(samples, 22_000)).toBe("ok");
	});

	it("ignores a size decrease (e.g. a stat race) rather than treating it as growth", () => {
		const samples = [
			{ atMs: 0, sizeBytes: 500 },
			{ atMs: 5_000, sizeBytes: 400 },
		];
		expect(classifyMediaHealth(samples, 5_000 + MEDIA_HEALTH_STALL_THRESHOLD_MS + 1)).toBe(
			"stalled",
		);
	});
});

describe("appendMediaHealthSample", () => {
	it("appends a sample", () => {
		const result = appendMediaHealthSample([{ atMs: 0, sizeBytes: 1 }], {
			atMs: 1,
			sizeBytes: 2,
		});
		expect(result).toEqual([
			{ atMs: 0, sizeBytes: 1 },
			{ atMs: 1, sizeBytes: 2 },
		]);
	});

	it("caps the buffer at MEDIA_HEALTH_MAX_SAMPLES, keeping the most recent", () => {
		let samples: { atMs: number; sizeBytes: number }[] = [];
		for (let i = 0; i < MEDIA_HEALTH_MAX_SAMPLES + 5; i++) {
			samples = appendMediaHealthSample(samples, { atMs: i, sizeBytes: i });
		}
		expect(samples).toHaveLength(MEDIA_HEALTH_MAX_SAMPLES);
		expect(samples[0].atMs).toBe(5);
		expect(samples[samples.length - 1].atMs).toBe(MEDIA_HEALTH_MAX_SAMPLES + 4);
	});

	it("does not mutate the input array", () => {
		const original = [{ atMs: 0, sizeBytes: 1 }];
		const originalCopy = [...original];
		appendMediaHealthSample(original, { atMs: 1, sizeBytes: 2 });
		expect(original).toEqual(originalCopy);
	});
});
