import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

type RecoverableRecording = Awaited<
	ReturnType<NonNullable<typeof window.electronAPI.getRecoverableRecordings>>
>[number];

function formatTimestamp(ms: number): string {
	try {
		return new Date(ms).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
}

function formatSize(bytes: number): string {
	if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
	if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
	return `${(bytes / 1024).toFixed(0)} KB`;
}

export function RecoverableRecordingsDialog({
	onRecovered,
}: {
	onRecovered: () => void;
}) {
	const [recordings, setRecordings] = useState<RecoverableRecording[] | null>(null);
	const [busyPath, setBusyPath] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window.electronAPI?.getRecoverableRecordings !== "function") return;
		let cancelled = false;
		void window.electronAPI
			.getRecoverableRecordings()
			.then((result) => {
				if (!cancelled) setRecordings(result);
			})
			.catch(() => {
				if (!cancelled) setRecordings([]);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!recordings || recordings.length === 0) return null;

	const resolveOne = async (checkpointPath: string, deleteVideo: boolean) => {
		setBusyPath(checkpointPath);
		try {
			await window.electronAPI.discardRecoverableRecording(checkpointPath, deleteVideo);
			setRecordings((current) =>
				(current ?? []).filter((entry) => entry.checkpointPath !== checkpointPath),
			);
			onRecovered();
			if (deleteVideo) {
				toast.success("Recording discarded");
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not update the recording");
		} finally {
			setBusyPath(null);
		}
	};

	return (
		<Dialog open onOpenChange={() => undefined}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						{recordings.length === 1
							? "Screenly protected an interrupted recording"
							: `Screenly protected ${recordings.length} interrupted recordings`}
					</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Screenly didn't shut down cleanly last time. These recordings were saved up
					to the point of interruption and are already in your library.
				</p>
				<div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
					{recordings.map((entry) => (
						<div
							key={entry.checkpointPath}
							className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									Protected up to {formatTimestamp(entry.lastHeartbeatAt)}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatSize(entry.fileSizeBytes)}
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								disabled={busyPath === entry.checkpointPath}
								onClick={() => void resolveOne(entry.checkpointPath, true)}
							>
								Discard
							</Button>
						</div>
					))}
				</div>
				<DialogFooter>
					<Button
						disabled={busyPath !== null}
						onClick={() => {
							for (const entry of recordings) {
								void resolveOne(entry.checkpointPath, false);
							}
						}}
					>
						Keep all in library
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
