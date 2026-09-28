import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "@/components/ui/icons";
import { useScopedT } from "@/contexts/I18nContext";
import type { CaptionEditTarget, CaptionEditWordRef } from "./captionEditing";
import { normalizeCaptionWords } from "./captionEditing";
import { sortCaptionCues } from "./captionOps";
import {
	detectFillerWords,
	detectRepeatedPhrases,
	type RepeatedPhraseMatch,
} from "./transcriptEditing";
import type { CaptionCue } from "./types";

interface FlatWord {
	cueId: string;
	cueWordIndex: number;
	flatIndex: number;
	text: string;
	startMs: number;
	endMs: number;
	leadingSpace: boolean;
}

interface TranscriptPanelProps {
	cues: CaptionCue[];
	onDeleteWordRange: (target: CaptionEditTarget) => void;
	onRemoveSilenceRegions?: (intervals: Array<{ startMs: number; endMs: number }>) => void;
	onSeekToMs?: (sourceMs: number) => void;
	currentSourceTimeMs?: number;
}

function flattenWords(cues: CaptionCue[]): FlatWord[] {
	const sorted = sortCaptionCues(cues);
	const flat: FlatWord[] = [];
	let flatIndex = 0;
	for (const cue of sorted) {
		const words = normalizeCaptionWords(cue);
		words.forEach((word, cueWordIndex) => {
			flat.push({
				cueId: cue.id,
				cueWordIndex,
				flatIndex: flatIndex++,
				text: word.text,
				startMs: word.startMs,
				endMs: word.endMs,
				leadingSpace: Boolean(word.leadingSpace),
			});
		});
	}
	return flat;
}

export function TranscriptPanel({
	cues,
	onDeleteWordRange,
	onRemoveSilenceRegions,
	onSeekToMs,
	currentSourceTimeMs,
}: TranscriptPanelProps) {
	const t = useScopedT("settings");
	const [anchorFlatIndex, setAnchorFlatIndex] = useState<number | null>(null);
	const [selectedFlatIndexes, setSelectedFlatIndexes] = useState<Set<number>>(new Set());
	const [silenceIntervals, setSilenceIntervals] = useState<Array<{ startMs: number; endMs: number }>>([]);
	const [detectingSilence, setDetectingSilence] = useState(false);

	const flatWords = useMemo(() => flattenWords(cues), [cues]);
	const fillerMatches = useMemo(() => detectFillerWords(cues), [cues]);
	const fillerFlatIndexes = useMemo(() => {
		const byCueWord = new Set(fillerMatches.map((m) => `${m.cueId}:${m.cueWordIndex}`));
		return new Set(
			flatWords.filter((w) => byCueWord.has(`${w.cueId}:${w.cueWordIndex}`)).map((w) => w.flatIndex),
		);
	}, [fillerMatches, flatWords]);
	const repeatedPhraseMatches = useMemo(() => detectRepeatedPhrases(cues), [cues]);
	const repeatedFlatIndexes = useMemo(() => {
		const byCueWord = new Set<string>();
		for (const match of repeatedPhraseMatches) {
			for (let i = match.firstStartIndex; i < match.firstEndIndexExclusive; i += 1) {
				byCueWord.add(`${match.cueId}:${i}`);
			}
		}
		return new Set(
			flatWords.filter((w) => byCueWord.has(`${w.cueId}:${w.cueWordIndex}`)).map((w) => w.flatIndex),
		);
	}, [flatWords, repeatedPhraseMatches]);

	const handleDetectSilence = useCallback(async () => {
		if (!window.electronAPI?.detectSilenceRegions) return;
		setDetectingSilence(true);
		try {
			// Use the first clip's source path if available
			const videoPath = (window as unknown as { __screenly_video_path?: string }).__screenly_video_path;
			if (!videoPath) {
				setSilenceIntervals([]);
				return;
			}
			const result = await window.electronAPI.detectSilenceRegions(videoPath, 500);
			if (result.success && result.intervals.length > 0) {
				setSilenceIntervals(result.intervals);
			} else {
				setSilenceIntervals([]);
			}
		} catch {
			setSilenceIntervals([]);
		} finally {
			setDetectingSilence(false);
		}
	}, []);

	const handleRemoveAllSilence = useCallback(() => {
		if (silenceIntervals.length === 0 || !onRemoveSilenceRegions) return;
		onRemoveSilenceRegions(silenceIntervals);
		setSilenceIntervals([]);
	}, [silenceIntervals, onRemoveSilenceRegions]);

	if (flatWords.length === 0) {
		return (
			<div className="rounded-lg bg-foreground/[0.03] px-2.5 py-6 text-center">
				<p className="text-xs text-muted-foreground">
					{t("captions.transcript.empty", "No transcript yet — generate captions first.")}
				</p>
			</div>
		);
	}

	const selectWord = (word: FlatWord, extend: boolean) => {
		if (!extend || anchorFlatIndex === null) {
			setAnchorFlatIndex(word.flatIndex);
			setSelectedFlatIndexes(new Set([word.flatIndex]));
			onSeekToMs?.(word.startMs);
			return;
		}
		const [lo, hi] =
			anchorFlatIndex <= word.flatIndex
				? [anchorFlatIndex, word.flatIndex]
				: [word.flatIndex, anchorFlatIndex];
		const next = new Set<number>();
		for (let i = lo; i <= hi; i += 1) next.add(i);
		setSelectedFlatIndexes(next);
		onSeekToMs?.(word.startMs);
	};

	const handleWordDoubleClick = (word: FlatWord) => {
		const cueWords = flatWords.filter((w) => w.cueId === word.cueId);
		if (cueWords.length === 0) return;
		const next = new Set<number>(cueWords.map((w) => w.flatIndex));
		setAnchorFlatIndex(cueWords[0].flatIndex);
		setSelectedFlatIndexes(next);
		onSeekToMs?.(cueWords[0].startMs);
	};

	const clearSelection = () => {
		setAnchorFlatIndex(null);
		setSelectedFlatIndexes(new Set());
	};

	const buildTargetFromFlatIndexes = (flatIndexes: Set<number>): CaptionEditTarget | null => {
		const words = flatWords.filter((w) => flatIndexes.has(w.flatIndex));
		if (words.length === 0) return null;
		const wordRefs: CaptionEditWordRef[] = words.map((w) => ({
			cueId: w.cueId,
			cueWordIndex: w.cueWordIndex,
			startMs: w.startMs,
			endMs: w.endMs,
			text: w.text,
			leadingSpace: w.leadingSpace,
		}));
		return {
			id: words[0].cueId,
			startMs: words[0].startMs,
			endMs: words[words.length - 1].endMs,
			text: words.map((w) => w.text).join(" "),
			words: wordRefs,
		};
	};

	const handleDeleteSelected = () => {
		const target = buildTargetFromFlatIndexes(selectedFlatIndexes);
		if (!target) return;
		onDeleteWordRange(target);
		clearSelection();
	};

	const handleRemoveSingleFiller = (match: { cueId: string; cueWordIndex: number }) => {
		const word = flatWords.find(
			(w) => w.cueId === match.cueId && w.cueWordIndex === match.cueWordIndex,
		);
		if (!word) return;
		const target = buildTargetFromFlatIndexes(new Set([word.flatIndex]));
		if (target) {
			onDeleteWordRange(target);
			clearSelection();
		}
	};

	const handleRemoveRepeatedPhrase = (match: RepeatedPhraseMatch) => {
		const indexes = new Set<number>();
		for (let i = match.firstStartIndex; i < match.firstEndIndexExclusive; i += 1) {
			const word = flatWords.find((w) => w.cueId === match.cueId && w.cueWordIndex === i);
			if (word) indexes.add(word.flatIndex);
		}
		const target = buildTargetFromFlatIndexes(indexes);
		if (target) onDeleteWordRange(target);
	};

	return (
		<div className="flex flex-col gap-3">
			<div
				tabIndex={0}
				role="region"
				aria-label={t("captions.transcript.title", "Transcript editor")}
				onKeyDown={(e) => {
					if (e.key === "Backspace" || e.key === "Delete") {
						if (selectedFlatIndexes.size > 0) {
							e.preventDefault();
							handleDeleteSelected();
						}
					}
				}}
				className="max-h-[280px] overflow-y-auto rounded-lg bg-foreground/[0.03] p-3 text-sm leading-relaxed outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB]/50"
			>
				{flatWords.map((word) => {
					const isSelected = selectedFlatIndexes.has(word.flatIndex);
					const isFiller = fillerFlatIndexes.has(word.flatIndex);
					const isRepeated = repeatedFlatIndexes.has(word.flatIndex);
					const isCurrent =
						currentSourceTimeMs !== undefined &&
						currentSourceTimeMs >= word.startMs &&
						currentSourceTimeMs < word.endMs;
					return (
						<span key={word.flatIndex}>
							{word.leadingSpace ? " " : ""}
							<button
								type="button"
								onClick={(event) => selectWord(word, event.shiftKey)}
								onDoubleClick={() => handleWordDoubleClick(word)}
								className={[
									"rounded px-0.5 py-0.5 transition-colors cursor-pointer",
									isSelected
										? "bg-[#2563EB] text-white"
										: isCurrent
											? "bg-[#2563EB]/20 text-[#2563EB] dark:text-blue-400 font-medium ring-1 ring-[#2563EB]/40"
											: isFiller
												? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
												: isRepeated
													? "bg-orange-500/15 underline decoration-orange-500/60 decoration-2 underline-offset-2"
													: "text-foreground hover:bg-foreground/10",
								].join(" ")}
								title={
									isFiller
										? t("captions.transcript.fillerWord", "Filler word — click to select")
										: isRepeated
											? t("captions.transcript.repeatedPhrase", "Possible false start")
											: undefined
								}
							>
								{word.text}
							</button>
						</span>
					);
				})}
			</div>

			{fillerMatches.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
						{t("captions.transcript.fillerWords", "Detected filler words")} ({fillerMatches.length})
					</span>
					<div className="flex flex-wrap gap-1.5">
						{fillerMatches.map((match, i) => (
							<Button
								key={`${match.cueId}-${match.cueWordIndex}-${i}`}
								type="button"
								variant="ghost"
								size="sm"
								className="h-6 gap-1 px-2 text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
								onClick={() => handleRemoveSingleFiller(match)}
								title={t("captions.transcript.removeFiller", "Delete filler word & ripple")}
							>
								<span>"{match.text}"</span>
								<Trash className="h-2.5 w-2.5 opacity-70" />
							</Button>
						))}
					</div>
				</div>
			)}

			{repeatedPhraseMatches.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
						{t("captions.transcript.possibleFalseStarts", "Possible false starts")}
					</span>
					{repeatedPhraseMatches.map((match) => (
						<div
							key={`${match.cueId}-${match.firstStartIndex}`}
							className="flex items-center justify-between gap-2 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5"
						>
							<span className="truncate text-xs text-muted-foreground">"{match.phrase}"</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 shrink-0 text-[11px]"
								onClick={() => handleRemoveRepeatedPhrase(match)}
							>
								{t("captions.transcript.removeRepeat", "Remove repeat")}
							</Button>
						</div>
					))}
				</div>
			)}

			{onRemoveSilenceRegions && (
				<div className="flex flex-col gap-1.5">
					<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
						{t("captions.transcript.silenceDetection", "Silence Detection")}
					</span>
					{silenceIntervals.length === 0 ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 w-full text-xs"
							disabled={detectingSilence}
							onClick={handleDetectSilence}
						>
							{detectingSilence
								? t("captions.transcript.detectingSilence", "Detecting…")
								: t("captions.transcript.detectSilence", "Detect Silent Pauses")}
						</Button>
					) : (
						<div className="flex items-center justify-between gap-2 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5">
							<span className="text-xs text-muted-foreground">
								{t("captions.transcript.silenceFound", "{{count}} pause(s) found", {
									count: silenceIntervals.length,
								})}
							</span>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								className="h-7 shrink-0 gap-1 text-[11px]"
								onClick={handleRemoveAllSilence}
							>
								<Trash className="h-2.5 w-2.5" />
								{t("captions.transcript.removeSilences", "Remove All")}
							</Button>
						</div>
					)}
				</div>
			)}

			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground">
					{selectedFlatIndexes.size > 0
						? t("captions.transcript.wordsSelected", "{{count}} word(s) selected", {
								count: selectedFlatIndexes.size,
							})
						: t(
								"captions.transcript.selectHint",
								"Click a word, or shift-click to select a range.",
							)}
				</span>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					disabled={selectedFlatIndexes.size === 0}
					onClick={handleDeleteSelected}
					className="h-8 gap-1.5 text-xs"
				>
					<Trash className="h-3 w-3" />
					{t("captions.transcript.deleteSelection", "Delete & ripple")}
				</Button>
			</div>
		</div>
	);
}
