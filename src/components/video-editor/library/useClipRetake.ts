import { useCallback, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { packClipSequence, rippleRegionAnchors, rippleRegions } from "../clipSequence";
import { applyRetakeToClip, swapToPreviousTake } from "../retake";
import type { useEditorUiState } from "../state/useEditorUiState";
import type { useProjectState } from "../state/useProjectState";
import type { useTimelineState } from "../state/useTimelineState";

export function useClipRetake(
	project: ReturnType<typeof useProjectState>,
	timeline: ReturnType<typeof useTimelineState>,
	ui: ReturnType<typeof useEditorUiState>,
) {
	const [retakingClipId, setRetakingClipId] = useState<string | null>(null);
	const lock = useRef(false);
	const current = useRef({ project, timeline, ui });
	current.current = { project, timeline, ui };

	const retakeClip = useCallback(async (clipId: string, newRecordingPath: string) => {
		if (lock.current) return;
		const { project, timeline, ui } = current.current;
		const sourcePath = project.videoSourcePath;
		if (!sourcePath) return;
		const before = timeline.clipRegions;
		const target = before.find((clip) => clip.id === clipId);
		if (!target) return;

		lock.current = true;
		setRetakingClipId(clipId);
		try {
			const result = await window.electronAPI.importRecording(sourcePath, newRecordingPath);
			if (!result.success) throw new Error(result.error);
			if (project.videoSourcePath !== sourcePath) {
				throw new Error("The project changed while retaking. Try again.");
			}

			const media = result.value;
			const prepared = await window.electronAPI.finishRecordingImport(media.path);
			if (!prepared.success) {
				throw new Error(prepared.error || "Could not finalize the new take");
			}
			void window.electronAPI
				.finishRecordingImport(media.path, true)
				.catch((error) => console.warn("Could not accept retake media", error));

			const next = before.map((clip) =>
				clip.id === clipId
					? applyRetakeToClip(clip, {
							sourceStartMs: media.sourceStartMs,
							sourceMinMs: media.sourceStartMs,
							sourceMaxMs: media.sourceStartMs + media.durationMs,
							durationMs: media.durationMs,
						})
					: clip,
			);
			const packed = packClipSequence(next);
			timeline.setClipRegions(packed);
			timeline.setZoomRegions((current) => rippleRegions(current, before, packed));
			timeline.setAnnotationRegions((current) => rippleRegions(current, before, packed));
			timeline.setAudioRegions((current) => rippleRegionAnchors(current, before, packed));
			ui.setDuration(media.totalDurationMs / 1000);
			toast.success("Clip retaken. The original take is kept — use Switch Take to go back.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not retake this clip");
		} finally {
			lock.current = false;
			setRetakingClipId(null);
		}
	}, []);

	const switchTake = useCallback((clipId: string) => {
		const { timeline } = current.current;
		const before = timeline.clipRegions;
		const target = before.find((clip) => clip.id === clipId);
		if (!target) return;

		const swapped = swapToPreviousTake(target);
		if (!swapped) {
			toast.info("No previous take to switch to");
			return;
		}

		const next = before.map((clip) => (clip.id === clipId ? swapped : clip));
		const packed = packClipSequence(next);
		timeline.setClipRegions(packed);
		timeline.setZoomRegions((current) => rippleRegions(current, before, packed));
		timeline.setAnnotationRegions((current) => rippleRegions(current, before, packed));
		timeline.setAudioRegions((current) => rippleRegionAnchors(current, before, packed));
	}, []);

	return { retakeClip, switchTake, retakingClipId };
}
