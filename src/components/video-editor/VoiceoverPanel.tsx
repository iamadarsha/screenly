import { useEffect, useRef, useState } from "react";
import {
	ArrowClockwise,
	Check,
	DownloadSimple,
	MicrophoneIcon,
	Pause,
	Play,
	Plus,
	SpeakerHigh,
	StarShine,
	Trash,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SliderControl } from "./SliderControl";
import { Switch } from "@/components/ui/switch";
import { ProgressBar } from "@heroui/react";
import { resolveMediaElementSource } from "@/lib/exporter/localMediaSource";
import {
	cancelVoiceoverModelDownload,
	downloadVoiceoverModel,
	generateVoiceover,
	getVoiceoverModelStatus,
	listVoiceoverVoices,
	type VoiceoverModelStatus,
	type VoiceoverVoice,
} from "@/lib/ai/voiceoverProvider";
import type { CaptionCue } from "./types";
import { cn } from "@/lib/utils";

interface VoiceoverPanelProps {
	onAudioAdded?: (
		span: { start: number; end: number },
		audioPath: string,
		trackIndex?: number,
	) => void;
	currentTimeMs?: number;
	transcriptCues?: CaptionCue[];
	selectedAudioId?: string | null;
	selectedAudioVolume?: number;
	selectedAudioNormalize?: boolean;
	onAudioVolumeChange?: (volume: number) => void;
	onAudioNormalizeChange?: (normalize: boolean) => void;
	onAudioDelete?: (id: string) => void;
}

export function VoiceoverPanel({
	onAudioAdded,
	currentTimeMs = 0,
	transcriptCues = [],
	selectedAudioId,
	selectedAudioVolume = 1,
	selectedAudioNormalize = false,
	onAudioVolumeChange,
	onAudioNormalizeChange,
	onAudioDelete,
}: VoiceoverPanelProps) {
	// Model State
	const [modelStatus, setModelStatus] = useState<VoiceoverModelStatus>("not-downloaded");
	const [isDownloadingModel, setIsDownloadingModel] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);

	// Voices and Options
	const [voices, setVoices] = useState<VoiceoverVoice[]>([]);
	const [selectedVoice, setSelectedVoice] = useState("af_heart");
	const [speed, setSpeed] = useState(1.0);
	const [text, setText] = useState("");

	// Generation State
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastResult, setLastResult] = useState<{
		audioPath: string;
		durationMs: number;
		tier: string;
	} | null>(null);

	// Audio Playback
	const [isPlaying, setIsPlaying] = useState(false);
	const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
	const [addedSuccess, setAddedSuccess] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	// Load model status & voices
	useEffect(() => {
		let isMounted = true;
		void (async () => {
			const statusRes = await getVoiceoverModelStatus();
			if (isMounted && statusRes.status) {
				setModelStatus(statusRes.status);
			}
			const voiceList = await listVoiceoverVoices();
			if (isMounted) {
				setVoices(voiceList);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	// Handle Model Download
	const handleDownloadModel = async () => {
		setIsDownloadingModel(true);
		setDownloadProgress(0);
		setError(null);
		const result = await downloadVoiceoverModel((progress) => {
			setDownloadProgress(progress);
		});
		setIsDownloadingModel(false);
		if (result.success) {
			setModelStatus("downloaded");
		} else if (result.error && !result.cancelled) {
			setError(result.error);
		}
	};

	const handleCancelDownload = async () => {
		await cancelVoiceoverModelDownload();
		setIsDownloadingModel(false);
		setDownloadProgress(0);
	};

	// Draft from Transcript
	const handleDraftFromTranscript = () => {
		if (!transcriptCues.length) return;
		// Find cue overlapping current playhead or all cues
		const currentCue = transcriptCues.find(
			(cue) => currentTimeMs >= cue.startMs && currentTimeMs <= cue.endMs,
		);
		if (currentCue?.text) {
			setText(currentCue.text);
		} else {
			setText(transcriptCues.map((c) => c.text).join(" "));
		}
	};

	// Generate Voiceover
	const handleGenerate = async () => {
		if (!text.trim()) return;
		setIsGenerating(true);
		setError(null);
		setAddedSuccess(false);

		try {
			const res = await generateVoiceover({
				text: text.trim(),
				voice: selectedVoice,
				speed,
			});

			if (res.success && res.audioPath && res.durationMs) {
				setLastResult({
					audioPath: res.audioPath,
					durationMs: res.durationMs,
					tier: res.tier || (modelStatus === "downloaded" ? "kokoro-onnx" : "native-speech"),
				});
				const resolved = await resolveMediaElementSource(res.audioPath);
				setResolvedSrc(resolved.src);
			} else {
				setError(res.error || "Failed to generate voiceover.");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsGenerating(false);
		}
	};

	// Audio Play/Pause
	const togglePlayback = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			void audioRef.current.play();
			setIsPlaying(true);
		}
	};

	// Add to timeline
	const handleAddToTimeline = () => {
		if (!lastResult || !onAudioAdded) return;
		const start = currentTimeMs;
		const end = currentTimeMs + lastResult.durationMs;
		onAudioAdded({ start, end }, lastResult.audioPath, 0);
		setAddedSuccess(true);
		setTimeout(() => setAddedSuccess(false), 2500);
	};

	return (
		<section className="flex flex-col gap-4 text-xs">
			{/* Voiceover Generator Card */}
			<div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md shadow-sm">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-1.5 font-medium text-white/90">
						<StarShine className="h-4 w-4 text-violet-400" />
						<span>AI Voiceover</span>
					</div>
					<div className="flex items-center gap-1.5">
						{modelStatus === "downloaded" ? (
							<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
								Kokoro ONNX
							</span>
						) : (
							<span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/20">
								<span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
								Native Speech
							</span>
						)}
					</div>
				</div>

				{/* Download Kokoro Model Prompt (if not downloaded) */}
				{modelStatus !== "downloaded" && (
					<div className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5 text-sky-200">
						<div className="flex items-center justify-between gap-2 mb-1.5">
							<span className="text-[11px] font-medium">Neural Kokoro-82M TTS</span>
							{!isDownloadingModel ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => void handleDownloadModel()}
									className="h-6 px-2 text-[10px] border-sky-500/30 text-sky-300 hover:bg-sky-500/20"
								>
									<DownloadSimple className="h-3 w-3 mr-1" />
									Download (92 MB)
								</Button>
							) : (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => void handleCancelDownload()}
									className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white"
								>
									Cancel
								</Button>
							)}
						</div>
						<p className="text-[10px] text-sky-300/70">
							{isDownloadingModel
								? `Downloading neural weights: ${downloadProgress}%`
								: "Using zero-delay local system speech. Download Kokoro for studio neural narration."}
						</p>
						{isDownloadingModel && (
							<div className="mt-2">
								<ProgressBar
									aria-label="Kokoro model download progress"
									size="sm"
									value={downloadProgress}
									className="h-1.5"
								/>
							</div>
						)}
					</div>
				)}

				{/* Script Input */}
				<div className="flex flex-col gap-1.5 mb-3">
					<div className="flex items-center justify-between text-[11px] text-muted-foreground">
						<span>Narration Script</span>
						{transcriptCues.length > 0 && (
							<button
								type="button"
								onClick={handleDraftFromTranscript}
								className="text-violet-400 hover:text-violet-300 hover:underline transition-colors flex items-center gap-1"
							>
								<MicrophoneIcon className="h-3 w-3" />
								Draft from Transcript
							</button>
						)}
					</div>
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Type or paste narration script to generate voiceover..."
						rows={3}
						className="w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder-white/40 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/60 transition-colors"
					/>
				</div>

				{/* Voice & Speed Picker */}
				<div className="grid grid-cols-2 gap-2 mb-3">
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Voice</label>
						<select
							value={selectedVoice}
							onChange={(e) => setSelectedVoice(e.target.value)}
							className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-violet-500/60 focus:outline-none transition-colors"
						>
							{voices.map((v) => (
								<option key={v.id} value={v.id} className="bg-neutral-900 text-white">
									{v.name} ({v.gender}, {v.language.slice(0, 2).toUpperCase()})
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Speed ({speed}×)</label>
						<div className="flex items-center gap-1">
							{[0.8, 1.0, 1.2, 1.4].map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setSpeed(s)}
									className={cn(
										"flex-1 rounded py-1 text-[10px] font-medium transition-colors border",
										speed === s
											? "border-violet-500 bg-violet-500/20 text-violet-200"
											: "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
									)}
								>
									{s}×
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Generate Button */}
				<Button
					onClick={() => void handleGenerate()}
					disabled={isGenerating || !text.trim()}
					className="w-full h-8 text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm border border-violet-400/20"
				>
					{isGenerating ? (
						<>
							<ArrowClockwise className="h-3.5 w-3.5 mr-1.5 animate-spin" />
							Generating Voiceover…
						</>
					) : (
						<>
							<SpeakerHigh className="h-3.5 w-3.5 mr-1.5" />
							Generate Voiceover
						</>
					)}
				</Button>

				{error && (
					<p className="mt-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-1.5">
						{error}
					</p>
				)}

				{/* Generated Audio Preview & Add to Timeline */}
				{lastResult && (
					<div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
						{resolvedSrc && (
							<audio
								ref={audioRef}
								src={resolvedSrc}
								onEnded={() => setIsPlaying(false)}
								className="hidden"
							/>
						)}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={togglePlayback}
									className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
								>
									{isPlaying ? (
										<Pause className="h-3.5 w-3.5" />
									) : (
										<Play className="h-3.5 w-3.5 ml-0.5" />
									)}
								</button>
								<div className="flex flex-col">
									<span className="text-[11px] font-medium text-white/90">
										Preview Voiceover
									</span>
									<span className="text-[10px] text-muted-foreground">
										{(lastResult.durationMs / 1000).toFixed(1)}s • {lastResult.tier}
									</span>
								</div>
							</div>

							<Button
								size="sm"
								variant="secondary"
								onClick={handleAddToTimeline}
								disabled={addedSuccess}
								className={cn(
									"h-7 text-[11px] px-2.5 transition-all",
									addedSuccess
										? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
										: "bg-white/10 hover:bg-white/15 text-white border border-white/15",
								)}
							>
								{addedSuccess ? (
									<>
										<Check className="h-3 w-3 mr-1 text-emerald-400" />
										Added!
									</>
								) : (
									<>
										<Plus className="h-3 w-3 mr-1" />
										Add to Timeline
									</>
								)}
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Timeline Audio Region Settings (Active when an audio region is selected) */}
			{selectedAudioId && (
				<div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md shadow-sm flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<span className="font-medium text-white/90 text-[11px]">Selected Audio Clip</span>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => onAudioDelete?.(selectedAudioId)}
							className="h-6 px-1.5 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
						>
							<Trash className="h-3 w-3 mr-1" />
							Delete
						</Button>
					</div>

					<SliderControl
						label="Volume"
						value={selectedAudioVolume}
						min={0}
						max={1}
						step={0.01}
						onChange={(v) => onAudioVolumeChange?.(v)}
						formatValue={(v) => `${Math.round(v * 100)}%`}
					/>

					<div className="flex items-center justify-between py-1">
						<span className="text-muted-foreground text-[11px]">Normalize Audio</span>
						<Switch
							aria-label="Normalize Audio"
							checked={Boolean(selectedAudioNormalize)}
							onCheckedChange={(v) => onAudioNormalizeChange?.(v)}
						/>
					</div>
				</div>
			)}
		</section>
	);
}
