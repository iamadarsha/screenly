import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TranscriptPanel } from "./TranscriptPanel";
import type { CaptionCue } from "./types";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: () => (_key: string, fallback: string) => fallback,
}));

function wordCue(id: string, startMs: number, words: string[]): CaptionCue {
	return {
		id,
		startMs,
		endMs: startMs + words.length * 500,
		text: words.join(" "),
		words: words.map((w, i) => ({
			text: w,
			startMs: startMs + i * 500,
			endMs: startMs + (i + 1) * 500,
			...(i > 0 ? { leadingSpace: true } : {}),
		})),
	};
}

describe("TranscriptPanel", () => {
	it("renders an empty state placeholder when no cues are provided", () => {
		const html = renderToStaticMarkup(
			<TranscriptPanel cues={[]} onDeleteWordRange={vi.fn()} />,
		);
		expect(html).toContain("No transcript yet — generate captions first.");
	});

	it("renders word buttons for the transcript", () => {
		const cues = [wordCue("c1", 0, ["Hello", "world"])];
		const html = renderToStaticMarkup(
			<TranscriptPanel cues={cues} onDeleteWordRange={vi.fn()} />,
		);
		expect(html).toContain("Hello");
		expect(html).toContain("world");
		expect(html).toContain('role="region"');
	});

	it("detects filler words and displays them with highlight class and pill button", () => {
		const cues = [wordCue("c1", 0, ["Hello", "um", "world", "uh"])];
		const html = renderToStaticMarkup(
			<TranscriptPanel cues={cues} onDeleteWordRange={vi.fn()} />,
		);
		expect(html).toContain("Detected filler words");
		expect(html).toContain("&quot;um&quot;");
		expect(html).toContain("&quot;uh&quot;");
		expect(html).toContain("bg-amber-500/20");
	});

	it("detects repeated phrase false starts and displays remove repeat section", () => {
		const cues = [
			wordCue("c1", 0, ["I", "want", "to", "I", "want", "to", "demonstrate", "this"]),
		];
		const html = renderToStaticMarkup(
			<TranscriptPanel cues={cues} onDeleteWordRange={vi.fn()} />,
		);
		expect(html).toContain("Possible false starts");
		expect(html).toContain("&quot;I want to&quot;");
		expect(html).toContain("Remove repeat");
	});

	it("highlights the currently active word during playback", () => {
		const cues = [wordCue("c1", 0, ["first", "second", "third"])]; // 0-500, 500-1000, 1000-1500
		const html = renderToStaticMarkup(
			<TranscriptPanel
				cues={cues}
				onDeleteWordRange={vi.fn()}
				currentSourceTimeMs={750} // in the middle of "second"
			/>,
		);
		expect(html).toContain("first");
		expect(html).toContain("second");
		expect(html).toContain("third");
		// "second" should have the current word ring highlight class
		expect(html).toContain("ring-[#2563EB]/40");
	});
});
