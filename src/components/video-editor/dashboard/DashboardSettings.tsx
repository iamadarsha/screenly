import { SettingsSections, SettingsCategory } from "../SettingsSections";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SettingsRow } from "../SettingsRow";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { supportsHudCaptureProtection } from "@/lib/hudCaptureProtection";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const REPLAY_BUFFER_DURATION_OPTIONS = [
	{ value: 30, label: "Last 30 seconds" },
	{ value: 60, label: "Last 1 minute" },
	{ value: 120, label: "Last 2 minutes" },
	{ value: 300, label: "Last 5 minutes" },
];
export const DashboardSettingsContext = createContext<ReactNode>(null);
export function DashboardSettings({ onImportFile }: { onImportFile: () => Promise<void> }) {
	const settingsContent = useContext(DashboardSettingsContext);
	const [directory, setDirectory] = useState("");
	const [recordings, setRecordings] = useState("");
	const [hideHud, setHideHud] = useState(true);
	const [captureSupported, setCaptureSupported] = useState(false);
	const [replayBufferEnabled, setReplayBufferEnabled] = useState(false);
	const [replayBufferDurationSec, setReplayBufferDurationSec] = useState(60);
	const [busy, setBusy] = useState(false);
	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		try {
			await action();
		} catch (error) {
			toast.error(String(error));
		} finally {
			setBusy(false);
		}
	};
	useEffect(() => {
		let active = true;
		void Promise.all([
			window.electronAPI.getRecordingsDirectory(),
			window.electronAPI.getHudOverlayCaptureProtection(),
			window.electronAPI.getPlatform(),
			window.electronAPI.getReplayBufferSettings(),
		])
			.then(([directory, protection, platform, replayBuffer]) => {
				if (!active) return;
				if (directory.success) setRecordings(directory.path);
				if (protection.success) setHideHud(protection.enabled);
				setCaptureSupported(supportsHudCaptureProtection(platform));
				if (replayBuffer.success) {
					setReplayBufferEnabled(replayBuffer.enabled);
					setReplayBufferDurationSec(replayBuffer.durationSec);
				}
			})
			.catch((error) => toast.error(String(error)));
		return () => {
			active = false;
		};
	}, []);
	return (
		<section aria-label="Dashboard settings" className="dashboard-settings max-w-2xl py-10">
			<h1 className="mb-8 text-lg font-semibold">Settings</h1>
			<SettingsSections categories={["general", "motion", "recording", "files", "advanced"]}>
				<SettingsCategory category={["general", "motion", "advanced"]}>
					{settingsContent}
				</SettingsCategory>
				<SettingsCategory category="files">
					<SettingsRow title="Open video or project">
						<Button
							variant="secondary"
							size="sm"
							disabled={busy}
							onClick={() => void run(onImportFile)}
						>
							Open file
						</Button>
					</SettingsRow>
				</SettingsCategory>
				<SettingsCategory category="recording">
					<SettingsRow
						title="Recordings folder"
						description={
							<span className="block truncate" title={recordings}>
								{recordings}
							</span>
						}
					>
						<Button
							variant="secondary"
							size="sm"
							disabled={busy}
							onClick={() =>
								void run(async () => {
									const result =
										await window.electronAPI.chooseRecordingsDirectory();
									if (result.canceled) return;
									if (!result.success || !result.path)
										throw Error("Could not change recordings folder");
									setRecordings(result.path);
								})
							}
						>
							Change folder
						</Button>
					</SettingsRow>
					{captureSupported && (
						<SettingsRow
							title="Hide HUD from recordings"
							description="Only while recording. The idle HUD stays visible in captures."
						>
							<Switch
								aria-label="Hide HUD from recordings"
								checked={hideHud}
								disabled={busy}
								onCheckedChange={(enabled) =>
									void run(async () => {
										const result =
											await window.electronAPI.setHudOverlayCaptureProtection(
												enabled,
											);
										if (!result.success)
											throw Error("Could not update capture protection");
										setHideHud(result.enabled);
									})
								}
							/>
						</SettingsRow>
					)}
					<SettingsRow
						title="Instant Replay"
						description="Continuously captures your screen in the background so you can save the last few minutes with Cmd/Ctrl+Shift+R, even if you never pressed record."
					>
						<Switch
							aria-label="Instant Replay"
							checked={replayBufferEnabled}
							disabled={busy}
							onCheckedChange={(enabled) =>
								void run(async () => {
									const result = await window.electronAPI.setReplayBufferSettings({
										enabled,
									});
									if (!result.success)
										throw Error(result.error || "Could not update Instant Replay");
									setReplayBufferEnabled(result.enabled ?? enabled);
								})
							}
						/>
					</SettingsRow>
					{replayBufferEnabled && (
						<SettingsRow title="Instant Replay buffer length">
							<Select
								value={String(replayBufferDurationSec)}
								onValueChange={(value) =>
									void run(async () => {
										const durationSec = Number(value);
										const result = await window.electronAPI.setReplayBufferSettings(
											{ durationSec },
										);
										if (!result.success)
											throw Error(
												result.error || "Could not update Instant Replay",
											);
										setReplayBufferDurationSec(result.durationSec ?? durationSec);
									})
								}
								disabled={busy}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="z-[100]">
									{REPLAY_BUFFER_DURATION_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={String(option.value)}
											className="text-foreground focus:bg-foreground/10 focus:text-foreground"
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SettingsRow>
					)}
				</SettingsCategory>
				<SettingsCategory category="advanced">
					{import.meta.env.DEV && (
						<SettingsRow title="Preview update UI">
							<Button
								variant="secondary"
								size="sm"
								disabled={busy}
								onClick={() =>
									void run(async () => {
										await window.electronAPI.previewUpdateToast();
									})
								}
							>
								Preview
							</Button>
						</SettingsRow>
					)}
				</SettingsCategory>
				<SettingsCategory category="files">
					<SettingsRow
						title="Projects folder"
						description={directory || "Named projects save automatically."}
					>
						<Button
							variant="secondary"
							size="sm"
							onClick={async () => {
								try {
									const result = await window.electronAPI.getProjectsDirectory();
									if (!result.success || !result.path)
										throw Error("Could not open projects folder");
									setDirectory(result.path);
									await window.electronAPI.revealInFolder(result.path);
								} catch (e) {
									toast.error(String(e));
								}
							}}
						>
							Show folder
						</Button>
					</SettingsRow>
					<p className="text-xs text-muted-foreground">
						Named projects save automatically. Previews refresh when you return to
						Projects.
					</p>
				</SettingsCategory>
			</SettingsSections>
		</section>
	);
}
