import fs from "node:fs/promises";
import path from "node:path";
import { RECORDING_CHECKPOINT_SUFFIX } from "../constants";
import type { RecordingCheckpoint, RecoverableRecording } from "../types";
import { normalizeVideoSourcePath, parseJsonWithByteOrderMark } from "../utils";

export function getRecordingCheckpointPath(videoPath: string): string {
	const extension = path.extname(videoPath);
	const baseName = path.basename(videoPath, extension);
	return path.join(path.dirname(videoPath), `${baseName}${RECORDING_CHECKPOINT_SUFFIX}`);
}

export async function writeRecordingCheckpointStart(params: {
	videoPath: string;
	backend: RecordingCheckpoint["backend"];
	capturesMicrophone: boolean;
	capturesSystemAudio: boolean;
	capturesWebcam: boolean;
}): Promise<void> {
	const normalizedVideoPath = normalizeVideoSourcePath(params.videoPath);
	if (!normalizedVideoPath) return;

	const now = Date.now();
	const checkpoint: RecordingCheckpoint = {
		version: 1,
		videoFileName: path.basename(normalizedVideoPath),
		backend: params.backend,
		startedAt: now,
		lastHeartbeatAt: now,
		capturesMicrophone: params.capturesMicrophone,
		capturesSystemAudio: params.capturesSystemAudio,
		capturesWebcam: params.capturesWebcam,
	};

	const checkpointPath = getRecordingCheckpointPath(normalizedVideoPath);
	await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf-8");
}

export async function updateRecordingCheckpointHeartbeat(videoPath: string): Promise<void> {
	const normalizedVideoPath = normalizeVideoSourcePath(videoPath);
	if (!normalizedVideoPath) return;

	const checkpointPath = getRecordingCheckpointPath(normalizedVideoPath);
	try {
		const content = await fs.readFile(checkpointPath, "utf-8");
		const parsed = parseJsonWithByteOrderMark<RecordingCheckpoint>(content);
		parsed.lastHeartbeatAt = Date.now();
		await fs.writeFile(checkpointPath, JSON.stringify(parsed, null, 2), "utf-8");
	} catch {
		// Checkpoint was never written (e.g. recording started before this feature
		// existed on disk, or the file was removed out-of-band). Nothing to update.
	}
}

export async function finalizeRecordingCheckpoint(videoPath: string): Promise<void> {
	const normalizedVideoPath = normalizeVideoSourcePath(videoPath);
	if (!normalizedVideoPath) return;

	const checkpointPath = getRecordingCheckpointPath(normalizedVideoPath);
	await fs.rm(checkpointPath, { force: true });
}

export async function scanForRecoverableRecordings(
	recordingsDir: string,
): Promise<RecoverableRecording[]> {
	let entries: string[];
	try {
		entries = await fs.readdir(recordingsDir);
	} catch {
		return [];
	}

	const results: RecoverableRecording[] = [];

	for (const entry of entries) {
		if (!entry.endsWith(RECORDING_CHECKPOINT_SUFFIX)) continue;

		const checkpointPath = path.join(recordingsDir, entry);
		try {
			const content = await fs.readFile(checkpointPath, "utf-8");
			const parsed = parseJsonWithByteOrderMark<Partial<RecordingCheckpoint>>(content);
			if (parsed.version !== 1 || typeof parsed.videoFileName !== "string") {
				await fs.rm(checkpointPath, { force: true });
				continue;
			}

			const videoPath = path.join(recordingsDir, parsed.videoFileName);
			const stat = await fs.stat(videoPath).catch(() => null);
			if (!stat || !stat.isFile() || stat.size <= 0) {
				// The recording that crashed never produced a usable file. Nothing to
				// recover; clean up the stale checkpoint so it doesn't get flagged again.
				await fs.rm(checkpointPath, { force: true });
				continue;
			}

			results.push({
				checkpointPath,
				videoPath,
				startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : stat.birthtimeMs,
				lastHeartbeatAt:
					typeof parsed.lastHeartbeatAt === "number" ? parsed.lastHeartbeatAt : stat.mtimeMs,
				fileSizeBytes: stat.size,
				backend:
					parsed.backend === "mac-screencapturekit" ||
					parsed.backend === "windows-wgc" ||
					parsed.backend === "ffmpeg" ||
					parsed.backend === "browser"
						? parsed.backend
						: "browser",
			});
		} catch {
			// Unreadable/corrupt checkpoint file. Leave it in place rather than
			// guessing and deleting a recording's recovery record.
		}
	}

	return results;
}

export async function discardRecoverableRecording(
	checkpointPath: string,
	options: { deleteVideo: boolean },
): Promise<void> {
	let videoPath: string | null = null;
	if (options.deleteVideo) {
		try {
			const content = await fs.readFile(checkpointPath, "utf-8");
			const parsed = parseJsonWithByteOrderMark<Partial<RecordingCheckpoint>>(content);
			if (typeof parsed.videoFileName === "string") {
				videoPath = path.join(path.dirname(checkpointPath), parsed.videoFileName);
			}
		} catch {
			// Nothing to look up; still remove the checkpoint below.
		}
	}

	await fs.rm(checkpointPath, { force: true });
	if (videoPath) {
		await fs.rm(videoPath, { force: true });
	}
}
