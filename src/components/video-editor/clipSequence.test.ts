import { describe, expect, it } from "vitest";
import {
	closeClipGaps,
	reorderClipSequence,
	mapClipSequenceTime,
	packClipSequence,
	planTimeRangeDeletion,
	rippleRegionAnchors,
	rippleRegions,
} from "./clipSequence";
import { changeClipSpan } from "./clipSpanChange";

const clips = [
	{ id: "a", startMs: 0, endMs: 2800, speed: 1 },
	{ id: "b", startMs: 2800, endMs: 6000, speed: 1 },
];
describe("contiguous clip sequence", () => {
	it("a trim keeps both sides of the cut at 2.8s while changing the source in-point", () => {
		const next = closeClipGaps([clips[0], changeClipSpan(clips[1], 3500, 6000, 6000)]);
		expect(next[0].endMs).toBe(2800);
		expect(next[1]).toMatchObject({ startMs: 2800, endMs: 5300, sourceStartMs: 3500 });
		expect(rippleRegions([{ startMs: 4000, endMs: 5000 }], clips, next)).toEqual([
			{ startMs: 3300, endMs: 4300 },
		]);
	});
	it("deleting footage ripples the remaining footage and connected effects", () => {
		const next = closeClipGaps([clips[1]]);
		expect(next[0]).toMatchObject({ startMs: 0, endMs: 3200, sourceStartMs: 2800 });
		expect(
			rippleRegions(
				[
					{ startMs: 500, endMs: 2000 },
					{ startMs: 3000, endMs: 4000 },
				],
				clips,
				next,
			),
		).toEqual([{ startMs: 200, endMs: 1200 }]);
	});
	it("slowing a clip pushes the next clip without overwriting its source", () => {
		const next = closeClipGaps([{ ...clips[0], speed: 0.5, endMs: 5600 }, clips[1]]);
		expect(next[1]).toMatchObject({ startMs: 5600, endMs: 8800, sourceStartMs: 2800 });
	});
	it("reordering preserves source in-points and closes every gap", () => {
		const next = closeClipGaps([
			clips[0],
			{ ...clips[1], sourceStartMs: 2800, startMs: -3200, endMs: 0 },
		]);
		expect(next.map((c) => [c.id, c.startMs, c.endMs, c.sourceStartMs])).toEqual([
			["b", 0, 3200, 2800],
			["a", 3200, 6000, 0],
		]);
	});
});

describe("connected sequence content", () => {
	it.each([2, 4, 8, 16])("retains imported audio at fractional %sx anchors", (speed) => {
		const before = [{ id: "a", startMs: 0, endMs: 6000, speed: 1 }];
		const after = [{ ...before[0], speed, endMs: 6000 / speed }];
		const audio = [{ id: "music", startMs: 1001, endMs: 5501, volume: 0.7 }];
		expect(rippleRegionAnchors(audio, before, after)).toEqual([
			{
				...audio[0],
				startMs: Math.round(1001 / speed),
				endMs: Math.round(1001 / speed) + 4500,
			},
		]);
	});
	it("preserves independently timed audio duration across a legacy gap", () => {
		const before = [clips[0], { ...clips[1], startMs: 3500, endMs: 6700 }];
		const after = closeClipGaps(before);
		expect(rippleRegionAnchors([{ startMs: 2000, endMs: 7000 }], before, after)).toEqual([
			{ startMs: 2000, endMs: 7000 },
		]);
		expect(mapClipSequenceTime(7200, before, after)).toBe(6500);
	});
	it("retains music anchored to deleted footage at the surviving cut", () => {
		const after = closeClipGaps([clips[1]]);
		expect(rippleRegionAnchors([{ startMs: 1000, endMs: 5000 }], clips, after)).toEqual([
			{ startMs: 0, endMs: 4000 },
		]);
	});
	it("preserves an effect spanning clips whose order is reversed", () => {
		const after = closeClipGaps([
			{ ...clips[1], sourceStartMs: 2800, startMs: -3200, endMs: 0 },
			clips[0],
		]);
		expect(
			rippleRegions([{ id: "annotation", startMs: 2000, endMs: 4000 }], clips, after),
		).toEqual([{ id: "annotation", startMs: 0, endMs: 6000 }]);
	});
	it("removes effects supported solely by deleted footage", () => {
		expect(
			rippleRegions([{ startMs: 0, endMs: 2000 }], clips, closeClipGaps([clips[1]])),
		).toEqual([]);
	});
});

describe("sequence insertion", () => {
	const threeClips = [
		{ id: "a", startMs: 0, endMs: 1000, speed: 1 },
		{ id: "b", startMs: 1000, endMs: 3000, speed: 1 },
		{ id: "c", startMs: 3000, endMs: 6000, speed: 1 },
	];
	it("moves the first clip after the middle one without skipping to the end", () => {
		expect(reorderClipSequence(threeClips, "a", 1)).toEqual([
			{ ...threeClips[1], startMs: 0, endMs: 2000, sourceStartMs: 1000 },
			{ ...threeClips[0], startMs: 2000, endMs: 3000, sourceStartMs: 0 },
			threeClips[2],
		]);
	});
	it("moves a middle clip to the start while preserving source footage", () => {
		const reordered = reorderClipSequence(threeClips, "b", 0);
		expect(reordered.map((clip) => clip.id)).toEqual(["b", "a", "c"]);
		expect(reordered[0]).toMatchObject({ startMs: 0, endMs: 2000, sourceStartMs: 1000 });
	});
});

it("reveals footage on a clip's left edge without changing sequence order", () => {
	const before = [
		{ id: "a", startMs: 0, endMs: 2000, sourceStartMs: 0, speed: 1 },
		{ id: "b", startMs: 2000, endMs: 3000, sourceStartMs: 4000, speed: 1 },
	];
	const edited = [before[0], changeClipSpan(before[1], -1000, 3000, 6000)];
	const after = packClipSequence(edited);
	expect(after).toEqual([
		before[0],
		{ ...before[1], startMs: 2000, endMs: 6000, sourceStartMs: 1000 },
	]);
	expect(rippleRegions([{ startMs: 2200, endMs: 2600 }], before, after)).toEqual([
		{ startMs: 5200, endMs: 5600 },
	]);
});

function makeIdCounter(prefix: string) {
	let n = 0;
	return () => `${prefix}-${n++}`;
}

describe("planTimeRangeDeletion", () => {
	it("returns null for an invalid or empty range", () => {
		expect(
			planTimeRangeDeletion({
				clipRegions: clips,
				startMs: 1000,
				endMs: 1000,
				createId: makeIdCounter("x"),
			}),
		).toBeNull();
		expect(
			planTimeRangeDeletion({
				clipRegions: clips,
				startMs: 2000,
				endMs: 1000,
				createId: makeIdCounter("x"),
			}),
		).toBeNull();
	});

	it("splits at both boundaries, drops the middle, and closes the gap", () => {
		const single = [{ id: "a", startMs: 0, endMs: 6000, sourceStartMs: 0, speed: 1 }];
		const plan = planTimeRangeDeletion({
			clipRegions: single,
			startMs: 2000,
			endMs: 4000,
			createId: makeIdCounter("split"),
		});
		expect(plan).not.toBeNull();
		if (!plan) return;

		// Split step alone must not move anything — three contiguous pieces covering the same span.
		expect(plan.splitClips.map((c) => ({ startMs: c.startMs, endMs: c.endMs }))).toEqual([
			{ startMs: 0, endMs: 2000 },
			{ startMs: 2000, endMs: 4000 },
			{ startMs: 4000, endMs: 6000 },
		]);

		// The middle piece (fully inside the cut) is gone; the tail repacks right after the head.
		expect(plan.nextClips).toHaveLength(2);
		expect(plan.nextClips[0]).toMatchObject({ startMs: 0, endMs: 2000, sourceStartMs: 0 });
		expect(plan.nextClips[1]).toMatchObject({ startMs: 2000, endMs: 4000, sourceStartMs: 4000 });

		// A region entirely before the cut is untouched; one entirely after ripples earlier by 2s
		// (the size of the removed range); one inside the cut disappears.
		expect(
			rippleRegions(
				[
					{ startMs: 500, endMs: 1000 },
					{ startMs: 2500, endMs: 3000 },
					{ startMs: 5000, endMs: 5500 },
				],
				plan.splitClips,
				plan.nextClips,
			),
		).toEqual([
			{ startMs: 500, endMs: 1000 },
			{ startMs: 3000, endMs: 3500 },
		]);
	});

	it("aligns the cut to existing clip edges without introducing a needless split", () => {
		// clips = [a: 0-2800, b: 2800-6000]; cutting exactly [0, 2800) hits both boundaries
		// exactly on an existing edge, so no new split should be needed for either side.
		const plan = planTimeRangeDeletion({
			clipRegions: clips,
			startMs: 0,
			endMs: 2800,
			createId: makeIdCounter("edge"),
		});
		expect(plan).not.toBeNull();
		if (!plan) return;
		expect(plan.nextClips).toHaveLength(1);
		expect(plan.nextClips[0]).toMatchObject({ id: "b", startMs: 0, endMs: 3200, sourceStartMs: 2800 });
	});

	it("removes a range spanning across a clip boundary", () => {
		// clips = [a: 0-2800, b: 2800-6000]; cut [2000, 4000) removes the tail of a and the head of b.
		const plan = planTimeRangeDeletion({
			clipRegions: clips,
			startMs: 2000,
			endMs: 4000,
			createId: makeIdCounter("cross"),
		});
		expect(plan).not.toBeNull();
		if (!plan) return;
		expect(plan.nextClips).toHaveLength(2);
		expect(plan.nextClips[0]).toMatchObject({ startMs: 0, endMs: 2000 });
		// tail of clip b (4000..6000 on the timeline -> source 4000..6000) now starts right after.
		expect(plan.nextClips[1]).toMatchObject({ startMs: 2000, endMs: 4000, sourceStartMs: 4000 });
	});
});
