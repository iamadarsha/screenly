import type { CaptionCue } from "@/components/video-editor/types";
import { promptLocalModelForJson } from "./localModelProvider";
import type { ReasoningOutcome } from "./reasoningOutcome";
import { buildTranscriptText } from "./transcriptText";
import { generateChaptersWithAi } from "./aiChapters";
import type { ChapterMarker } from "./chapterHeuristics";

export interface PublishingPack {
	title: string;
	summary: string;
	tags: string[];
	chapters: ChapterMarker[];
	socialCopy: {
		twitter: string;
		linkedin: string;
	};
}

const SOCIAL_SCHEMA = {
	type: "object",
	properties: {
		title: { type: "string" },
		summary: { type: "string" },
		tags: { type: "array", items: { type: "string" } },
		twitter: { type: "string" },
		linkedin: { type: "string" },
	},
	required: ["title", "summary", "tags", "twitter", "linkedin"],
};

interface SocialResult {
	title: string;
	summary: string;
	tags: string[];
	twitter: string;
	linkedin: string;
}

function isValidSocialResult(data: unknown): data is SocialResult {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	return (
		typeof d.title === "string" && d.title.length > 0 &&
		typeof d.summary === "string" && d.summary.length > 0 &&
		Array.isArray(d.tags) && d.tags.length > 0 &&
		typeof d.twitter === "string" && d.twitter.length > 0 &&
		typeof d.linkedin === "string" && d.linkedin.length > 0
	);
}

/**
 * Heuristic-only publishing metadata from transcript words.
 * No AI needed — extracts the most frequent non-stopword tokens as tags,
 * uses the first sentence as a title, first paragraph as summary, etc.
 */
function heuristicPublishingPack(_cues: CaptionCue[], transcript: string, chapters: ChapterMarker[]): PublishingPack {
	const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
	const title = (sentences[0] ?? "Untitled recording").split(/\s+/).slice(0, 10).join(" ");
	const summary = sentences.slice(0, 3).join(". ") + ".";

	// Extract tags from word frequency (skip common stop words)
	const stopWords = new Set([
		"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
		"have", "has", "had", "do", "does", "did", "will", "would", "shall",
		"should", "can", "could", "may", "might", "must", "and", "but", "or",
		"nor", "for", "so", "yet", "to", "of", "in", "on", "at", "by", "with",
		"from", "as", "into", "through", "during", "before", "after", "above",
		"below", "between", "under", "again", "further", "then", "once", "here",
		"there", "when", "where", "why", "how", "all", "each", "every", "both",
		"few", "more", "most", "other", "some", "such", "no", "not", "only",
		"own", "same", "than", "too", "very", "just", "because", "if", "about",
		"that", "this", "it", "its", "i", "you", "he", "she", "we", "they",
		"them", "their", "my", "your", "his", "her", "our", "me", "him", "us",
		"what", "which", "who", "whom", "whose",
	]);
	const wordCounts = new Map<string, number>();
	for (const word of transcript.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/)) {
		if (word.length > 2 && !stopWords.has(word)) {
			wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
		}
	}
	const tags = [...wordCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([word]) => word);

	const maxChars = 280;
	const twitter = `📺 ${title}${tags.length > 0 ? `\n\n${tags.slice(0, 4).map((t) => `#${t}`).join(" ")}` : ""}`.slice(0, maxChars);
	const linkedin = `🎬 Check out my latest screen recording!\n\n${summary}\n\n${tags.slice(0, 5).map((t) => `#${t}`).join(" ")}`;

	return { title, summary, tags, chapters, socialCopy: { twitter, linkedin } };
}

/**
 * Generate a complete publishing pack: title, summary, tags, chapters, and
 * social media copy.
 *
 * Tier 2: Uses Gemma 4 for content-aware title/summary/tags/social copy.
 * Tier 0: Falls back to heuristic word-frequency analysis.
 */
export async function generatePublishingPackWithAi(
	cues: CaptionCue[],
): Promise<ReasoningOutcome<PublishingPack>> {
	const transcript = buildTranscriptText(cues);
	if (!transcript) {
		return { status: "unavailable", reason: "No transcript available for the publishing pack." };
	}

	const totalMs = cues.reduce((max, cue) => Math.max(max, cue.endMs), 0);

	// Always get chapters (they have their own fallback tier)
	const chaptersOutcome = await generateChaptersWithAi(cues, totalMs);
	const chapters = chaptersOutcome.status === "ok" ? chaptersOutcome.result.data : [];

	// Try AI-generated social/publishing metadata
	const result = await promptLocalModelForJson({
		prompt: `You are helping publish a screen recording video. Given this transcript, generate:
1. A short descriptive title (max 10 words)
2. A 2-3 sentence summary for the video description
3. 5-8 relevant tags (single lowercase words, no # prefix)
4. A Twitter/X post (max 280 chars, include 2-3 hashtags)
5. A LinkedIn post (professional tone, 2-3 paragraphs)

Transcript:
${transcript.slice(0, 2000)}`,
		responseJSONSchema: SOCIAL_SCHEMA,
		validate: isValidSocialResult,
	});

	if (result.ok) {
		return {
			status: "ok",
			result: {
				tier: "tier-2-multimodal-local",
				confidence: 0.7,
				data: {
					title: result.data.title,
					summary: result.data.summary,
					tags: result.data.tags,
					chapters,
					socialCopy: {
						twitter: result.data.twitter,
						linkedin: result.data.linkedin,
					},
				},
			},
		};
	}

	// Tier-0: heuristic fallback
	return {
		status: "ok",
		result: {
			tier: "tier-0-heuristic",
			confidence: 0.25,
			data: heuristicPublishingPack(cues, transcript, chapters),
		},
	};
}
