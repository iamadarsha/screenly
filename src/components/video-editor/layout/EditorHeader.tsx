import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { Separator } from "@heroui/react";
import {
	House,
	ArrowClockwise as Redo2,
	ArrowCounterClockwise as Undo2,
	Sliders,
} from "@/components/ui/icons";
import { WorkspaceNav } from "./WorkspaceNav";
import type { CSSProperties, FormEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import type { useI18n } from "@/contexts/I18nContext";
import type { useExportDimensions } from "../export/useExportDimensions";
import type { useExportSession } from "../export/useExportSession";
import type { useExportSettings } from "../export/useExportSettings";
import type { useExportStatusViewModel } from "../export/useExportStatusViewModel";
import type { useVideoEditorPresets } from "../presets/useVideoEditorPresets";
import type { useProjectState } from "../state/useProjectState";
import { EditorExportMenu } from "./EditorExportMenu";
import { EditorPresetMenu } from "./EditorPresetMenu";

// Keep the preset implementation available for future use.
const SHOW_PRESETS_BUTTON = false;
const NOOP = () => {
	// Intentional default fallback
};

type Props = {
	clipsOpen: boolean;
	onToggleClips: () => void;
	t: ReturnType<typeof useI18n>["t"];
	headerLeftControlsPaddingClass: string;
	project: ReturnType<typeof useProjectState>;
	projectBrowserTriggerRef: RefObject<HTMLButtonElement | null>;
	projectNameInputRef: RefObject<HTMLInputElement | null>;
	projectDisplayName: string;
	hasUnsavedChanges: boolean;
	canUndo: boolean;
	canRedo: boolean;
	handleOpenProjectBrowser: () => void;
	handleUndo: () => void;
	handleRedo: () => void;
	handleProjectNameSubmit: (event?: FormEvent<HTMLFormElement>) => void;
	closeProjectNameEditor: () => void;
	presets: ReturnType<typeof useVideoEditorPresets>;
	exportSettings: ReturnType<typeof useExportSettings>;
	exportSession: ReturnType<typeof useExportSession>;
	exportDimensions: ReturnType<typeof useExportDimensions>;
	exportStatus: ReturnType<typeof useExportStatusViewModel>;
	hasCaptionsForSidecar: boolean;
	nvidiaCudaExportAvailable: boolean;
	experimentalNvidiaCudaExport: boolean;
	setExperimentalNvidiaCudaExport: (enabled: boolean) => void;
	handleOpenExportDropdown: () => void;
	handleExportDropdownClose: () => void;
	handleCancelExport: () => void;
	handleRetrySaveExport: () => void;
	handleStartExportFromDropdown: () => void;
	revealExportedFile: () => void;
	exportMessage: string | null;
	prepareExportForShare: () => Promise<string | undefined>;
	onRequestShareSignIn: () => void;
	shareRequestNonce: number;
	authToken?: string;
	duration?: number;
	onOpenRecord?: () => void;
	onOpenStudio?: () => void;
	onOpenCommandPalette?: () => void;
	inspectorCollapsed?: boolean;
	onToggleInspector?: () => void;
};

export function EditorHeader(props: Props) {
	const {
		t,
		headerLeftControlsPaddingClass,
		project,
		projectBrowserTriggerRef,
		projectNameInputRef,
		projectDisplayName,
		hasUnsavedChanges,
		canUndo,
		canRedo,
		handleOpenProjectBrowser,
		handleUndo,
		handleRedo,
		handleProjectNameSubmit,
		closeProjectNameEditor,
		presets,
		exportSettings,
		exportSession,
		exportDimensions,
		exportStatus,
		hasCaptionsForSidecar,
		nvidiaCudaExportAvailable,
		experimentalNvidiaCudaExport,
		setExperimentalNvidiaCudaExport,
		handleOpenExportDropdown,
		handleExportDropdownClose,
		handleCancelExport,
		handleRetrySaveExport,
		handleStartExportFromDropdown,
		revealExportedFile,
		exportMessage,
	} = props;
	const {
		isEditingProjectName,
		setIsEditingProjectName,
		projectNameDraft,
		setProjectNameDraft,
		isSavingProjectName,
	} = project;

	return (
		<header
			className="editor-header [--text-sm:0.8125rem] relative z-50 flex h-14 shrink-0 border-b border-white/10 glass-panel items-center justify-between gap-3 px-4"
			style={{ WebkitAppRegion: "drag" } as CSSProperties}
		>
			<div
				className={`editor-header-start flex min-w-0 items-center gap-2 ${headerLeftControlsPaddingClass}`}
				style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
			>
				<Button
					ref={projectBrowserTriggerRef}
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleOpenProjectBrowser}
					className="h-9 shrink-0 gap-2 px-3 text-foreground/80 hover:text-foreground"
					title="Home"
					aria-label="Home"
				>
					<House weight="fill" className="h-4 w-4 text-screenly-blue" />
					<span className="font-medium">Screenly</span>
				</Button>
				<span
					aria-hidden="true"
					className="mx-1 shrink-0 text-sm font-light text-muted-foreground/40"
				>
					/
				</span>

				<div
					className="editor-header-title flex min-w-0 items-center"
					style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
				>
					{isEditingProjectName ? (
						<form
							onSubmit={(event) => void handleProjectNameSubmit(event)}
							className="flex w-full min-w-0 items-center gap-1.5 px-1"
						>
							{hasUnsavedChanges ? (
								<span className="size-1.5 shrink-0 rounded-full bg-screenly-coral animate-pulse" />
							) : null}
							<input
								ref={projectNameInputRef}
								type="text"
								value={projectNameDraft}
								onChange={(event) => setProjectNameDraft(event.target.value)}
								onBlur={() => {
									if (
										!isSavingProjectName &&
										projectNameDraft.trim() !== projectDisplayName
									)
										void handleProjectNameSubmit();
									else if (!isSavingProjectName) closeProjectNameEditor();
								}}
								onKeyDown={(event) => {
									if (event.key === "Escape") {
										event.preventDefault();
										closeProjectNameEditor();
									}
								}}
								disabled={isSavingProjectName}
								className="inline-project-name h-9 min-w-0 max-w-full text-sm font-semibold tracking-tight text-foreground/90 disabled:cursor-wait bg-white/5 px-2 rounded-lg border border-white/10"
								style={{ width: `${Math.max(12, projectNameDraft.length + 1)}ch` }}
								aria-label={t("editor.project.renameInput", "Project name")}
							/>
						</form>
					) : (
						<Button
							variant="ghost"
							type="button"
							onClick={() => setIsEditingProjectName(true)}
							className="inline-flex h-9 min-w-0 max-w-full items-center gap-1.5 px-2 rounded-lg hover:bg-white/5"
							title={t("editor.project.renameTitle", "Rename project")}
							aria-label={t("editor.project.renameTitle", "Rename project")}
						>
							{hasUnsavedChanges ? (
								<span className="size-1.5 shrink-0 rounded-full bg-screenly-coral" />
							) : null}
							<span className="truncate text-sm font-semibold tracking-tight text-foreground/90">
								{projectDisplayName}
							</span>
						</Button>
					)}
				</div>
			</div>

			{/* Center Workspace Switcher */}
			<div
				className="flex items-center justify-center shrink-0"
				style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
			>
				<WorkspaceNav
					onOpenHome={handleOpenProjectBrowser}
					onOpenRecord={props.onOpenRecord ?? NOOP}
					onOpenStudio={props.onOpenStudio ?? NOOP}
					onToggleLibrary={props.onToggleClips}
					libraryOpen={props.clipsOpen}
					onOpenPublish={props.handleOpenExportDropdown}
					onOpenCommandPalette={props.onOpenCommandPalette}
				/>
			</div>

			<div
				className="editor-header-end flex min-w-0 items-center justify-self-end gap-2"
				style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
			>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						onClick={handleUndo}
						disabled={!canUndo}
						className="inline-flex h-8 w-8 min-w-8 items-center justify-center p-0 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground"
						title={t("common.actions.undo", "Undo")}
						aria-label={t("common.actions.undo", "Undo")}
					>
						<Undo2 className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={handleRedo}
						disabled={!canRedo}
						className="inline-flex h-8 w-8 min-w-8 items-center justify-center p-0 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground"
						title={t("common.actions.redo", "Redo")}
						aria-label={t("common.actions.redo", "Redo")}
					>
						<Redo2 className="h-4 w-4" />
					</Button>
				</div>

				{props.onToggleInspector && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={props.onToggleInspector}
						className={`h-8 px-2.5 gap-1.5 text-xs rounded-lg transition-colors ${
							!props.inspectorCollapsed
								? "bg-screenly-blue/15 text-screenly-blue"
								: "text-foreground/70 hover:text-foreground"
						}`}
						title="Toggle Studio Inspector"
						aria-label="Toggle Studio Inspector"
					>
						<Sliders size={14} />
						<span className="hidden lg:inline text-[11px] font-medium">Inspector</span>
					</Button>
				)}

				<Separator orientation="vertical" className="h-4 shrink-0 self-center opacity-40" />

				{SHOW_PRESETS_BUTTON && <EditorPresetMenu t={t} presets={presets} />}
				<FeedbackDialog />
				<EditorExportMenu
					t={t}
					exportSettings={exportSettings}
					exportSession={exportSession}
					exportDimensions={exportDimensions}
					exportStatus={exportStatus}
					hasCaptionsForSidecar={hasCaptionsForSidecar}
					nvidiaCudaExportAvailable={nvidiaCudaExportAvailable}
					experimentalNvidiaCudaExport={experimentalNvidiaCudaExport}
					setExperimentalNvidiaCudaExport={setExperimentalNvidiaCudaExport}
					handleOpenExportDropdown={handleOpenExportDropdown}
					handleExportDropdownClose={handleExportDropdownClose}
					handleCancelExport={handleCancelExport}
					handleRetrySaveExport={handleRetrySaveExport}
					handleStartExportFromDropdown={handleStartExportFromDropdown}
					revealExportedFile={revealExportedFile}
					exportMessage={exportMessage}
					projectPath={project.currentProjectPath}
					projectTitle={projectDisplayName}
					prepareExportForShare={props.prepareExportForShare}
					onRequestShareSignIn={props.onRequestShareSignIn}
					shareRequestNonce={props.shareRequestNonce}
					authToken={props.authToken}
					duration={props.duration}
				/>
			</div>
		</header>
	);
}
