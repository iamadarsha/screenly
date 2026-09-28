import { useCallback, useEffect, useState } from "react";
import { generateChaptersWithAi } from "@/lib/ai/aiChapters";
import { generateSummaryWithAi } from "@/lib/ai/aiSummary";
import { generateTitleWithAi } from "@/lib/ai/aiTitle";
import { translateCaptionsWithAi, TRANSLATION_TARGETS } from "@/lib/ai/aiTranslation";
import { generatePublishingPackWithAi, type PublishingPack } from "@/lib/ai/aiPublishingPack";
import { resetLocalModelReadyState } from "@/lib/ai/localModelProvider";
import type { ChapterMarker } from "@/lib/ai/chapterHeuristics";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@heroui/react";
import type { CaptionCue } from "./types";

type ModelStatus = "not-downloaded" | "downloaded" | "corrupted" | "checking";

function useAiModelStatus() {
	const [status, setStatus] = useState<ModelStatus>("checking");
	const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

	const refresh = useCallback(async () => {
		try {
			const result = await window.electronAPI.getAiModelStatus();
			setStatus(result.success ? result.status : "not-downloaded");
		} catch {
			setStatus("not-downloaded");
		}
	}, []);

	useEffect(() => {
		void refresh();
		return window.electronAPI.onAiModelDownloadProgress(({ progress }) => {
			setDownloadProgress(progress);
		});
	}, [refresh]);

	const download = async () => {
		setDownloadProgress(0);
		try {
			const result = await window.electronAPI.downloadAiModel();
			if (!result.success && !result.cancelled) {
				console.error("[ai] Model download failed:", result.error);
			}
		} finally {
			setDownloadProgress(null);
			resetLocalModelReadyState();
			await refresh();
		}
	};

	const cancelDownload = () => window.electronAPI.cancelAiModelDownload();

	const remove = async () => {
		await window.electronAPI.deleteAiModel();
		resetLocalModelReadyState();
		await refresh();
	};

	return { status, downloadProgress, download, cancelDownload, remove };
}

interface AiToolsPanelProps {
	cues: CaptionCue[];
	onApplyTranslation?: (translated: Array<{id: string; text: string}>) => void;
}

type FeatureState<T> =
	| { phase: "idle" }
	| { phase: "running" }
	| { phase: "done"; tier: string; data: T }
	| { phase: "unavailable"; reason: string };

export function AiToolsPanel({ cues, onApplyTranslation }: AiToolsPanelProps) {
	const model = useAiModelStatus();
	const [chapters, setChapters] = useState<FeatureState<ChapterMarker[]>>({ phase: "idle" });
	const [title, setTitle] = useState<FeatureState<{ title: string }>>({ phase: "idle" });
	const [summary, setSummary] = useState<FeatureState<{ summary: string }>>({ phase: "idle" });

	const totalMs = cues.reduce((max, cue) => Math.max(max, cue.endMs), 0);

	const runChapters = async () => {
		setChapters({ phase: "running" });
		const outcome = await generateChaptersWithAi(cues, totalMs);
		setChapters(
			outcome.status === "ok"
				? { phase: "done", tier: outcome.result.tier, data: outcome.result.data }
				: { phase: "unavailable", reason: outcome.reason },
		);
	};

	const runTitle = async () => {
		setTitle({ phase: "running" });
		const outcome = await generateTitleWithAi(cues);
		setTitle(
			outcome.status === "ok"
				? { phase: "done", tier: outcome.result.tier, data: outcome.result.data }
				: { phase: "unavailable", reason: outcome.reason },
		);
	};

	const runSummary = async () => {
		setSummary({ phase: "running" });
		const outcome = await generateSummaryWithAi(cues);
		setSummary(
			outcome.status === "ok"
				? { phase: "done", tier: outcome.result.tier, data: outcome.result.data }
				: { phase: "unavailable", reason: outcome.reason },
		);
	};

	const [pack, setPack] = useState<FeatureState<PublishingPack>>({ phase: "idle" });
	const runPack = async () => {
		setPack({ phase: "running" });
		const outcome = await generatePublishingPackWithAi(cues);
		setPack(
			outcome.status === "ok"
				? { phase: "done", tier: outcome.result.tier, data: outcome.result.data }
				: { phase: "unavailable", reason: outcome.reason },
		);
	};

	const [translationLang, setTranslationLang] = useState<string>("es");
	const [translation, setTranslation] = useState<FeatureState<{ cues: Array<{ id: string; text: string }>; lang: string }>>({ phase: "idle" });
	const runTranslation = async () => {
		setTranslation({ phase: "running" });
		const outcome = await translateCaptionsWithAi(cues, translationLang);
		setTranslation(
			outcome.status === "ok"
				? { phase: "done", tier: outcome.result.tier, data: { cues: outcome.result.data.translatedCues, lang: outcome.result.data.targetLanguage } }
				: { phase: "unavailable", reason: outcome.reason },
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="mb-1 text-sm font-medium text-foreground">AI Tools</div>

			<div className="flex flex-col gap-2 rounded-lg bg-foreground/[0.03] p-3">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">
						{model.status === "checking" && "Checking local AI model…"}
						{model.status === "not-downloaded" &&
							"Local AI model not downloaded (~4.3 GB). AI features fall back to heuristics."}
						{model.status === "downloaded" && "Local AI model ready (Gemma 4 E4B)."}
						{model.status === "corrupted" &&
							"Local AI model file failed verification — please re-download."}
					</span>
					{model.status === "downloaded" ? (
						<Button variant="outline" size="sm" className="h-7 shrink-0 text-[11px]" onClick={model.remove}>
							Delete
						</Button>
					) : model.downloadProgress === null ? (
						<Button
							size="sm"
							className="h-7 shrink-0 text-[11px]"
							onClick={model.download}
							disabled={model.status === "checking"}
						>
							Download
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="h-7 shrink-0 text-[11px]"
							onClick={model.cancelDownload}
						>
							Cancel
						</Button>
					)}
				</div>
				{model.downloadProgress !== null && (
					<ProgressBar aria-label="Downloading AI model" value={model.downloadProgress}>
						<ProgressBar.Track>
							<ProgressBar.Fill />
						</ProgressBar.Track>
					</ProgressBar>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-foreground">Chapters</span>
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						disabled={cues.length === 0 || chapters.phase === "running"}
						onClick={runChapters}
					>
						{chapters.phase === "running" ? "Generating…" : "Suggest chapters"}
					</Button>
				</div>
				{chapters.phase === "done" && (
					<div className="rounded-lg bg-foreground/[0.03] p-2 text-xs text-muted-foreground">
						<span className="text-[10px] uppercase tracking-wide opacity-60">
							{chapters.tier === "tier-2-multimodal-local" ? "AI-generated" : "Heuristic"}
						</span>
						<ul className="mt-1 flex flex-col gap-0.5">
							{chapters.data.map((chapter) => (
								<li key={chapter.id}>
									{Math.round(chapter.atMs / 1000)}s — {chapter.title}
								</li>
							))}
						</ul>
					</div>
				)}
				{chapters.phase === "unavailable" && (
					<p className="text-[11px] text-muted-foreground/70">{chapters.reason}</p>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-foreground">Title</span>
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						disabled={cues.length === 0 || title.phase === "running"}
						onClick={runTitle}
					>
						{title.phase === "running" ? "Generating…" : "Suggest title"}
					</Button>
				</div>
				{title.phase === "done" && (
					<p className="rounded-lg bg-foreground/[0.03] p-2 text-xs text-muted-foreground">
						<span className="mr-1 text-[10px] uppercase tracking-wide opacity-60">
							{title.tier === "tier-2-multimodal-local" ? "AI" : "Heuristic"}
						</span>
						{title.data.title}
					</p>
				)}
				{title.phase === "unavailable" && (
					<p className="text-[11px] text-muted-foreground/70">{title.reason}</p>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-foreground">Summary</span>
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						disabled={cues.length === 0 || summary.phase === "running"}
						onClick={runSummary}
					>
						{summary.phase === "running" ? "Generating…" : "Summarize"}
					</Button>
				</div>
				{summary.phase === "done" && (
					<p className="rounded-lg bg-foreground/[0.03] p-2 text-xs text-muted-foreground">
						{summary.data.summary}
					</p>
				)}
				{summary.phase === "unavailable" && (
					<p className="text-[11px] text-muted-foreground/70">{summary.reason}</p>
				)}
			</div>

			<div className="flex flex-col gap-2 border-t border-border/50 pt-2">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-medium text-foreground">Translation</span>
						<Select value={translationLang} onValueChange={setTranslationLang}>
							<SelectTrigger className="h-7 w-[120px] text-[11px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TRANSLATION_TARGETS.map((t) => (
									<SelectItem key={t.code} value={t.code} className="text-[11px]">
										{t.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="h-7 w-full text-[11px]"
						disabled={cues.length === 0 || translation.phase === "running"}
						onClick={runTranslation}
					>
						{translation.phase === "running" ? "Translating…" : "Translate Captions"}
					</Button>
				</div>
				{translation.phase === "done" && (
					<div className="rounded-lg bg-foreground/[0.03] p-2 text-xs text-muted-foreground">
						<span className="text-[10px] uppercase tracking-wide opacity-60">
							{translation.tier === "tier-2-multimodal-local" ? "AI Translation" : "Heuristic"} ({translation.data.lang})
						</span>
						<div className="mt-1 max-h-32 overflow-y-auto pr-1">
							{translation.data.cues.slice(0, 3).map((c) => (
								<p key={c.id} className="mb-1 truncate">{c.text}</p>
							))}
							{translation.data.cues.length > 3 && (
								<p className="text-center text-[10px] italic opacity-60">...and {translation.data.cues.length - 3} more</p>
							)}
						</div>
						{onApplyTranslation && (
							<Button
								variant="default"
								size="sm"
								className="mt-2 h-7 w-full text-[11px]"
								onClick={() => onApplyTranslation(translation.data.cues)}
							>
								Apply to Timeline
							</Button>
						)}
					</div>
				)}
				{translation.phase === "unavailable" && (
					<p className="text-[11px] text-muted-foreground/70">{translation.reason}</p>
				)}
			</div>

			<div className="flex flex-col gap-2 border-t border-border/50 pt-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-foreground">Publishing Pack</span>
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						disabled={cues.length === 0 || pack.phase === "running"}
						onClick={runPack}
					>
						{pack.phase === "running" ? "Generating…" : "Generate Pack"}
					</Button>
				</div>
				{pack.phase === "done" && (
					<div className="flex flex-col gap-2 rounded-lg bg-foreground/[0.03] p-2 text-xs text-muted-foreground">
						<span className="text-[10px] uppercase tracking-wide opacity-60">
							{pack.tier === "tier-2-multimodal-local" ? "AI Generated" : "Heuristic"}
						</span>
						<div>
							<strong className="block text-[10px] uppercase tracking-wider">Title</strong>
							{pack.data.title}
						</div>
						<div>
							<strong className="block text-[10px] uppercase tracking-wider">Tags</strong>
							<div className="flex flex-wrap gap-1">
								{pack.data.tags.map((tag) => (
									<span key={tag} className="rounded-sm bg-foreground/5 px-1 py-0.5 text-[10px]">#{tag}</span>
								))}
							</div>
						</div>
						{pack.data.summary ? (
							<div>
								<strong className="block text-[10px] uppercase tracking-wider">Summary</strong>
								<p className="whitespace-pre-wrap">{pack.data.summary}</p>
							</div>
						) : null}
						{pack.data.socialCopy.twitter ? (
							<div>
								<strong className="block text-[10px] uppercase tracking-wider">Twitter</strong>
								<p className="whitespace-pre-wrap">{pack.data.socialCopy.twitter}</p>
							</div>
						) : null}
						{pack.data.socialCopy.linkedin ? (
							<div>
								<strong className="block text-[10px] uppercase tracking-wider">LinkedIn</strong>
								<p className="whitespace-pre-wrap">{pack.data.socialCopy.linkedin}</p>
							</div>
						) : null}
						{!pack.data.summary && !pack.data.socialCopy.twitter ? (
							<p className="text-[11px] text-muted-foreground/70">
								Summary and social copy need the local AI model.
							</p>
						) : null}
					</div>
				)}
				{pack.phase === "unavailable" && (
					<p className="text-[11px] text-muted-foreground/70">{pack.reason}</p>
				)}
			</div>
		</div>
	);
}
