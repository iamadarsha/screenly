import type { CaptionCue } from "@/components/video-editor/types";
import { promptLocalModelForJson } from "./localModelProvider";
import type { ReasoningOutcome } from "./reasoningOutcome";
import { buildTranscriptText } from "./transcriptText";

export interface AiTitleResult {
	title: string;
}

const TITLE_SCHEMA = {
	type: "object",
	properties: { title: { type: "string" } },
	required: ["title"],
};

export function isValidTitle(data: unknown): data is AiTitleResult {
	if (!data || typeof data !== "object" || !("title" in data)) return false;
	const title = (data as { title: unknown }).title;
	return typeof title === "string" && title.trim().length > 0 && title.length <= 100;
}

/**
 * Tries the local model for a real, content-aware title. Falls back to a
 * deterministic Tier-0 proxy (the opening words of the transcript) when no
 * model is available — a much weaker title, but still a real, working
 * feature rather than nothing.
 */
export async function generateTitleWithAi(cues: CaptionCue[]): Promise<ReasoningOutcome<AiTitleResult>> {
	const transcript = buildTranscriptText(cues);
	if (transcript) {
		const result = await promptLocalModelForJson({
			prompt: `Suggest a short, descriptive title (10 words or fewer) for a screen recording with this transcript:\n\n${transcript}`,
			responseJSONSchema: TITLE_SCHEMA,
			validate: isValidTitle,
		});
		if (result.ok) {
			return {
				status: "ok",
				result: { tier: "tier-2-multimodal-local", confidence: 0.7, data: result.data },
			};
		}
	}

	const firstCue = [...cues].sort((a, b) => a.startMs - b.startMs)[0];
	if (!firstCue) {
		return { status: "unavailable", reason: "No transcript available to derive a title from." };
	}
	const words = firstCue.text.trim().split(/\s+/).filter(Boolean).slice(0, 8);
	return {
		status: "ok",
		result: {
			tier: "tier-0-heuristic",
			confidence: 0.3,
			data: { title: words.join(" ") || "Untitled recording" },
		},
	};
}
