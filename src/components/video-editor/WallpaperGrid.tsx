import { Button, ToggleButton } from "@heroui/react";
import { Check, Plus, X } from "@/components/ui/icons";
import { useEffect, useMemo, useState } from "react";
import { getRenderableVideoUrl } from "@/lib/assetPath";
import {
	isVideoWallpaperSource,
	toWallpaperCategory,
	type WallpaperCategory,
} from "@/lib/wallpapers";

export interface WallpaperTile {
	key: string;
	value: string;
	previewUrl: string;
	label: string;
	category?: WallpaperCategory;
	removable?: boolean;
}

const CATEGORIES: { id: WallpaperCategory; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "abstract", label: "Abstract" },
	{ id: "aurora", label: "Aurora" },
	{ id: "topographic", label: "Topographic" },
	{ id: "cosmic", label: "Cosmic" },
	{ id: "minimal", label: "Minimal" },
	{ id: "alpine", label: "Alpine" },
	{ id: "coast", label: "Coast" },
	{ id: "botanical", label: "Botanical" },
];

/** Shared image/video gallery with category filtering. */
export function WallpaperGrid({
	items,
	addLabel,
	onAdd,
	onSelect,
	onRemove,
	isSelected,
}: {
	items: WallpaperTile[];
	addLabel: string;
	onAdd: () => void;
	onSelect: (value: string) => void;
	onRemove: (value: string) => void;
	isSelected: (value: string, previewUrl?: string) => boolean;
}) {
	const [selectedCategory, setSelectedCategory] = useState<WallpaperCategory>("all");

	const filteredItems = useMemo(() => {
		if (selectedCategory === "all") return items;
		return items.filter((item) => {
			const cat = item.category ?? toWallpaperCategory(item.value);
			return cat === selectedCategory;
		});
	}, [items, selectedCategory]);

	return (
		<div className="flex flex-col gap-2.5">
			{/* Category Filter Pills */}
			<div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar select-none">
				{CATEGORIES.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => setSelectedCategory(cat.id)}
						className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 interactive-target ${
							selectedCategory === cat.id
								? "bg-screenly-blue text-white shadow-sm"
								: "text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10"
						}`}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* Responsive Grid */}
			<div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
				<Button
					variant="secondary"
					isIconOnly
					aria-label={addLabel}
					onPress={onAdd}
					className="aspect-[4/3] h-auto w-full min-w-0 rounded-lg p-0 text-muted bg-white/5 hover:bg-white/10 border border-dashed border-white/15 transition-colors interactive-target"
				>
					<Plus className="size-4" />
				</Button>
				{filteredItems.map((item) => {
					const selected = isSelected(item.value, item.previewUrl);
					return (
						<div key={item.key} className="group relative flex min-w-0">
							<ToggleButton
								isSelected={selected}
								aria-label={item.label}
								onChange={() => onSelect(item.value)}
								className={`relative aspect-[4/3] h-auto w-full min-w-0 overflow-hidden rounded-lg p-0 transition-transform active:scale-95 border ${
									selected
										? "border-screenly-blue ring-2 ring-screenly-blue/40 shadow-sm"
										: "border-white/10 hover:border-white/25"
								}`}
							>
								{isVideoWallpaperSource(item.previewUrl) ? (
									<WallpaperVideoPreview src={item.previewUrl} />
								) : (
									<img
										src={item.previewUrl || undefined}
										alt={item.label}
										loading="lazy"
										decoding="async"
										draggable={false}
										className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-200 group-hover:scale-105"
									/>
								)}
								{selected && (
									<span className="absolute bottom-1 left-1 flex size-4 items-center justify-center rounded-full bg-screenly-blue text-white shadow-sm">
										<Check className="size-2.5" />
									</span>
								)}
							</ToggleButton>
							{item.removable && (
								<Button
									variant="secondary"
									isIconOnly
									aria-label={`Remove ${item.label}`}
									onPress={() => onRemove(item.value)}
									className="absolute right-0.5 top-0.5 z-10 size-5 min-w-0 rounded-full p-0 bg-overlay text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 interactive-target"
								>
									<X className="size-3" />
								</Button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function WallpaperVideoPreview({ src }: { src: string }) {
	const [resolvedSrc, setResolvedSrc] = useState(src);

	useEffect(() => {
		let cancelled = false;
		setResolvedSrc(src);

		void (async () => {
			try {
				const nextSrc = await getRenderableVideoUrl(src);
				if (!cancelled) {
					setResolvedSrc(nextSrc);
				}
			} catch {
				if (!cancelled) {
					setResolvedSrc(src);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [src]);

	return (
		<video
			src={resolvedSrc}
			muted
			playsInline
			preload="metadata"
			className="absolute inset-0 h-full w-full select-none object-cover"
			draggable={false}
			onMouseEnter={(e) => e.currentTarget.play().catch(() => undefined)}
			onMouseLeave={(e) => {
				e.currentTarget.pause();
				e.currentTarget.currentTime = 0;
			}}
		/>
	);
}
