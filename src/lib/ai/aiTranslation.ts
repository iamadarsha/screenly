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
 * Minimal word-level dictionary for tier-0 heuristic translation.
 * Only covers the top ~80 English words → Spanish. Enough to provide
 * a partial translation rather than nothing.
 */
const HEURISTIC_DICT_ES: Record<string, string> = {
	the: "el", a: "un", is: "es", are: "son", was: "fue", were: "eran",
	and: "y", or: "o", but: "pero", not: "no", this: "esto", that: "eso",
	it: "ello", in: "en", on: "en", at: "a", to: "a", for: "para",
	of: "de", with: "con", from: "de", by: "por", as: "como", be: "ser",
	have: "tener", do: "hacer", will: "va", would: "haría", can: "puede",
	should: "debería", i: "yo", you: "tú", he: "él", she: "ella", we: "nosotros",
	they: "ellos", my: "mi", your: "tu", his: "su", her: "su", our: "nuestro",
	their: "su", here: "aquí", there: "allí", now: "ahora", then: "entonces",
	yes: "sí", no: "no", so: "así", if: "si", all: "todo", more: "más",
	some: "algunos", how: "cómo", what: "qué", when: "cuándo", where: "dónde",
	who: "quién", which: "cuál", why: "por qué", very: "muy", also: "también",
	just: "solo", about: "sobre", like: "como", go: "ir", see: "ver",
	know: "saber", get: "obtener", make: "hacer", say: "decir", take: "tomar",
	come: "venir", think: "pensar", look: "mirar", want: "querer", give: "dar",
	use: "usar", find: "encontrar", tell: "decir", work: "trabajar", call: "llamar",
	try: "intentar", ask: "preguntar", need: "necesitar", feel: "sentir", become: "convertirse",
	leave: "salir", put: "poner", mean: "significar", keep: "mantener", let: "dejar",
	begin: "empezar", show: "mostrar", hear: "oír", play: "jugar", run: "correr",
	move: "mover", live: "vivir", believe: "creer", hold: "sostener", bring: "traer",
	happen: "suceder", write: "escribir", provide: "proporcionar", sit: "sentarse", stand: "pararse",
	today: "hoy", click: "clic", screen: "pantalla", video: "video", button: "botón",
};

function heuristicTranslateWord(word: string): string {
	const lower = word.toLowerCase().replace(/[.,!?;:'"()]/g, "");
	const translated = HEURISTIC_DICT_ES[lower];
	if (!translated) return word; // leave untranslated
	// Preserve original casing
	if (word[0] === word[0].toUpperCase()) {
		return translated.charAt(0).toUpperCase() + translated.slice(1);
	}
	return translated;
}

/**
 * Translate captions to a target language.
 * Tier 2: Uses local Gemma 4 model for real translation.
 * Tier 0: Falls back to word-by-word dictionary lookup (Spanish only).
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

	const result = await promptLocalModelForJson({
		prompt: `Translate each caption cue below to ${langLabel}. Return JSON with "translations" array, each item having "id" (same cue id) and "text" (translated text). Preserve original timing — only translate the text content.\n\nCues:\n${JSON.stringify(cueList)}`,
		responseJSONSchema: TRANSLATION_SCHEMA,
		validate: isValidTranslation,
	});

	if (result.ok) {
		return {
			status: "ok",
			result: {
				tier: "tier-2-multimodal-local",
				confidence: 0.75,
				data: {
					translatedCues: result.data.translations,
					targetLanguage,
				},
			},
		};
	}

	// Tier-0 heuristic: word-by-word dictionary (Spanish only)
	if (targetLanguage === "es") {
		const translatedCues = cues.map((cue) => ({
			id: cue.id,
			text: cue.text
				.split(/\s+/)
				.map(heuristicTranslateWord)
				.join(" "),
		}));
		return {
			status: "ok",
			result: {
				tier: "tier-0-heuristic",
				confidence: 0.2,
				data: { translatedCues, targetLanguage },
			},
		};
	}

	return {
		status: "unavailable",
		reason: `Translation to ${langLabel} requires the local AI model. Download it from AI Tools.`,
	};
}
