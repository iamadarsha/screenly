import type { CaptionCue } from "@/components/video-editor/types";
import { promptLocalModelForJson } from "./localModelProvider";
import type { ReasoningOutcome } from "./reasoningOutcome";
import { buildTranscriptText } from "./transcriptText";

export interface AiTranslationResult {
	translatedCues: Array<{ id: string; text: string }>;
	targetLanguage: string;
}

/** RTL language ISO codes that require `dir="rtl"` on the caption container. */
const RTL_LANGUAGES = new Set([
	"ar", "he", "fa", "ur", "ps", "sd", "yi", "dv", "ku", "ug",
]);

export function isRtlLanguage(code: string): boolean {
	return RTL_LANGUAGES.has(code.split("-")[0].toLowerCase());
}

const MIN_TRANSLATION_COVERAGE = 0.8;

const TRANSLATION_SCHEMA = {
	type: "object",
	properties: {
		translations: {
			type: "array",
			items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"] },
		},
	},
	required: ["translations"],
};

function isValidTranslation(data: unknown): data is { translations: Array<{ id: string; text: string }> } {
	if (!data || typeof data !== "object" || !("translations" in data)) return false;
	const arr = (data as { translations: unknown }).translations;
	return Array.isArray(arr) && arr.length > 0 && arr.every(
		(item) =>
			typeof item === "object" && item !== null &&
			"id" in item && "text" in item &&
			typeof item.id === "string" && typeof item.text === "string",
	);
}

/**
 * Supported target languages for caption translation.
 * The UI shows these in a dropdown; the heuristic fallback uses a simple
 * dictionary lookup for the first few hundred common words.
 */
export const TRANSLATION_TARGETS = [
	{ code: "es", label: "Spanish" },
	{ code: "fr", label: "French" },
	{ code: "de", label: "German" },
	{ code: "pt", label: "Portuguese" },
	{ code: "ja", label: "Japanese" },
	{ code: "ko", label: "Korean" },
	{ code: "zh", label: "Chinese (Simplified)" },
	{ code: "ar", label: "Arabic" },
	{ code: "hi", label: "Hindi" },
	{ code: "it", label: "Italian" },
] as const;

/**
 * Translate captions to a target language.
 * Uses the local Gemma model only. There is deliberately NO heuristic fallback:
 * a word-by-word dictionary swap is not a translation, so without the model the
 * feature reports "unavailable" instead of producing broken text.
 * Model output is validated against the real cue ids before it is trusted.
 */
export async function translateCaptionsWithAi(
	cues: CaptionCue[],
	targetLanguage: string,
): Promise<ReasoningOutcome<AiTranslationResult>> {
	const transcript = buildTranscriptText(cues);
	if (!transcript) {
		return { status: "unavailable", reason: "No transcript text available to translate." };
	}

	// Build a compact JSON representation of cues for the prompt
	const cueList = cues.map((c) => ({ id: c.id, text: c.text }));

	const langLabel = TRANSLATION_TARGETS.find((t) => t.code === targetLanguage)?.label ?? targetLanguage;

	// Output size scales with cue count (one translated string per cue), unlike chapters/title/
	// summary whose output is small regardless of transcript length — the default 30s budget
	// used elsewhere is too tight once there are more than a handful of cues.
	const timeoutMs = Math.min(180_000, 30_000 + cueList.length * 4_000);

	const result = await promptLocalModelForJson({
		prompt: `Translate each caption cue below to ${langLabel}. Return JSON with "translations" array, each item having "id" (same cue id) and "text" (translated text). Preserve original timing — only translate the text content.\n\nCues:\n${JSON.stringify(cueList)}`,
		responseJSONSchema: TRANSLATION_SCHEMA,
		validate: isValidTranslation,
		timeoutMs,
	});

	if (result.ok) {
		const known = new Map(cues.map((cue) => [cue.id, cue.text]));
		const translated = new Map<string, string>();
		for (const item of result.data.translations) {
			const text = item.text.trim();
			if (known.has(item.id) && text.length > 0 && text.length <= known.get(item.id)!.length * 6 + 40) {
				translated.set(item.id, text);
			}
		}
		if (translated.size < Math.ceil(cues.length * MIN_TRANSLATION_COVERAGE)) {
			return {
				status: "unavailable",
				reason: "The local model returned an incomplete or invalid translation. Try again.",
			};
		}
		return {
			status: "ok",
			result: {
				tier: "tier-2-multimodal-local",
				confidence: 0.75,
				data: {
					// Cues the model skipped keep their original text so applying never drops captions.
					translatedCues: cues.map((cue) => ({
						id: cue.id,
						text: translated.get(cue.id) ?? cue.text,
					})),
					targetLanguage,
				},
			},
		};
	}

	return {
		status: "unavailable",
		reason: `Translation to ${langLabel} requires the local AI model. Download it from AI Tools.`,
	};
}
