import type { CaptionCue } from "@/components/video-editor/types";
import { promptLocalModelForJson } from "./localModelProvider";
import type { ReasoningOutcome } from "./reasoningOutcome";
import { buildTranscriptText } from "./transcriptText";

export interface AiSummaryResult {
	summary: string;
}

const SUMMARY_SCHEMA = {
	type: "object",
	properties: { summary: { type: "string" } },
	required: ["summary"],
};

export function isValidSummary(data: unknown): data is AiSummaryResult {
	if (!data || typeof data !== "object" || !("summary" in data)) return false;
	const summary = (data as { summary: unknown }).summary;
	return typeof summary === "string" && summary.trim().length > 0 && summary.length <= 1000;
}

/**
 * Summarization has no honest deterministic fallback — unlike chapters
 * (pause-based segmentation) or title (opening words), there is no
 * heuristic that produces a real summary of arbitrary content without
 * actually understanding it. Per the PRD's own fallback hierarchy ("model
 * unavailable → deterministic heuristic; heuristic unavailable → disable
 * only that enhancement"), this feature reports `unavailable` rather than
 * fabricating a fake summary when the model can't be used.
 */
export async function generateSummaryWithAi(
	cues: CaptionCue[],
): Promise<ReasoningOutcome<AiSummaryResult>> {
	const transcript = buildTranscriptText(cues);
	if (!transcript) {
		return { status: "unavailable", reason: "No transcript available to summarize." };
	}

	const result = await promptLocalModelForJson({
		prompt: `Write a concise 2-3 sentence summary of this screen recording's transcript:\n\n${transcript}`,
		responseJSONSchema: SUMMARY_SCHEMA,
		validate: isValidSummary,
	});
	if (result.ok) {
		return {
			status: "ok",
			result: { tier: "tier-2-multimodal-local", confidence: 0.7, data: result.data },
		};
	}

	return { status: "unavailable", reason: result.reason };
}
