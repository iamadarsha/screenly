import { useState, useMemo, type ComponentProps, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
	FrameCorners,
	MagicWand,
	Cursor,
	Camera,
	SpeakerHigh,
	ClosedCaptioning,
	Palette,
	Gear,
	CaretRight,
	CaretLeft,
} from "@/components/ui/icons";
import { Tooltip, Switch, Label } from "@heroui/react";
import { AccountAvatar } from "@/components/ui/account-avatar";
import type { useI18n } from "@/contexts/I18nContext";
import ExtensionManager from "../ExtensionManager";
import { SettingsPanel } from "../SettingsPanel";
import type { EditorEffectSection } from "../types";

export type StudioInspectorMode =
	| "composition"
	| "motion"
	| "cursor"
	| "camera"
	| "audio"
	| "captions"
	| "backgrounds"
	| "settings";

type Props = {
	accountUser?: User | null;
	panelContent?: ReactNode;
	onAccountClick?: () => void;
	t: ReturnType<typeof useI18n>["t"];
	activeSection: EditorEffectSection;
	setActiveSection: (section: EditorEffectSection) => void;
	settingsPanelProps: ComponentProps<typeof SettingsPanel>;
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
};

export function EditorRightInspector({
	t,
	accountUser,
	activeSection,
	setActiveSection,
	settingsPanelProps,
	panelContent,
	onAccountClick,
	collapsed: externalCollapsed,
	onToggleCollapsed,
}: Props) {
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const isCollapsed = externalCollapsed ?? internalCollapsed;
	const toggleCollapsed = onToggleCollapsed ?? (() => setInternalCollapsed((c) => !c));

	const [advancedSections, setAdvancedSections] = useState<Record<string, boolean>>({});
	const advanced = advancedSections[activeSection] ?? false;

	const hasAdvanced =
		!settingsPanelProps.selectedAnnotationId &&
		["scene", "frame", "crop", "cursor", "webcam", "captions", "settings", "zoom"].includes(
			activeSection,
		);

	// Studio Modes mapping to underlying EditorEffectSection
	const studioModes = useMemo(
		() => [
			{
				id: "composition" as const,
				section: "scene" as EditorEffectSection,
				label: "Composition",
				subtitle: "Canvas & Frame",
				icon: FrameCorners,
			},
			{
				id: "motion" as const,
				section: "zoom" as EditorEffectSection,
				label: "Motion",
				subtitle: "Smart & Manual Zooms",
				icon: MagicWand,
			},
			{
				id: "cursor" as const,
				section: "cursor" as EditorEffectSection,
				label: "Cursor",
				subtitle: "Style & Movement",
				icon: Cursor,
			},
			{
				id: "camera" as const,
				section: "webcam" as EditorEffectSection,
				label: "Camera",
				subtitle: "Webcam Overlay",
				icon: Camera,
			},
			{
				id: "audio" as const,
				section: "audio" as EditorEffectSection,
				label: "Audio",
				subtitle: "Mixer & Narration",
				icon: SpeakerHigh,
			},
			{
				id: "captions" as const,
				section: "captions" as EditorEffectSection,
				label: "Captions",
				subtitle: "Transcript & AI",
				icon: ClosedCaptioning,
			},
			{
				id: "backgrounds" as const,
				section: "scene" as EditorEffectSection,
				label: "Backgrounds",
				subtitle: "4K Wallpapers",
				icon: Palette,
			},
			{
				id: "settings" as const,
				section: "settings" as EditorEffectSection,
				label: "Settings",
				subtitle: "Preferences",
				icon: Gear,
			},
		],
		[],
	);

	// Determine active mode from activeSection
	const activeMode = useMemo(() => {
		if (activeSection === "zoom") return "motion";
		if (activeSection === "cursor") return "cursor";
		if (activeSection === "webcam") return "camera";
		if (activeSection === "audio") return "audio";
		if (activeSection === "captions" || activeSection === "caption") return "captions";
		if (activeSection === "settings") return "settings";
		return "composition";
	}, [activeSection]);

	const currentModeConfig = studioModes.find((m) => m.id === activeMode) ?? studioModes[0];

	return (
		<aside
			aria-label="Studio inspector"
			className={`glass-inspector flex flex-col z-20 shrink-0 transition-all duration-200 select-none ${
				isCollapsed ? "w-12" : "w-[340px]"
			}`}
		>
			{/* Inspector Header / Mode switcher bar */}
			<div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0 gap-1.5">
				{isCollapsed ? (
					<Tooltip>
						<button
							type="button"
							onClick={toggleCollapsed}
							className="p-1.5 rounded-lg text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-colors mx-auto interactive-target"
							aria-label="Expand inspector"
						>
							<CaretLeft size={16} />
						</button>
						<Tooltip.Content placement="left">Expand Inspector</Tooltip.Content>
					</Tooltip>
				) : (
					<>
						<div className="flex items-center gap-2 min-w-0">
							<div className="p-1 rounded-md bg-screenly-blue/15 text-screenly-blue shrink-0">
								<currentModeConfig.icon size={15} weight="fill" />
							</div>
							<div className="min-w-0 truncate">
								<h2 className="text-xs font-semibold tracking-tight text-foreground truncate">
									{settingsPanelProps.selectedAnnotationId
										? t("timeline.annotation.label", "Annotation")
										: settingsPanelProps.selectedClipId
											? "Clip Settings"
											: currentModeConfig.label}
								</h2>
								<p className="text-[10px] text-muted-foreground truncate">
									{currentModeConfig.subtitle}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							{hasAdvanced && (
								<div className="flex items-center gap-1.5">
									<Switch
										size="sm"
										isSelected={advanced}
										onChange={(value) =>
											setAdvancedSections((current) => ({
												...current,
												[activeSection]: value,
											}))
										}
										aria-label="Advanced settings"
									>
										<Switch.Content>
											<Label className="text-[10px] font-medium text-muted-foreground">
												Advanced
											</Label>
											<Switch.Control>
												<Switch.Thumb />
											</Switch.Control>
										</Switch.Content>
									</Switch>
								</div>
							)}

							<Tooltip>
								<button
									type="button"
									onClick={toggleCollapsed}
									className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-colors interactive-target"
									aria-label="Collapse inspector"
								>
									<CaretRight size={16} />
								</button>
								<Tooltip.Content placement="left">Collapse Inspector</Tooltip.Content>
							</Tooltip>
						</div>
					</>
				)}
			</div>

			{/* Mode Pill Bar (icons strip) */}
			<div
				className={`flex items-center justify-between p-1.5 border-b border-white/5 bg-black/10 shrink-0 ${
					isCollapsed ? "flex-col gap-2 py-3" : "overflow-x-auto gap-1"
				}`}
			>
				{studioModes.map((mode) => {
					const Icon = mode.icon;
					const isActive = activeMode === mode.id && !panelContent;
					return (
						<Tooltip key={mode.id}>
							<button
								type="button"
								onClick={() => {
									if (isCollapsed) toggleCollapsed();
									setActiveSection(mode.section);
								}}
								className={`p-2 rounded-xl transition-all interactive-target flex items-center justify-center shrink-0 ${
									isActive
										? "bg-screenly-blue text-white shadow-sm font-semibold"
										: "text-foreground/60 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5"
								}`}
								aria-label={mode.label}
								aria-current={isActive ? "true" : undefined}
							>
								<Icon size={16} weight={isActive ? "fill" : "regular"} />
							</button>
							<Tooltip.Content placement={isCollapsed ? "left" : "bottom"}>
								{mode.label}
							</Tooltip.Content>
						</Tooltip>
					);
				})}
			</div>

			{/* Content Area */}
			{!isCollapsed && (
				<div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
					{panelContent ?? (
						activeSection === "extensions" ? (
							<ExtensionManager />
						) : (
							<div className="glass-card p-3 shadow-inner">
								<SettingsPanel {...settingsPanelProps} advanced={advanced} />
							</div>
						)
					)}
				</div>
			)}

			{/* Inspector Footer / Account */}
			{onAccountClick && (
				<div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-black/10 shrink-0">
					<Tooltip>
						<button
							type="button"
							onClick={onAccountClick}
							className="flex items-center gap-2 p-1 rounded-lg text-xs hover:bg-white/10 dark:hover:bg-white/5 transition-colors interactive-target w-full"
							aria-label="Account"
						>
							<AccountAvatar user={accountUser} className="!size-6 shrink-0" />
							{!isCollapsed && (
								<span className="text-[11px] font-medium text-muted-foreground truncate">
									{accountUser?.email ?? "Sign in"}
								</span>
							)}
						</button>
						<Tooltip.Content placement={isCollapsed ? "left" : "top"}>
							{accountUser?.email ?? "Screenly Account"}
						</Tooltip.Content>
					</Tooltip>
				</div>
			)}
		</aside>
	);
}
