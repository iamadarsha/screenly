import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Check, MagnifyingGlassPlus, Play, StarShine, X } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PresentationSuggestionKind } from "./presentationSuggestions";
import {
	canApplySuggestionKind,
	type PresentationSuggestionsReview,
} from "./usePresentationSuggestionsReview";

function formatSuggestionTime(ms: number) {
	const totalSeconds = Math.max(0, Math.round(ms / 1000));
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const KIND_LABELS: Record<PresentationSuggestionKind, string> = {
	zoom: "Zoom",
	"camera-layout": "Camera layout",
	"cursor-emphasis": "Cursor emphasis",
	"click-effect": "Click effect",
	"shortcut-overlay": "Shortcut overlay",
	"timeline-flag": "Timeline flag",
	"emphasis-moment": "Emphasis moment",
	"chapter-marker": "Chapter marker",
	"scene-transition": "Scene transition",
	"focus-region": "Focus region",
};

function confidenceLabel(confidence: number) {
	const percent = Math.round(confidence * 100);
	const tone =
		confidence >= 0.75
			? "text-emerald-500 bg-emerald-500/10"
			: confidence >= 0.55
				? "text-amber-500 bg-amber-500/10"
				: "text-muted-foreground bg-foreground/10";
	return { percent, tone };
}

type Props = {
	review: PresentationSuggestionsReview;
	disabled?: boolean;
	triggerTitle: string;
};

export function PresentationSuggestionsPanel({ review, disabled, triggerTitle }: Props) {
	const {
		isOpen,
		items,
		generationStatus,
		applicablePendingCount,
		generate,
		acceptSuggestion,
		rejectSuggestion,
		acceptAllPending,
		rejectAllPending,
		previewSuggestion,
		close,
	} = review;

	const emptyMessage =
		generationStatus === "no-telemetry"
			? "This recording doesn't have enough cursor movement data to generate suggestions."
			: generationStatus === "no-interactions"
				? "No clear interaction moments were found. Try a recording with pauses or clicks around important actions."
				: null;

	return (
		<Popover
			open={isOpen}
			onOpenChange={(open) => {
				if (open) generate();
				else close();
			}}
			modal={true}
		>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-9 w-9"
					title={triggerTitle}
					disabled={disabled}
				>
					<StarShine className="h-4 w-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				aria-label={triggerTitle}
				align="center"
				sideOffset={10}
				className="w-[380px] p-0"
			>
				<Card className="rounded-none bg-transparent shadow-none">
					<Card.Header className="p-5 pb-3">
						<Card.Title className="text-sm">Make This Recording Look Better</Card.Title>
						{items.length > 0 && (
							<p className="text-xs text-muted-foreground">
								{items.length} suggestion{items.length === 1 ? "" : "s"} found
							</p>
						)}
					</Card.Header>
					<Card.Content className="max-h-[360px] gap-2 overflow-y-auto p-5 pt-0">
						{emptyMessage ? (
							<p className="text-xs text-muted-foreground">{emptyMessage}</p>
						) : (
							items.map((item) => {
								const { percent, tone } = confidenceLabel(item.confidence);
								const applicable = canApplySuggestionKind(item.kind);
								const resolved = item.status !== "pending";
								return (
									<div
										key={item.id}
										className={`flex flex-col gap-1.5 rounded-lg border border-foreground/10 p-3 ${
											item.status === "rejected" ? "opacity-50" : ""
										}`}
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-semibold text-foreground">
												{KIND_LABELS[item.kind]}
											</span>
											{item.status === "rejected" ? (
												<span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
													Dismissed
												</span>
											) : (
												<span
													className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
												>
													{percent}%
												</span>
											)}
										</div>
										<p className="text-[11px] text-muted-foreground">
											{formatSuggestionTime(item.startMs)}
											{item.endMs !== item.startMs
												? ` – ${formatSuggestionTime(item.endMs)}`
												: ""}
										</p>
										<p className="text-[11px] leading-relaxed text-muted-foreground/90">
											{item.reason}
										</p>
										{!applicable && (
											<p className="text-[10px] italic text-muted-foreground/60">
												Preview only — SCREENLY can't apply this kind of
												suggestion yet.
											</p>
										)}
										<div className="mt-1 flex gap-1.5">
											<Button
												variant="outline"
												size="sm"
												className="h-7 flex-1 text-[11px]"
												onClick={() => previewSuggestion(item.id)}
											>
												<Play className="h-3 w-3" />
												Preview
											</Button>
											<Button
												size="sm"
												className="h-7 flex-1 text-[11px]"
												disabled={!applicable || resolved}
												onClick={() => acceptSuggestion(item.id)}
											>
												<Check className="h-3 w-3" />
												{item.status === "accepted" ? "Accepted" : "Accept"}
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="h-7 w-7 shrink-0 px-0"
												disabled={resolved}
												title="Dismiss"
												onClick={() => rejectSuggestion(item.id)}
											>
												<X className="h-3 w-3" />
											</Button>
										</div>
									</div>
								);
							})
						)}
					</Card.Content>
					{items.length > 0 && (
						<Card.Footer className="flex gap-2 p-5 pt-0">
							<Button
								variant="outline"
								size="sm"
								className="h-8 flex-1 text-xs"
								onClick={rejectAllPending}
							>
								Dismiss all
							</Button>
							<Button
								size="sm"
								className="h-8 flex-1 text-xs"
								disabled={applicablePendingCount === 0}
								onClick={acceptAllPending}
							>
								<MagnifyingGlassPlus className="h-3.5 w-3.5" />
								Accept all ({applicablePendingCount})
							</Button>
						</Card.Footer>
					)}
				</Card>
			</PopoverContent>
		</Popover>
	);
}
