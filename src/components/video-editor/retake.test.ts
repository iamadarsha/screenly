import { describe, expect, it } from "vitest";
import { applyRetakeToClip, swapToPreviousTake } from "./retake";
import type { ClipRegion } from "./types";

const baseClip: ClipRegion = {
	id: "clip-1",
	startMs: 1000,
	endMs: 4000,
	sourceStartMs: 5000,
	sourceMinMs: 5000,
	sourceMaxMs: 8000,
	speed: 1,
};

describe("applyRetakeToClip", () => {
	it("replaces the clip's source range and adjusts endMs to the new take's duration", () => {
		const retaken = applyRetakeToClip(baseClip, {
			sourceStartMs: 20000,
			sourceMinMs: 20000,
			sourceMaxMs: 25000,
			durationMs: 5000,
		});

		expect(retaken.startMs).toBe(1000);
		expect(retaken.endMs).toBe(6000);
		expect(retaken.sourceStartMs).toBe(20000);
		expect(retaken.sourceMinMs).toBe(20000);
		expect(retaken.sourceMaxMs).toBe(25000);
	});

	it("scales the new timeline duration by the clip's existing speed", () => {
		const fastClip: ClipRegion = { ...baseClip, speed: 2 };
		const retaken = applyRetakeToClip(fastClip, {
			sourceStartMs: 20000,
			durationMs: 4000,
		});

		// 4000ms of real footage at 2x speed occupies 2000ms of timeline.
		expect(retaken.endMs - retaken.startMs).toBe(2000);
	});

	it("pushes the previous take onto previousTakes without losing its range", () => {
		const retaken = applyRetakeToClip(baseClip, {
			sourceStartMs: 20000,
			durationMs: 3000,
		});

		expect(retaken.previousTakes).toHaveLength(1);
		expect(retaken.previousTakes?.[0]).toMatchObject({
			sourceStartMs: 5000,
			sourceMinMs: 5000,
			sourceMaxMs: 8000,
			timelineDurationMs: 3000,
		});
	});

	it("accumulates multiple retakes in order", () => {
		const first = applyRetakeToClip(baseClip, { sourceStartMs: 20000, durationMs: 3000 });
		const second = applyRetakeToClip(first, { sourceStartMs: 40000, durationMs: 2000 });

		expect(second.previousTakes).toHaveLength(2);
		expect(second.previousTakes?.[0].sourceStartMs).toBe(5000);
		expect(second.previousTakes?.[1].sourceStartMs).toBe(20000);
		expect(second.sourceStartMs).toBe(40000);
	});

	it("does not mutate the input clip", () => {
		const original = { ...baseClip };
		applyRetakeToClip(baseClip, { sourceStartMs: 20000, durationMs: 3000 });
		expect(baseClip).toEqual(original);
	});
});

describe("swapToPreviousTake", () => {
	it("returns null when there is no previous take", () => {
		expect(swapToPreviousTake(baseClip)).toBeNull();
	});

	it("restores the previous take's source range and timeline duration", () => {
		const retaken = applyRetakeToClip(baseClip, {
			sourceStartMs: 20000,
			sourceMinMs: 20000,
			sourceMaxMs: 25000,
			durationMs: 5000,
		});

		const restored = swapToPreviousTake(retaken);
		expect(restored).not.toBeNull();
		expect(restored?.sourceStartMs).toBe(5000);
		expect(restored?.sourceMinMs).toBe(5000);
		expect(restored?.sourceMaxMs).toBe(8000);
		expect(restored?.endMs - restored!.startMs).toBe(3000);
	});

	it("pushes the take being swapped away back onto the stack (toggle back and forth)", () => {
		const retaken = applyRetakeToClip(baseClip, { sourceStartMs: 20000, durationMs: 5000 });
		const restored = swapToPreviousTake(retaken)!;

		expect(restored.previousTakes).toHaveLength(1);
		expect(restored.previousTakes?.[0].sourceStartMs).toBe(20000);

		const forwardAgain = swapToPreviousTake(restored)!;
		expect(forwardAgain.sourceStartMs).toBe(20000);
		expect(forwardAgain.endMs - forwardAgain.startMs).toBe(5000);
	});

	it("with multiple retakes, swaps only the most recent one", () => {
		const first = applyRetakeToClip(baseClip, { sourceStartMs: 20000, durationMs: 3000 });
		const second = applyRetakeToClip(first, { sourceStartMs: 40000, durationMs: 2000 });

		const restored = swapToPreviousTake(second)!;
		expect(restored.sourceStartMs).toBe(20000);
		expect(restored.previousTakes).toHaveLength(2);
		expect(restored.previousTakes?.[0].sourceStartMs).toBe(5000);
		expect(restored.previousTakes?.[1].sourceStartMs).toBe(40000);
	});

	it("does not mutate the input clip", () => {
		const retaken = applyRetakeToClip(baseClip, { sourceStartMs: 20000, durationMs: 5000 });
		const snapshot = JSON.parse(JSON.stringify(retaken));
		swapToPreviousTake(retaken);
		expect(retaken).toEqual(snapshot);
	});
});
