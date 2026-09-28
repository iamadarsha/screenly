import { useState, useEffect, useRef, useMemo } from "react";
import {
	MagnifyingGlass,
	FrameCorners,
	MagicWand,
	Cursor,
	Camera,
	SpeakerHigh,
	ClosedCaptioning,
	Palette,
	Gear,
	Scissors,
	FilmStrip,
	ShareNetwork,
	House,
	SunIcon,
	StarShine,
	X,
} from "@/components/ui/icons";
import type { EditorEffectSection } from "../types";

export interface CommandItem {
	id: string;
	title: string;
	subtitle?: string;
	category: "Modes" | "Editing" | "AI & Captions" | "Export & Share" | "View";
	icon: React.ComponentType<{ size?: number; className?: string }>;
	shortcut?: string;
	perform: () => void;
}

interface CommandPaletteProps {
	open: boolean;
	onClose: () => void;
	onSelectSection: (section: EditorEffectSection) => void;
	onOpenHome: () => void;
	onToggleClips: () => void;
	onOpenExport: () => void;
	onAddZoom?: () => void;
	onSplitClip?: () => void;
	onOpenCrop?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
	toggleTheme?: () => void;
}

export function CommandPalette({
	open,
	onClose,
	onSelectSection,
	onOpenHome,
	onToggleClips,
	onOpenExport,
	onAddZoom,
	onSplitClip,
	onOpenCrop,
	onUndo,
	onRedo,
	toggleTheme,
}: CommandPaletteProps) {
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const allCommands = useMemo<CommandItem[]>(() => {
		const list: CommandItem[] = [
			// Modes
			{
				id: "mode-composition",
				title: "Composition Inspector",
				subtitle: "Frame padding, aspect ratio, shadows, canvas styling",
				category: "Modes",
				icon: FrameCorners,
				shortcut: "1",
				perform: () => onSelectSection("scene"),
			},
			{
				id: "mode-motion",
				title: "Motion & Zooms",
				subtitle: "Auto zooms, manual zoom keyframes, camera follow",
				category: "Modes",
				icon: MagicWand,
				shortcut: "2",
				perform: () => onSelectSection("zoom"),
			},
			{
				id: "mode-cursor",
				title: "Cursor Styling",
				subtitle: "Cursor model, size, click pulse, smoothing, sway",
				category: "Modes",
				icon: Cursor,
				shortcut: "3",
				perform: () => onSelectSection("cursor"),
			},
			{
				id: "mode-camera",
				title: "Webcam & Camera",
				subtitle: "Overlay roundness, 9 positions, sizing, crop, mirror",
				category: "Modes",
				icon: Camera,
				shortcut: "4",
				perform: () => onSelectSection("webcam"),
			},
			{
				id: "mode-audio",
				title: "Audio Mixer",
				subtitle: "Mic and system volume, mute, ducking, narration",
				category: "Modes",
				icon: SpeakerHigh,
				shortcut: "5",
				perform: () => onSelectSection("audio"),
			},
			{
				id: "mode-captions",
				title: "Captions & Transcript",
				subtitle: "Whisper ASR, delete-to-cut transcript, styling, AI tools",
				category: "Modes",
				icon: ClosedCaptioning,
				shortcut: "6",
				perform: () => onSelectSection("captions"),
			},
			{
				id: "mode-backgrounds",
				title: "Backgrounds & Wallpapers",
				subtitle: "Choose from Apple-like 4K wallpapers, gradients, blurs",
				category: "Modes",
				icon: Palette,
				shortcut: "7",
				perform: () => onSelectSection("scene"),
			},
			{
				id: "mode-settings",
				title: "Project Settings",
				subtitle: "Rendering preferences, dimensions, defaults",
				category: "Modes",
				icon: Gear,
				shortcut: "8",
				perform: () => onSelectSection("settings"),
			},

			// Editing
			{
				id: "action-split-clip",
				title: "Split Clip at Playhead",
				subtitle: "Divide the active clip at the current playhead timestamp",
				category: "Editing",
				icon: Scissors,
				shortcut: "S",
				perform: () => onSplitClip?.(),
			},
			{
				id: "action-add-zoom",
				title: "Add Zoom Region",
				subtitle: "Insert a new focus zoom region at playhead",
				category: "Editing",
				icon: MagicWand,
				shortcut: "Z",
				perform: () => onAddZoom?.(),
			},
			{
				id: "action-crop",
				title: "Crop Video Canvas",
				subtitle: "Adjust the active crop bounds for the recording",
				category: "Editing",
				icon: FrameCorners,
				perform: () => onOpenCrop?.(),
			},
			{
				id: "action-undo",
				title: "Undo",
				subtitle: "Revert the last editor state modification",
				category: "Editing",
				icon: Scissors,
				shortcut: "⌘Z",
				perform: () => onUndo?.(),
			},
			{
				id: "action-redo",
				title: "Redo",
				subtitle: "Reapply previously undone modification",
				category: "Editing",
				icon: Scissors,
				shortcut: "⇧⌘Z",
				perform: () => onRedo?.(),
			},

			// AI & Captions
			{
				id: "ai-captions",
				title: "Generate AI Captions",
				subtitle: "Run on-device Whisper transcription with word timestamps",
				category: "AI & Captions",
				icon: ClosedCaptioning,
				perform: () => onSelectSection("captions"),
			},
			{
				id: "ai-director",
				title: "Smart Presentation Director",
				subtitle: "Suggest zooms and click focus from cursor telemetry",
				category: "AI & Captions",
				icon: StarShine,
				perform: () => onSelectSection("zoom"),
			},

			// Export & Share
			{
				id: "export-video",
				title: "Export Video",
				subtitle: "Open the Export Doctor to render MP4 with hardware acceleration",
				category: "Export & Share",
				icon: ShareNetwork,
				shortcut: "⌘E",
				perform: onOpenExport,
			},
			{
				id: "open-library",
				title: "Toggle Clips Library",
				subtitle: "Browse project recordings and previous takes",
				category: "Export & Share",
				icon: FilmStrip,
				shortcut: "L",
				perform: onToggleClips,
			},
			{
				id: "go-home",
				title: "Go to Home / Projects",
				subtitle: "Return to the project dashboard and recordings browser",
				category: "View",
				icon: House,
				shortcut: "H",
				perform: onOpenHome,
			},
			{
				id: "toggle-theme",
				title: "Toggle Theme (Light / Dark)",
				subtitle: "Switch appearance between light and dark modes",
				category: "View",
				icon: SunIcon,
				perform: () => toggleTheme?.(),
			},
		];
		return list;
	}, [
		onSelectSection,
		onOpenHome,
		onToggleClips,
		onOpenExport,
		onAddZoom,
		onSplitClip,
		onOpenCrop,
		onUndo,
		onRedo,
		toggleTheme,
	]);

	const filtered = useMemo(() => {
		if (!query.trim()) return allCommands;
		const q = query.toLowerCase();
		return allCommands.filter(
			(cmd) =>
				cmd.title.toLowerCase().includes(q) ||
				(cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
				cmd.category.toLowerCase().includes(q),
		);
	}, [allCommands, query]);

	useEffect(() => {
		if (open) {
			setQuery("");
			setSelectedIndex(0);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				if (open) onClose();
				else {
					// Open handled by parent, or if parent passed handler
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	const handleKeyDownInput = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((idx) => (idx + 1) % Math.max(1, filtered.length));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((idx) => (idx - 1 + filtered.length) % Math.max(1, filtered.length));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const selected = filtered[selectedIndex];
			if (selected) {
				selected.perform();
				onClose();
			}
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
			onClick={onClose}
		>
			<div
				className="glass-nav w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl border border-white/15 dark:border-white/10"
				onClick={(e) => e.stopPropagation()}
				style={{ maxHeight: "75vh" }}
			>
				{/* Search input */}
				<div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
					<MagnifyingGlass size={18} className="text-screenly-blue shrink-0" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setSelectedIndex(0);
						}}
						onKeyDown={handleKeyDownInput}
						placeholder="Search commands, modes, tools..."
						className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-normal"
					/>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-md text-foreground/40 hover:text-foreground transition-colors"
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				{/* Results list */}
				<div className="overflow-y-auto max-h-[50vh] p-2 space-y-1 custom-scrollbar">
					{filtered.length === 0 ? (
						<div className="py-8 text-center text-xs text-muted-foreground">
							No commands matching "{query}"
						</div>
					) : (
						filtered.map((item, idx) => {
							const isSelected = idx === selectedIndex;
							const Icon = item.icon;
							return (
								<div
									key={item.id}
									onMouseEnter={() => setSelectedIndex(idx)}
									onClick={() => {
										item.perform();
										onClose();
									}}
									className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
										isSelected
											? "bg-screenly-blue text-white shadow-sm"
											: "text-foreground hover:bg-white/10 dark:hover:bg-white/5"
									}`}
								>
									<div className="flex items-center gap-3 min-w-0">
										<div
											className={`p-1.5 rounded-lg shrink-0 ${
												isSelected ? "bg-white/20 text-white" : "bg-white/5 text-screenly-blue"
											}`}
										>
											<Icon size={16} />
										</div>
										<div className="min-w-0 truncate">
											<div className="font-medium truncate">{item.title}</div>
											{item.subtitle && (
												<div
													className={`text-[10px] truncate ${
														isSelected ? "text-white/80" : "text-muted-foreground"
													}`}
												>
													{item.subtitle}
												</div>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<span
											className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
												isSelected ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"
											}`}
										>
											{item.category}
										</span>
										{item.shortcut && (
											<kbd
												className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
													isSelected
														? "border-white/30 text-white bg-white/10"
														: "border-border text-muted-foreground bg-muted/40"
												}`}
											>
												{item.shortcut}
											</kbd>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between px-4 py-2 bg-black/20 text-[10px] text-muted-foreground border-t border-white/5">
					<div className="flex items-center gap-2">
						<span>Use</span>
						<kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↑</kbd>
						<kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↓</kbd>
						<span>to navigate</span>
					</div>
					<div className="flex items-center gap-2">
						<span>Select</span>
						<kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↵</kbd>
						<span>Close</span>
						<kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">esc</kbd>
					</div>
				</div>
			</div>
		</div>
	);
}
