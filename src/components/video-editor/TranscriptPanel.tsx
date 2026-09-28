import { useMemo, useState } from "react";
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

export function TranscriptPanel({ cues, onDeleteWordRange }: TranscriptPanelProps) {
	const t = useScopedT("settings");
	const [anchorFlatIndex, setAnchorFlatIndex] = useState<number | null>(null);
	const [selectedFlatIndexes, setSelectedFlatIndexes] = useState<Set<number>>(new Set());

	const flatWords = useMemo(() => flattenWords(cues), [cues]);
	const fillerFlatIndexes = useMemo(() => {
		const matches = detectFillerWords(cues);
		const byCueWord = new Set(matches.map((m) => `${m.cueId}:${m.cueWordIndex}`));
		return new Set(
			flatWords.filter((w) => byCueWord.has(`${w.cueId}:${w.cueWordIndex}`)).map((w) => w.flatIndex),
		);
	}, [cues, flatWords]);
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
			return;
		}
		const [lo, hi] =
			anchorFlatIndex <= word.flatIndex
				? [anchorFlatIndex, word.flatIndex]
				: [word.flatIndex, anchorFlatIndex];
		const next = new Set<number>();
		for (let i = lo; i <= hi; i += 1) next.add(i);
		setSelectedFlatIndexes(next);
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
			<div className="max-h-[280px] overflow-y-auto rounded-lg bg-foreground/[0.03] p-3 text-sm leading-relaxed">
				{flatWords.map((word) => {
					const isSelected = selectedFlatIndexes.has(word.flatIndex);
					const isFiller = fillerFlatIndexes.has(word.flatIndex);
					const isRepeated = repeatedFlatIndexes.has(word.flatIndex);
					return (
						<span key={word.flatIndex}>
							{word.leadingSpace ? " " : ""}
							<button
								type="button"
								onClick={(event) => selectWord(word, event.shiftKey)}
								className={[
									"rounded px-0.5 py-0.5 transition-colors",
									isSelected
										? "bg-[#2563EB] text-white"
										: isFiller
											? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
											: isRepeated
												? "bg-orange-500/15 underline decoration-orange-500/60 decoration-2 underline-offset-2"
												: "text-foreground hover:bg-foreground/10",
								].join(" ")}
								title={
									isFiller
										? t("captions.transcript.fillerWord", "Filler word")
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
