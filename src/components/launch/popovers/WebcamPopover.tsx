import {
	Eye,
	EyeSlash as EyeOff,
	VideoCamera as Video,
	VideoCameraSlash as VideoOff,
} from "@/components/ui/icons";
import { useScopedT } from "@/contexts/I18nContext";
import { DropdownItem, HudPopover } from "./PopoverScaffold";
import { useLaunchPopoverCoordinator } from "./LaunchPopoverCoordinator";
import type { DeviceOption } from "./launchPopoverTypes";
import type { ReactElement } from "react";

const POPOVER_ID = "webcam";

export function WebcamPopover({
	trigger,
	disabled,
	webcamEnabled,
	onDisableWebcam,
	canToggleFloatingPreview,
	showFloatingWebcamPreview,
	onToggleFloatingPreview,
	showWebcamControls,
	setWebcamPreviewNode,
	videoDevices,
	webcamDeviceId,
	selectedVideoDeviceId,
	onSelectVideoDevice,
	cameraError,
	onRetryPreview,
}: {
	trigger: ReactElement;
	disabled?: boolean;
	webcamEnabled: boolean;
	onDisableWebcam: () => void;
	canToggleFloatingPreview: boolean;
	showFloatingWebcamPreview: boolean;
	onToggleFloatingPreview: () => void;
	showWebcamControls: boolean;
	setWebcamPreviewNode: (node: HTMLVideoElement | null) => void;
	videoDevices: DeviceOption[];
	webcamDeviceId?: string;
	selectedVideoDeviceId?: string;
	onSelectVideoDevice: (deviceId: string) => void;
	cameraError?: string | null;
	onRetryPreview?: () => void;
}) {
	const t = useScopedT("launch");
	const { isOpen, requestOpen, requestClose } = useLaunchPopoverCoordinator();
	const open = isOpen(POPOVER_ID);

	return (
		<HudPopover
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					requestClose(POPOVER_ID);
					return;
				}
				if (disabled) {
					return;
				}
				requestOpen(POPOVER_ID);
			}}
			trigger={trigger}
			align="center"
		>
			<div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--launch-label)]">
				{t("recording.webcam")}
			</div>
			{webcamEnabled && (
				<>
					<DropdownItem
						icon={<VideoOff size={16} />}
						onClick={() => {
							onDisableWebcam();
							requestClose(POPOVER_ID);
						}}
					>
						{t("recording.turnOffWebcam")}
					</DropdownItem>
					{canToggleFloatingPreview ? (
						<DropdownItem
							icon={
								showFloatingWebcamPreview ? <EyeOff size={16} /> : <Eye size={16} />
							}
							selected={showFloatingWebcamPreview}
							onClick={onToggleFloatingPreview}
						>
							{showFloatingWebcamPreview
								? t("recording.hideFloatingWebcamPreview")
								: t("recording.showFloatingWebcamPreview")}
						</DropdownItem>
					) : null}
				</>
			)}
			{!webcamEnabled && (
				<div className="px-3 py-2 text-xs text-[var(--launch-text-muted)]">
					{t("recording.selectWebcamToEnable")}
				</div>
			)}
			{cameraError && (
				<div className="mx-3 my-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex flex-col gap-1.5">
					<div className="flex items-center gap-1.5 font-medium">
						<span>⚠️</span>
						<span>Webcam Preview Issue</span>
					</div>
					<div className="text-[11px] leading-tight opacity-90">{cameraError}</div>
					{onRetryPreview && (
						<button
							type="button"
							onClick={onRetryPreview}
							className="mt-1 px-2 py-0.5 rounded bg-destructive/20 hover:bg-destructive/30 text-[11px] font-medium text-foreground self-start transition-colors"
						>
							Retry Camera
						</button>
					)}
				</div>
			)}
			{showWebcamControls && (
				<div className="flex justify-center px-3 py-2">
					<div className="h-24 w-24 overflow-hidden rounded-2xl bg-[var(--launch-hover)] ring-1 ring-[var(--launch-border-strong)]">
						<video
							ref={setWebcamPreviewNode}
							className="h-full w-full object-cover"
							autoPlay
							muted
							playsInline
							onLoadedMetadata={(e) => {
								void e.currentTarget.play().catch(() => {
									/* Autoplay policy / interruption ignored */
								});
							}}
							style={{ transform: "scaleX(-1)" }}
						/>
					</div>
				</div>
			)}
			{videoDevices.map((device) => (
				<DropdownItem
					key={device.deviceId}
					icon={
						webcamEnabled &&
						(webcamDeviceId === device.deviceId ||
							selectedVideoDeviceId === device.deviceId) ? (
							<Video size={16} />
						) : (
							<VideoOff size={16} />
						)
					}
					selected={
						webcamEnabled &&
						(webcamDeviceId === device.deviceId ||
							selectedVideoDeviceId === device.deviceId)
					}
					onClick={() => onSelectVideoDevice(device.deviceId)}
				>
					{device.label}
				</DropdownItem>
			))}
			{videoDevices.length === 0 && (
				<div className="text-center text-xs text-[var(--launch-text-muted)] py-4">
					{t("recording.noWebcamsFound")}
				</div>
			)}
		</HudPopover>
	);
}
