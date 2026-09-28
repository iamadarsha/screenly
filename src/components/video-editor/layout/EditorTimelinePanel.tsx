import { useState, type RefObject } from "react";
import type { useVideoEditorAudio } from "../audio/useVideoEditorAudio";
import { retimeCaptionFragment } from "../captionTimeline";
import type { useAnnotationRegionCommands } from "../hooks/useAnnotationRegionCommands";
import type { useAudioRegionCommands } from "../hooks/useAudioRegionCommands";
import type { useCaptionCommands } from "../hooks/useCaptionCommands";
import type { useClipRegionCommands } from "../hooks/useClipRegionCommands";
import type { useEditorPlaybackControls } from "../hooks/useEditorPlaybackControls";
import type { useTimelineProjection } from "../hooks/useTimelineProjection";
import type { useZoomRegionCommands } from "../hooks/useZoomRegionCommands";
import type { useTimelineState } from "../state/useTimelineState";
import TimelineEditor, { type TimelineEditorHandle } from "../timeline/TimelineEditor";
import {
	FilmStrip,
	SpeakerHigh,
	ClosedCaptioning,
	MagicWand,
	TextT,
	Scissors,
	Sliders,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@heroui/react";

function formatTimecode(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	const ms = Math.floor((seconds % 1) * 10);
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
}

type Props = {
	panelRef?: RefObject<HTMLDivElement | null>;
	timelineRef: RefObject<TimelineEditorHandle | null>;
	timeline: ReturnType<typeof useTimelineState>;
	projection: ReturnType<typeof useTimelineProjection>;
	playback: ReturnType<typeof useEditorPlaybackControls>;
	audio: ReturnType<typeof useVideoEditorAudio>;
	zoomCommands: ReturnType<typeof useZoomRegionCommands>;
	clipCommands: ReturnType<typeof useClipRegionCommands>;
	audioCommands: ReturnType<typeof useAudioRegionCommands>;
	captionCommands: ReturnType<typeof useCaptionCommands>;
	annotationCommands: ReturnType<typeof useAnnotationRegionCommands>;
	videoPath: string | null;
	videoSourcePath: string | null;
	cursorTelemetrySourcePath: string | null;
	normalizedCursorTelemetry: ReturnType<typeof useTimelineState>["cursorTelemetry"];
	autoSuggestZoomsTrigger: number;
	handleAutoSuggestZoomsConsumed: () => void;
	disableSuggestedZooms: boolean;
	currentTime: number;
	handleSelectAnnotation: (id: string | null) => void;
};

export function EditorTimelinePanel(props: Props) {
	const [precisionMode, setPrecisionMode] = useState(false);
	const {
		timelineRef,
		timeline,
		projection,
		playback,
		audio,
		zoomCommands,
		clipCommands,
		audioCommands,
		captionCommands,
		annotationCommands,
		videoPath,
		videoSourcePath,
		cursorTelemetrySourcePath,
		normalizedCursorTelemetry,
		autoSuggestZoomsTrigger,
		handleAutoSuggestZoomsConsumed,
		disableSuggestedZooms,
		currentTime,
		handleSelectAnnotation,
	} = props;

	return (
		<div
			ref={props.panelRef}
			tabIndex={-1}
			data-timeline-panel
			className={`outline-none flex flex-shrink-0 flex-col bg-transparent px-4 pb-3 pt-1 transition-all duration-200 border-t border-white/5 ${
				precisionMode ? "glass-panel" : ""
			}`}
			style={{
				height: precisionMode ? "34%" : "23%",
				minHeight: precisionMode ? 260 : 185,
				maxHeight: precisionMode ? 420 : 280,
			}}
		>
			{/* Timeline Top Control Strip */}
			<div className="flex items-center justify-between py-1 px-1 mb-1 shrink-0 select-none">
				{/* Track Identity Badges */}
				<div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full track-video text-[10px] font-medium border">
						<FilmStrip size={11} /> Video
					</span>
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full track-audio text-[10px] font-medium border">
						<SpeakerHigh size={11} /> Audio
					</span>
					{timeline.autoCaptionSettings.enabled && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full track-captions text-[10px] font-medium border">
							<ClosedCaptioning size={11} /> Captions
						</span>
					)}
					{timeline.zoomRegions.length > 0 && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full track-zooms text-[10px] font-medium border">
							<MagicWand size={11} /> Zooms
						</span>
					)}
					{timeline.annotationRegions.length > 0 && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full track-annotations text-[10px] font-medium border">
							<TextT size={11} /> Annotations
						</span>
					)}
				</div>

				{/* Timecode Readout */}
				<div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80 px-2 py-0.5 rounded-md bg-white/5">
					<span className="text-foreground font-semibold">
						{formatTimecode(projection.timelinePlayheadTime)}
					</span>
					<span>/</span>
					<span>{formatTimecode(projection.timelineDuration)}</span>
				</div>

				{/* Quick Actions & Precision Mode Toggle */}
				<div className="flex items-center gap-1 shrink-0">
					<Tooltip>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => timelineRef.current?.splitClip()}
							className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground interactive-target"
							title="Split Clip at Playhead (S)"
						>
							<Scissors size={12} />
							<span className="hidden sm:inline">Split</span>
						</Button>
						<Tooltip.Content placement="top">Split clip at playhead (S)</Tooltip.Content>
					</Tooltip>

					<Tooltip>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => timelineRef.current?.addZoom()}
							className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground interactive-target"
							title="Add Zoom Region (Z)"
						>
							<MagicWand size={12} />
							<span className="hidden sm:inline">Zoom</span>
						</Button>
						<Tooltip.Content placement="top">Add Zoom at playhead (Z)</Tooltip.Content>
					</Tooltip>

					<div className="h-3 w-px bg-white/10 mx-0.5" />

					<Tooltip>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setPrecisionMode((prev) => !prev)}
							className={`h-6 px-2 text-[11px] gap-1 transition-colors interactive-target ${
								precisionMode
									? "bg-screenly-blue/20 text-screenly-blue font-semibold border border-screenly-blue/30"
									: "text-muted-foreground hover:text-foreground"
							}`}
							title="Toggle Precision Editing Mode"
						>
							<Sliders size={12} />
							<span className="text-[10px] font-medium">
								{precisionMode ? "Precision" : "Compact"}
							</span>
						</Button>
						<Tooltip.Content placement="top">
							{precisionMode ? "Switch to Compact Timeline" : "Switch to Precision Multi-Track Mode"}
						</Tooltip.Content>
					</Tooltip>
				</div>
			</div>
			<TimelineEditor
				ref={timelineRef}
				videoDuration={projection.timelineDuration}
				currentTime={currentTime}
				playheadTime={projection.timelinePlayheadTime}
				onSeek={playback.handleTimelineSeek}
				videoPath={videoPath}
				videoSourcePath={videoSourcePath}
				cursorTelemetrySourcePath={cursorTelemetrySourcePath}
				cursorTelemetry={normalizedCursorTelemetry}
				autoSuggestZoomsTrigger={autoSuggestZoomsTrigger}
				onAutoSuggestZoomsConsumed={handleAutoSuggestZoomsConsumed}
				disableSuggestedZooms={disableSuggestedZooms}
				zoomRegions={timeline.zoomRegions}
				onZoomAdded={zoomCommands.handleZoomAdded}
				onZoomSuggested={zoomCommands.handleZoomSuggested}
				onZoomSpanChange={zoomCommands.handleZoomSpanChange}
				onZoomDelete={zoomCommands.handleZoomDelete}
				selectedZoomId={timeline.selectedZoomId}
				onSelectZoom={zoomCommands.handleSelectZoom}
				trimRegions={timeline.trimRegions}
				clipRegions={timeline.clipRegions}
				onClipSplit={clipCommands.handleClipSplit}
				onClipDelete={clipCommands.handleClipDelete}
				onClipSpanChange={clipCommands.handleClipSpanChange}
				selectedClipId={timeline.selectedClipId}
				onSelectClip={clipCommands.handleSelectClip}
				audioRegions={timeline.audioRegions}
				onAudioAdded={audioCommands.handleAudioAdded}
				onAudioSpanChange={audioCommands.handleAudioSpanChange}
				onAudioDelete={audioCommands.handleAudioDelete}
				selectedAudioId={timeline.selectedAudioId}
				onSelectAudio={audioCommands.handleSelectAudio}
				captionRegions={projection.effectiveCaptionRegions}
				onCaptionSpanChange={(id, span) => {
					const fragment = projection.effectiveCaptionRegions.find(
						(cue) => cue.id === id,
					);
					if (!fragment) return;
					captionCommands.handleCaptionRetime(
						fragment.sourceCueId,
						retimeCaptionFragment(fragment, span),
					);
				}}
				selectedCaptionId={
					projection.effectiveCaptionRegions.find(
						(cue) =>
							cue.sourceCueId === timeline.selectedCaptionId &&
							currentTime * 1000 >= cue.startMs &&
							currentTime * 1000 < cue.endMs,
					)?.id ??
					projection.effectiveCaptionRegions.find(
						(cue) => cue.sourceCueId === timeline.selectedCaptionId,
					)?.id ??
					null
				}
				onSelectCaption={(id) => {
					const fragment = projection.effectiveCaptionRegions.find(
						(cue) => cue.id === id,
					);
					captionCommands.handleSelectCaption(fragment?.sourceCueId ?? null);
					if (fragment) playback.handleTimelineSeek(fragment.startMs / 1000);
				}}
				onCaptionDelete={(id) => {
					const fragment = projection.effectiveCaptionRegions.find(
						(cue) => cue.id === id,
					);
					if (fragment) captionCommands.handleCaptionDelete(fragment.sourceCueId);
				}}
				onCaptionAdded={captionCommands.handleCaptionAdded}
				captionsEnabled={timeline.autoCaptionSettings.enabled}
				captionQuickAddEnabled={timeline.autoCaptionSettings.timelineQuickAdd}
				annotationRegions={timeline.annotationRegions}
				onAnnotationAdded={annotationCommands.handleAnnotationAdded}
				onAnnotationSpanChange={annotationCommands.handleAnnotationSpanChange}
				onAnnotationDelete={annotationCommands.handleAnnotationDelete}
				selectedAnnotationId={timeline.selectedAnnotationId}
				onSelectAnnotation={handleSelectAnnotation}
				showSourceAudioTrack={timeline.clipRegions.some((clip) => clip.showSourceAudio)}
				sourceAudioResourceVersion={timeline.sourceAudioFallbackRefreshKey}
				sourceAudioTrackSettings={audio.activeSourceAudioTrackSettings}
				getSourceAudioTrackSettingsForClip={audio.getSourceAudioTrackSettingsForClip}
				onSourceAudioAvailabilityChange={timeline.setHasClipSourceAudio}
				onSourceAudioTracksMetaChange={audio.onSourceAudioTracksMetaChange}
			/>
		</div>
	);
}
