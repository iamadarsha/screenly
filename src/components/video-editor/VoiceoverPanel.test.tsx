import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceoverPanel } from "./VoiceoverPanel";

vi.mock("@/lib/exporter/localMediaSource", () => ({
	resolveMediaElementSource: vi.fn().mockResolvedValue({
		src: "blob:http://localhost/test-audio",
		revoke: vi.fn(),
	}),
}));

describe("VoiceoverPanel", () => {
	it("renders AI Voiceover interface and status badge", () => {
		const html = renderToStaticMarkup(<VoiceoverPanel />);
		expect(html).toContain("AI Voiceover");
		expect(html).toContain("Native Speech");
		expect(html).toContain("Narration Script");
		expect(html).toContain("Generate Voiceover");
	});

	it("renders draft action when transcript cues are provided", () => {
		const cues = [{ id: "cue-1", startMs: 0, endMs: 2000, text: "Welcome to this demo." }];
		const html = renderToStaticMarkup(<VoiceoverPanel transcriptCues={cues} currentTimeMs={500} />);
		expect(html).toContain("Draft from Transcript");
	});

	it("renders selected audio clip controls when an audio region is selected", () => {
		const html = renderToStaticMarkup(
			<VoiceoverPanel
				selectedAudioId="audio-1"
				selectedAudioVolume={0.8}
				selectedAudioNormalize={true}
			/>,
		);
		expect(html).toContain("Selected Audio Clip");
		expect(html).toContain("Normalize Audio");
		expect(html).toContain("Delete");
	});
});
