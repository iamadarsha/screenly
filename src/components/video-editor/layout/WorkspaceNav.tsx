import {
	House,
	VideoCamera,
	Scissors,
	FilmStrip,
	ShareNetwork,
	MagnifyingGlass,
} from "@/components/ui/icons";
import { Tooltip } from "@heroui/react";

export type WorkspaceDestination = "home" | "record" | "studio" | "library" | "publish";

interface WorkspaceNavProps {
	activeDestination?: WorkspaceDestination;
	onOpenHome: () => void;
	onOpenRecord: () => void;
	onOpenStudio: () => void;
	onToggleLibrary: () => void;
	libraryOpen: boolean;
	onOpenPublish: () => void;
	onOpenCommandPalette?: () => void;
}

export function WorkspaceNav({
	activeDestination = "studio",
	onOpenHome,
	onOpenRecord,
	onOpenStudio,
	onToggleLibrary,
	libraryOpen,
	onOpenPublish,
	onOpenCommandPalette,
}: WorkspaceNavProps) {
	const destinations: Array<{
		id: WorkspaceDestination;
		label: string;
		icon: typeof House;
		action: () => void;
		active: boolean;
		badge?: string;
	}> = [
		{
			id: "home",
			label: "Home",
			icon: House,
			action: onOpenHome,
			active: activeDestination === "home",
		},
		{
			id: "record",
			label: "Record",
			icon: VideoCamera,
			action: onOpenRecord,
			active: activeDestination === "record",
		},
		{
			id: "studio",
			label: "Studio",
			icon: Scissors,
			action: onOpenStudio,
			active: activeDestination === "studio" && !libraryOpen,
		},
		{
			id: "library",
			label: "Library",
			icon: FilmStrip,
			action: onToggleLibrary,
			active: libraryOpen,
		},
		{
			id: "publish",
			label: "Publish",
			icon: ShareNetwork,
			action: onOpenPublish,
			active: activeDestination === "publish",
		},
	];

	return (
		<nav
			aria-label="Workspace switcher"
			className="glass-nav flex items-center gap-1 p-1 rounded-full text-xs font-medium select-none shadow-lg"
			style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
		>
			{destinations.map((dest) => {
				const Icon = dest.icon;
				const isActive = dest.active;
				return (
					<Tooltip key={dest.id}>
						<button
							type="button"
							onClick={dest.action}
							className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 interactive-target ${
								isActive
									? "bg-screenly-blue text-white shadow-sm font-semibold"
									: "text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5"
							}`}
							aria-label={dest.label}
							aria-current={isActive ? "page" : undefined}
						>
							<Icon size={14} weight={isActive ? "fill" : "regular"} />
							<span className="hidden sm:inline tracking-tight">{dest.label}</span>
							{dest.id === "record" && (
								<span className="size-1.5 rounded-full bg-screenly-coral animate-pulse" />
							)}
						</button>
						<Tooltip.Content placement="bottom">{dest.label}</Tooltip.Content>
					</Tooltip>
				);
			})}

			{onOpenCommandPalette && (
				<>
					<div className="h-4 w-[1px] bg-white/15 dark:bg-white/10 mx-1" />
					<Tooltip>
						<button
							type="button"
							onClick={onOpenCommandPalette}
							className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-foreground/60 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-colors interactive-target"
							aria-label="Command palette (Cmd+K)"
						>
							<MagnifyingGlass size={13} />
							<kbd className="hidden md:inline font-mono text-[10px] opacity-60">⌘K</kbd>
						</button>
						<Tooltip.Content placement="bottom">Quick Search (⌘K)</Tooltip.Content>
					</Tooltip>
				</>
			)}
		</nav>
	);
}
