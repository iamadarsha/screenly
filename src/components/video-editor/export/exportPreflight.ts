import type { ExportSettings } from "@/lib/exporter/types";
import { type ClipRegion, sortClipRegions } from "../types";

export type ExportPreflightIssue = {
	code: string;
	message: string;
};

export type ExportPreflightResult = {
	blockers: ExportPreflightIssue[];
	warnings: ExportPreflightIssue[];
};

export type DiskSpaceStatusResult = {
	status: "ok" | "low" | "critical" | "unknown";
	freeBytes: number | null;
};

const CLIP_BOUNDS_TOLERANCE_MS = 250;

export function runVideoSourcePreflight(
	video: Pick<HTMLVideoElement, "readyState" | "duration"> | null | undefined,
): ExportPreflightIssue[] {
	if (!video) {
		return [{ code: "source-missing", message: "No video is loaded to export." }];
	}

	const blockers: ExportPreflightIssue[] = [];
	if (video.readyState < 2) {
		blockers.push({
			code: "source-not-ready",
			message: "The source recording hasn't finished loading. Wait a moment and try again.",
		});
	}
	if (!Number.isFinite(video.duration) || video.duration <= 0) {
		blockers.push({
			code: "source-duration-invalid",
			message: "The source recording has no readable duration. It may be corrupted.",
		});
	}
	return blockers;
}

export function runTimelineSegmentsPreflight(
	clipRegions: ClipRegion[],
	sourceDurationMs: number,
): ExportPreflightIssue[] {
	if (clipRegions.length === 0) return [];

	const sorted = sortClipRegions(clipRegions);
	for (const clip of sorted) {
		if (
			!Number.isFinite(clip.startMs) ||
			!Number.isFinite(clip.endMs) ||
			clip.endMs <= clip.startMs
		) {
			return [
				{
					code: "clip-region-invalid",
					message:
						"One of the timeline clips has an invalid duration. Remove or fix it before exporting.",
				},
			];
		}
	}

	const last = sorted[sorted.length - 1];
	if (
		last &&
		Number.isFinite(sourceDurationMs) &&
		sourceDurationMs > 0 &&
		last.endMs > sourceDurationMs + CLIP_BOUNDS_TOLERANCE_MS
	) {
		return [
			{
				code: "clip-region-out-of-bounds",
				message:
					"The timeline extends past the end of the source recording. Trim the last clip before exporting.",
			},
		];
	}

	return [];
}

export async function runDiskSpacePreflight(
	getDiskSpaceStatus: (() => Promise<DiskSpaceStatusResult>) | undefined,
): Promise<{ blockers: ExportPreflightIssue[]; warnings: ExportPreflightIssue[] }> {
	if (!getDiskSpaceStatus) return { blockers: [], warnings: [] };

	try {
		const status = await getDiskSpaceStatus();
		if (status.status === "critical") {
			return {
				blockers: [
					{
						code: "disk-space-critical",
						message:
							"Not enough free disk space to export safely. Free up space and try again.",
					},
				],
				warnings: [],
			};
		}
		if (status.status === "low") {
			return {
				blockers: [],
				warnings: [
					{
						code: "disk-space-low",
						message: "Disk space is running low — the export may fail if space runs out.",
					},
				],
			};
		}
	} catch {
		// Unknown disk status is not a blocker — just skip the check.
	}
	return { blockers: [], warnings: [] };
}

export function runCaptionSidecarPreflight(
	includeCaptionSidecar: boolean | undefined,
	hasCaptionPayload: boolean,
): ExportPreflightIssue[] {
	if (includeCaptionSidecar && !hasCaptionPayload) {
		return [
			{
				code: "captions-unavailable",
				message:
					"Captions were requested but aren't available yet — exporting without a caption sidecar.",
			},
		];
	}
	return [];
}

export async function runExportPreflight(input: {
	video: Pick<HTMLVideoElement, "readyState" | "duration"> | null | undefined;
	clipRegions: ClipRegion[];
	settings: Pick<ExportSettings, "includeCaptionSidecar">;
	hasCaptionPayload: boolean;
	getDiskSpaceStatus?: () => Promise<DiskSpaceStatusResult>;
}): Promise<ExportPreflightResult> {
	const sourceBlockers = runVideoSourcePreflight(input.video);
	const sourceDurationMs =
		input.video && Number.isFinite(input.video.duration) ? input.video.duration * 1000 : 0;
	const timelineBlockers =
		sourceBlockers.length === 0
			? runTimelineSegmentsPreflight(input.clipRegions, sourceDurationMs)
			: [];
	const disk = await runDiskSpacePreflight(input.getDiskSpaceStatus);
	const captionWarnings = runCaptionSidecarPreflight(
		input.settings.includeCaptionSidecar,
		input.hasCaptionPayload,
	);

	return {
		blockers: [...sourceBlockers, ...timelineBlockers, ...disk.blockers],
		warnings: [...disk.warnings, ...captionWarnings],
	};
}
