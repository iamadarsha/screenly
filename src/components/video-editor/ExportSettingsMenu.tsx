import { DownloadSimple as Download, FilmSlate as Film, Image } from "@/components/ui/icons";
import { Card, Label, Description, TagGroup, Tag } from "@heroui/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useScopedT } from "@/contexts/I18nContext";
import type {
	ExportEncodingMode,
	ExportFormat,
	ExportMp4FrameRate,
	ExportPipelineModel,
	ExportQuality,
	GifFrameRate,
	GifSizePreset,
} from "@/lib/exporter";
import { GIF_FRAME_RATES, GIF_SIZE_PRESETS, MP4_FRAME_RATES } from "@/lib/exporter";
import { getMp4ExportBitrate } from "@/lib/exporter/exportBitrate";
import { useMemo } from "react";

interface ExportSettingsMenuProps {
	exportFormat: ExportFormat;
	onExportFormatChange?: (format: ExportFormat) => void;
	exportQuality: ExportQuality;
	onExportQualityChange?: (quality: ExportQuality) => void;
	exportEncodingMode: ExportEncodingMode;
	onExportEncodingModeChange?: (encodingMode: ExportEncodingMode) => void;
	mp4FrameRate: ExportMp4FrameRate;
	onMp4FrameRateChange?: (frameRate: ExportMp4FrameRate) => void;
	exportPipelineModel?: ExportPipelineModel;
	experimentalNvidiaCudaExport?: boolean;
	onExperimentalNvidiaCudaExportChange?: (enabled: boolean) => void;
	nvidiaCudaExportAvailable?: boolean;
	showCaptionSidecarOption?: boolean;
	includeCaptionSidecar?: boolean;
	onIncludeCaptionSidecarChange?: (enabled: boolean) => void;
	mp4OutputDimensions?: Record<ExportQuality, { width: number; height: number }>;
	gifFrameRate: GifFrameRate;
	onGifFrameRateChange?: (rate: GifFrameRate) => void;
	gifLoop: boolean;
	onGifLoopChange?: (loop: boolean) => void;
	gifSizePreset: GifSizePreset;
	onGifSizePresetChange?: (preset: GifSizePreset) => void;
	gifOutputDimensions: { width: number; height: number };
	duration?: number;
	onExport?: () => void;
	className?: string;
}

function Choices<T extends string | number>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: { value: T; label: ReactNode; textValue?: string; description?: string }[];
	onChange?: (value: T) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label>{label}</Label>
			<TagGroup
				aria-label={label}
				selectionMode="single"
				disallowEmptySelection
				selectedKeys={[String(value)]}
				onSelectionChange={(keys) => {
					if (keys === "all") return;
					const selected = options.find((option) => keys.has(String(option.value)));
					if (selected) onChange?.(selected.value);
				}}
				size="lg"
			>
				<TagGroup.List className="flex gap-2">
					{options.map((option) => (
						<Tag
							key={option.value}
							id={String(option.value)}
							textValue={
								option.textValue ??
								(typeof option.label === "string"
									? option.label
									: String(option.value))
							}
							className="h-auto min-h-10 flex-1 justify-center flex-col gap-0.5 py-2"
						>
							{option.label}
							{option.description && (
								<span className="text-[10px] opacity-70">{option.description}</span>
							)}
						</Tag>
					))}
				</TagGroup.List>
			</TagGroup>
		</div>
	);
}
export function ExportSettingsMenu({
	exportFormat,
	onExportFormatChange,
	exportQuality,
	onExportQualityChange,
	exportEncodingMode,
	onExportEncodingModeChange,
	mp4FrameRate,
	onMp4FrameRateChange,
	exportPipelineModel = "modern",
	experimentalNvidiaCudaExport = false,
	onExperimentalNvidiaCudaExportChange,
	nvidiaCudaExportAvailable = false,
	showCaptionSidecarOption = false,
	includeCaptionSidecar = false,
	onIncludeCaptionSidecarChange,
	mp4OutputDimensions,
	gifFrameRate,
	onGifFrameRateChange,
	gifLoop,
	onGifLoopChange,
	gifSizePreset,
	onGifSizePresetChange,
	gifOutputDimensions,
	duration,
	onExport,
	className,
}: ExportSettingsMenuProps) {
	const tSettings = useScopedT("settings");
	const isLegacyModel = exportPipelineModel === "legacy";

	const exportRoute = useMemo(() => {
		if (exportFormat === "gif") return "Web Worker GIF Engine";
		if (experimentalNvidiaCudaExport && nvidiaCudaExportAvailable)
			return "NVIDIA CUDA Hardware Encoder";
		if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent)) {
			return "Hardware H.264 (Apple VideoToolbox)";
		}
		return "WebCodecs / FFmpeg H.264";
	}, [exportFormat, experimentalNvidiaCudaExport, nvidiaCudaExportAvailable]);

	const estimatedSize = useMemo(() => {
		const effectiveDuration = duration && duration > 0 ? duration : 30;
		if (exportFormat === "gif") {
			const { width, height } = gifOutputDimensions;
			const bytes = width * height * gifFrameRate * effectiveDuration * 0.05;
			const mb = Math.max(0.2, bytes / (1024 * 1024)).toFixed(1);
			return `${mb} MB`;
		}
		const dims = mp4OutputDimensions?.[exportQuality] ?? { width: 1920, height: 1080 };
		const bitrate = getMp4ExportBitrate({
			width: dims.width,
			height: dims.height,
			frameRate: mp4FrameRate,
			quality: exportQuality,
			encodingMode: exportEncodingMode,
		});
		const totalBits = bitrate * effectiveDuration;
		const mb = Math.max(0.5, totalBits / (8 * 1024 * 1024)).toFixed(1);
		return `${mb} MB`;
	}, [
		exportFormat,
		duration,
		gifOutputDimensions,
		gifFrameRate,
		mp4OutputDimensions,
		exportQuality,
		mp4FrameRate,
		exportEncodingMode,
	]);

	const estimatedTime = useMemo(() => {
		const effectiveDuration = duration && duration > 0 ? duration : 30;
		if (exportFormat === "gif") {
			const sec = Math.max(2, Math.round(effectiveDuration / 1.5));
			return `${sec}s`;
		}
		const speedFactor = exportRoute.includes("Hardware") ? 3.5 : 1.8;
		const sec = Math.max(2, Math.round(effectiveDuration / speedFactor));
		return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
	}, [duration, exportFormat, exportRoute]);

	return (
		<Card className={className}>
			<Card.Header>
				<Card.Title>{tSettings("export.title", "Export")}</Card.Title>
			</Card.Header>
			<Card.Content className="gap-4">
				<Choices
					label={tSettings("export.format", "Format")}
					value={exportFormat}
					onChange={onExportFormatChange}
					options={[
						{
							value: "mp4",
							textValue: tSettings("export.mp4"),
							label: (
								<span className="flex items-center gap-2">
									<Film />
									{tSettings("export.mp4")}
								</span>
							),
						},
						{
							value: "gif",
							textValue: tSettings("export.gif"),
							label: (
								<span className="flex items-center gap-2">
									<Image />
									{tSettings("export.gif")}
								</span>
							),
						},
					]}
				/>
				{exportFormat === "mp4" ? (
					<>
						<Choices
							label={tSettings("export.qualityTitle", "Quality")}
							value={exportQuality}
							onChange={onExportQualityChange}
							options={(["medium", "good", "high", "source"] as const).map(
								(value, index) => ({
									value,
									label: tSettings(
										`export.quality.${["low", "medium", "high", "original"][index]}`,
									),
									description: mp4OutputDimensions
										? `${mp4OutputDimensions[value].width} × ${mp4OutputDimensions[value].height}`
										: undefined,
								}),
							)}
						/>
						<Choices
							label={tSettings("export.encodingTitle", "Encoding")}
							value={exportEncodingMode}
							onChange={onExportEncodingModeChange}
							options={(["fast", "balanced", "quality"] as const).map((value) => ({
								value,
								label: tSettings(
									`export.encoding.${value}`,
									{ fast: "Fast", balanced: "Balanced", quality: "Quality" }[
										value
									],
								),
							}))}
						/>
						<Choices
							label={tSettings("export.fpsTitle", "FPS")}
							value={mp4FrameRate}
							onChange={onMp4FrameRateChange}
							options={MP4_FRAME_RATES.map((value) => ({
								value,
								label: String(value),
							}))}
						/>
						{!isLegacyModel && nvidiaCudaExportAvailable && (
							<Switch
								checked={experimentalNvidiaCudaExport}
								onCheckedChange={onExperimentalNvidiaCudaExportChange}
							>
								<Label>{tSettings("export.nvidiaCuda.title", "NVIDIA CUDA")}</Label>
							</Switch>
						)}
						{showCaptionSidecarOption && (
							<div>
								<Switch
									checked={includeCaptionSidecar}
									onCheckedChange={onIncludeCaptionSidecarChange}
								>
									<Label>
										{tSettings(
											"export.captionSidecar.title",
											"Export captions file",
										)}
									</Label>
								</Switch>
								<Description>
									{tSettings(
										"export.captionSidecar.hint",
										"Save .srt and .vtt files next to your exported video.",
									)}
								</Description>
							</div>
						)}
					</>
				) : (
					<>
						<Choices
							label={tSettings("export.fpsTitle", "FPS")}
							value={gifFrameRate}
							onChange={onGifFrameRateChange}
							options={GIF_FRAME_RATES.map((rate) => ({
								value: rate.value,
								label: String(rate.value),
							}))}
						/>
						<Choices
							label={tSettings("export.size", "Size")}
							value={gifSizePreset}
							onChange={onGifSizePresetChange}
							options={Object.entries(GIF_SIZE_PRESETS).map(([key, preset]) => ({
								value: key as GifSizePreset,
								label: preset.label,
							}))}
						/>
						<Description>
							{gifOutputDimensions.width} × {gifOutputDimensions.height}px
						</Description>
						<Switch checked={gifLoop} onCheckedChange={onGifLoopChange}>
							<Label>{tSettings("export.loop")}</Label>
						</Switch>
					</>
				)}
				<div
					className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-1.5 text-xs mt-1"
					data-testid="export-estimate-card"
				>
					<div className="flex items-center justify-between text-muted-foreground text-[11px]">
						<span>Export Route</span>
						<span className="font-medium text-white/90">{exportRoute}</span>
					</div>
					<div className="flex items-center justify-between text-muted-foreground text-[11px]">
						<span>Estimated Size</span>
						<span className="font-medium text-emerald-400">{estimatedSize}</span>
					</div>
					<div className="flex items-center justify-between text-muted-foreground text-[11px]">
						<span>Estimated Time</span>
						<span className="font-medium text-sky-400">~{estimatedTime}</span>
					</div>
				</div>
			</Card.Content>
			<Card.Footer>
				<Button size="lg" onClick={onExport} className="w-full">
					<Download />
					{tSettings("export.exportVideo", undefined, {
						format: exportFormat === "gif" ? "GIF" : "Video",
					})}
				</Button>
			</Card.Footer>
		</Card>
	);
}
