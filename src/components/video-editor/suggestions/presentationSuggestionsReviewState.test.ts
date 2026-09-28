import { describe, expect, it } from "vitest";
import type { PresentationSuggestion } from "./presentationSuggestions";
import {
	canApplySuggestionKind,
	countByStatus,
	countPendingApplicable,
	getAcceptableSuggestion,
	getAllPendingApplicable,
	getPreviewTarget,
	markAllPendingApplicableAccepted,
	markAllPendingRejected,
	markSuggestionStatus,
	toReviewItems,
} from "./presentationSuggestionsReviewState";

function suggestion(overrides: Partial<PresentationSuggestion> = {}): PresentationSuggestion {
	return {
		id: "s-1",
		kind: "zoom",
		startMs: 0,
		endMs: 1000,
		confidence: 0.7,
		reason: "test",
		...overrides,
	};
}

describe("canApplySuggestionKind", () => {
	it("is true only for zoom, the one kind with a real overlay type today", () => {
		expect(canApplySuggestionKind("zoom")).toBe(true);
		expect(canApplySuggestionKind("click-effect")).toBe(false);
		expect(canApplySuggestionKind("chapter-marker")).toBe(false);
		expect(canApplySuggestionKind("camera-layout")).toBe(false);
	});
});

describe("toReviewItems", () => {
	it("marks every suggestion pending", () => {
		const items = toReviewItems([suggestion({ id: "a" }), suggestion({ id: "b" })]);
		expect(items.every((item) => item.status === "pending")).toBe(true);
		expect(items.map((i) => i.id)).toEqual(["a", "b"]);
	});
});

describe("markSuggestionStatus", () => {
	it("updates only the targeted item, leaving others untouched", () => {
		const items = toReviewItems([suggestion({ id: "a" }), suggestion({ id: "b" })]);
		const next = markSuggestionStatus(items, "a", "rejected");
		expect(next.find((i) => i.id === "a")?.status).toBe("rejected");
		expect(next.find((i) => i.id === "b")?.status).toBe("pending");
	});
});

describe("getAcceptableSuggestion", () => {
	it("returns the item when pending and applicable", () => {
		const items = toReviewItems([suggestion({ id: "a", kind: "zoom" })]);
		expect(getAcceptableSuggestion(items, "a")?.id).toBe("a");
	});

	it("returns undefined for a non-applicable kind", () => {
		const items = toReviewItems([suggestion({ id: "a", kind: "click-effect" })]);
		expect(getAcceptableSuggestion(items, "a")).toBeUndefined();
	});

	it("returns undefined once already accepted or rejected", () => {
		const items = markSuggestionStatus(
			toReviewItems([suggestion({ id: "a" })]),
			"a",
			"accepted",
		);
		expect(getAcceptableSuggestion(items, "a")).toBeUndefined();
	});
});

describe("getPreviewTarget", () => {
	it("finds an item regardless of status", () => {
		const items = markSuggestionStatus(
			toReviewItems([suggestion({ id: "a" })]),
			"a",
			"rejected",
		);
		expect(getPreviewTarget(items, "a")?.id).toBe("a");
	});
});

describe("getAllPendingApplicable / countPendingApplicable", () => {
	it("only counts pending zoom suggestions", () => {
		const items = toReviewItems([
			suggestion({ id: "a", kind: "zoom" }),
			suggestion({ id: "b", kind: "click-effect" }),
			suggestion({ id: "c", kind: "zoom" }),
		]);
		const rejected = markSuggestionStatus(items, "c", "rejected");
		expect(getAllPendingApplicable(rejected).map((i) => i.id)).toEqual(["a"]);
		expect(countPendingApplicable(rejected)).toBe(1);
	});
});

describe("markAllPendingApplicableAccepted", () => {
	it("accepts every pending applicable item and leaves the rest alone", () => {
		const items = toReviewItems([
			suggestion({ id: "a", kind: "zoom" }),
			suggestion({ id: "b", kind: "click-effect" }),
			suggestion({ id: "c", kind: "zoom" }),
		]);
		const rejected = markSuggestionStatus(items, "b", "rejected");
		const next = markAllPendingApplicableAccepted(rejected);
		expect(next.find((i) => i.id === "a")?.status).toBe("accepted");
		expect(next.find((i) => i.id === "c")?.status).toBe("accepted");
		expect(next.find((i) => i.id === "b")?.status).toBe("rejected"); // untouched
	});
});

describe("markAllPendingRejected", () => {
	it("rejects every still-pending item, including non-applicable kinds", () => {
		const items = toReviewItems([
			suggestion({ id: "a", kind: "zoom" }),
			suggestion({ id: "b", kind: "chapter-marker" }),
		]);
		const accepted = markSuggestionStatus(items, "a", "accepted");
		const next = markAllPendingRejected(accepted);
		expect(next.find((i) => i.id === "a")?.status).toBe("accepted"); // untouched, already resolved
		expect(next.find((i) => i.id === "b")?.status).toBe("rejected");
	});
});

describe("countByStatus", () => {
	it("counts items matching a given status", () => {
		const items = toReviewItems([suggestion({ id: "a" }), suggestion({ id: "b" })]);
		const next = markSuggestionStatus(items, "a", "accepted");
		expect(countByStatus(next, "accepted")).toBe(1);
		expect(countByStatus(next, "pending")).toBe(1);
		expect(countByStatus(next, "rejected")).toBe(0);
	});
});
