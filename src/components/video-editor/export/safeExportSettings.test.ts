import { describe, expect, it } from "vitest";
import type { ExportSettings } from "@/lib/exporter/types";
import { buildSafeExportSettings, isSafeExportSettings } from "./safeExportSettings";

function mp4Settings(overrides: Partial<ExportSettings> = {}): ExportSettings {
	return {
		format: "mp4",
		quality: "high",
		encodingMode: "quality",
		pipelineModel: "modern",
		backendPreference: "auto",
		mp4FrameRate: 60,
		...overrides,
	};
}

describe("isSafeExportSettings", () => {
	it("treats any non-mp4 export as already safe", () => {
		expect(isSafeExportSettings({ format: "gif" })).toBe(true);
	});

	it("is false for the default modern/hardware settings", () => {
		expect(isSafeExportSettings(mp4Settings())).toBe(false);
	});

	it("is true once settings match the conservative legacy/webcodecs profile", () => {
		expect(
			isSafeExportSettings(
				mp4Settings({
					pipelineModel: "legacy",
					quality: "medium",
					encodingMode: "fast",
					mp4FrameRate: 30,
				}),
			),
		).toBe(true);
	});

	it("treats a lower-than-30 frame rate as still safe", () => {
		expect(
			isSafeExportSettings(
				mp4Settings({
					pipelineModel: "legacy",
					quality: "medium",
					encodingMode: "fast",
					mp4FrameRate: 24,
				}),
			),
		).toBe(true);
	});
});

describe("buildSafeExportSettings", () => {
	it("forces the conservative legacy/webcodecs profile while preserving format and other fields", () => {
		const result = buildSafeExportSettings(
			mp4Settings({ includeCaptionSidecar: true, gifConfig: undefined }),
		);
		expect(result).toEqual({
			format: "mp4",
			includeCaptionSidecar: true,
			gifConfig: undefined,
			quality: "medium",
			encodingMode: "fast",
			pipelineModel: "legacy",
			backendPreference: "webcodecs",
			mp4FrameRate: 30,
		});
	});

	it("produces settings that isSafeExportSettings then reports as safe", () => {
		expect(isSafeExportSettings(buildSafeExportSettings(mp4Settings()))).toBe(true);
	});
});
