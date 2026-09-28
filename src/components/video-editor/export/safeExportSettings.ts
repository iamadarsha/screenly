import type { ExportSettings } from "@/lib/exporter/types";

/**
 * The most conservative export configuration this app can produce: legacy
 * pipeline (forces the WebCodecs backend — see `resolveMp4ExportRouting`,
 * which routes native/hardware attempts through the modern pipeline only),
 * medium quality, fast encoding, capped at 1080p30. Used as the one automatic
 * retry when a preferred (modern/native) export attempt fails outright, so a
 * real encoder failure doesn't have to mean "Export failed" when a safer
 * route can still produce valid media.
 */
export function isSafeExportSettings(settings: ExportSettings): boolean {
	return (
		settings.format !== "mp4" ||
		(settings.pipelineModel === "legacy" &&
			settings.quality === "medium" &&
			settings.encodingMode === "fast" &&
			(settings.mp4FrameRate ?? 30) <= 30)
	);
}

export function buildSafeExportSettings(settings: ExportSettings): ExportSettings {
	return {
		...settings,
		pipelineModel: "legacy",
		backendPreference: "webcodecs",
		quality: "medium",
		encodingMode: "fast",
		mp4FrameRate: 30,
	};
}
