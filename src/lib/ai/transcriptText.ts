import type { CaptionCue } from "@/components/video-editor/types";

/** Flattens cues into plain prompt text, chronological, deduplicated of internal whitespace. */
export function buildTranscriptText(cues: CaptionCue[], maxChars = 6000): string {
	const text = [...cues]
		.sort((a, b) => a.startMs - b.startMs)
		.map((cue) => cue.text)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
