import { useCallback, useEffect, useState } from "react";
import { generateChaptersWithAi } from "@/lib/ai/aiChapters";
import { generateSummaryWithAi } from "@/lib/ai/aiSummary";
import { generateTitleWithAi } from "@/lib/ai/aiTitle";
import { resetLocalModelReadyState } from "@/lib/ai/localModelProvider";
import type { ChapterMarker } from "@/lib/ai/chapterHeuristics";
import { Button } from "@/components/ui/button";
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
}

type FeatureState<T> =
	| { phase: "idle" }
	| { phase: "running" }
	| { phase: "done"; tier: string; data: T }
	| { phase: "unavailable"; reason: string };

export function AiToolsPanel({ cues }: AiToolsPanelProps) {
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
		</div>
	);
}
