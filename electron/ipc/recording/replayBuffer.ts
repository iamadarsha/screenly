import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { REPLAY_BUFFER_CHUNK_SEC, REPLAY_BUFFER_DIR_NAME } from "../constants";
import { getFfmpegBinaryPath } from "../ffmpeg/binary";
import { getRecordingsDir } from "../utils";

const runFfmpeg = promisify(execFile);

export const REPLAY_BUFFER_CHUNK_FILENAME_PATTERN = "chunk-%03d.mp4";

/** How many rolling chunk files are needed to cover the requested buffer duration. */
export function computeSegmentWrapCount(
	durationSec: number,
	chunkSec: number = REPLAY_BUFFER_CHUNK_SEC,
): number {
	return Math.max(1, Math.ceil(durationSec / chunkSec));
}

export function getReplayBufferChunkOutputPattern(chunkDir: string): string {
	return path.join(chunkDir, REPLAY_BUFFER_CHUNK_FILENAME_PATTERN);
}

/**
 * Build the ffmpeg args for a continuously-running, disk-bounded segmented
 * capture: ffmpeg's own `segment`/`segment_wrap` muxer rotates through a fixed
 * set of chunk filenames, overwriting the oldest one once the buffer is full.
 * No custom chunk-rotation/cleanup code is needed - ffmpeg does it.
 *
 * Deliberately full-screen (primary display) only, not per-window: an instant
 * replay buffer is conceptually "what was on my screen a moment ago," and
 * scoping it to a single window would need to track window-focus changes over
 * the buffer's whole lifetime, which is real added complexity for a feature
 * whose entire value proposition is "always running in the background."
 */
export function buildReplayBufferCaptureArgs(
	platform: NodeJS.Platform,
	chunkDir: string,
	durationSec: number,
	chunkSec: number = REPLAY_BUFFER_CHUNK_SEC,
): string[] {
	const wrapCount = computeSegmentWrapCount(durationSec, chunkSec);
	const outputPattern = getReplayBufferChunkOutputPattern(chunkDir);
	const segmentArgs = [
		"-f",
		"segment",
		"-segment_time",
		String(chunkSec),
		"-segment_wrap",
		String(wrapCount),
		"-reset_timestamps",
		"1",
		"-c:v",
		"libx264",
		"-preset",
		"ultrafast",
		"-pix_fmt",
		"yuv420p",
		outputPattern,
	];

	if (platform === "darwin") {
		return [
			"-y",
			"-f",
			"avfoundation",
			"-capture_cursor",
			"1",
			"-framerate",
			"30",
			"-i",
			"1:none",
			...segmentArgs,
		];
	}

	if (platform === "win32") {
		return [
			"-y",
			"-f",
			"gdigrab",
			"-framerate",
			"30",
			"-draw_mouse",
			"1",
			"-i",
			"desktop",
			...segmentArgs,
		];
	}

	throw new Error(`Instant Replay is not supported on ${platform}`);
}

export type ReplayChunk = {
	path: string;
	mtimeMs: number;
};

/**
 * Pick and order the chunk files that together cover the requested save
 * window, most recent last. Chunks are selected by modification time, not
 * filename - ffmpeg's segment_wrap reuses filenames in a fixed rotation, so
 * "chunk-000.mp4" isn't reliably the oldest or newest at any given moment.
 */
export function pickChunksForSaveWindow(
	chunks: ReplayChunk[],
	requestedDurationSec: number,
	chunkSec: number = REPLAY_BUFFER_CHUNK_SEC,
): ReplayChunk[] {
	const wanted = computeSegmentWrapCount(requestedDurationSec, chunkSec);
	return [...chunks].sort((a, b) => a.mtimeMs - b.mtimeMs).slice(-wanted);
}

// ── Background capture lifecycle ────────────────────────────────────────────

let captureProcess: ChildProcessWithoutNullStreams | null = null;
let captureChunkDir: string | null = null;
let captureDurationSec = 0;

export function isReplayBufferCaptureActive(): boolean {
	return captureProcess !== null;
}

async function getReplayBufferChunkDir(): Promise<string> {
	const dir = path.join(await getRecordingsDir(), REPLAY_BUFFER_DIR_NAME);
	await fs.mkdir(dir, { recursive: true });
	return dir;
}

/**
 * Start (or restart, if already running with a different duration) the
 * background segmented capture. Entirely separate process/state from normal
 * recording - never touches nativeCaptureProcess/ffmpegCaptureProcess/etc, so
 * it cannot interfere with or be interfered with by an actual recording.
 */
export async function startReplayBufferCapture(durationSec: number): Promise<void> {
	if (captureProcess && captureDurationSec === durationSec) return;
	await stopReplayBufferCapture();

	const chunkDir = await getReplayBufferChunkDir();
	// Clear any chunks left over from a previous run so a stale chunk can never
	// be mistaken for part of the current buffer window.
	await clearReplayBufferChunks(chunkDir);

	const args = buildReplayBufferCaptureArgs(process.platform, chunkDir, durationSec);
	const proc = spawn(getFfmpegBinaryPath(), args, {
		cwd: chunkDir,
		stdio: ["pipe", "pipe", "pipe"],
	});
	captureProcess = proc;
	captureChunkDir = chunkDir;
	captureDurationSec = durationSec;

	proc.once("exit", () => {
		if (captureProcess === proc) {
			captureProcess = null;
		}
	});
}

export async function stopReplayBufferCapture(): Promise<void> {
	const proc = captureProcess;
	captureProcess = null;
	captureDurationSec = 0;
	if (!proc) return;

	await new Promise<void>((resolve) => {
		proc.once("exit", () => resolve());
		// A plain kill (not "q" over stdin) is fine here: chunks already
		// written to disk by the segment muxer are already valid, standalone
		// files - there's no in-progress single output to corrupt by not
		// flushing a trailer, unlike a normal single-file recording.
		proc.kill();
		setTimeout(resolve, 2_000);
	});

	if (captureChunkDir) {
		await clearReplayBufferChunks(captureChunkDir);
	}
	captureChunkDir = null;
}

async function clearReplayBufferChunks(chunkDir: string): Promise<void> {
	try {
		const entries = await fs.readdir(chunkDir);
		await Promise.all(
			entries.map((entry) => fs.rm(path.join(chunkDir, entry), { force: true })),
		);
	} catch {
		// Directory may not exist yet on a first run.
	}
}

export type SaveReplayResult =
	| { success: true; path: string }
	| { success: false; error: string };

/**
 * Concatenate the chunks covering the requested window into a single saved
 * file in the real recordings directory, using the same stream-copy concat
 * technique as the rest of the app's import pipeline (importRecording.ts) -
 * safe here because every chunk was encoded by the same continuous ffmpeg
 * process with identical codec parameters, so no re-encode is needed.
 *
 * Takes an explicit chunk directory so it can be exercised directly in tests
 * without a live capture process running.
 *
 * Known limitation: the background capture keeps writing/rotating chunks
 * while a save can run concurrently. There's a narrow race window where the
 * chunk `segment_wrap` is actively overwriting could be read mid-write,
 * producing a glitch at that one chunk's boundary. This affects at most one
 * of several chunks in the save window, not the whole replay, and closing it
 * fully would need cross-process file locking - a reasonable tradeoff to
 * accept rather than build given how narrow and low-impact the window is.
 */
export async function saveReplayFromDir(
	chunkDir: string,
	outputDir: string,
	requestedDurationSec: number,
): Promise<SaveReplayResult> {
	let entries: string[];
	try {
		entries = await fs.readdir(chunkDir);
	} catch (error) {
		return { success: false, error: String(error) };
	}

	const chunkFiles = entries.filter((name) => name.endsWith(".mp4"));
	if (chunkFiles.length === 0) {
		return { success: false, error: "Nothing has been captured yet." };
	}

	const stats = await Promise.all(
		chunkFiles.map(async (name) => {
			const filePath = path.join(chunkDir, name);
			const stat = await fs.stat(filePath).catch(() => null);
			return stat ? { path: filePath, mtimeMs: stat.mtimeMs } : null;
		}),
	);
	const chunks = stats.filter((entry): entry is ReplayChunk => entry !== null);
	const selected = pickChunksForSaveWindow(chunks, requestedDurationSec);
	if (selected.length === 0) {
		return { success: false, error: "Nothing has been captured yet." };
	}

	const outputPath = path.join(outputDir, `replay-${Date.now()}.mp4`);
	const listPath = path.join(chunkDir, `concat-${Date.now()}.txt`);
	const listContents = selected
		.map((chunk) => `file '${chunk.path.replace(/'/g, "'\\''")}'`)
		.join("\n");

	try {
		await fs.writeFile(listPath, listContents, "utf-8");
		await runFfmpeg(
			getFfmpegBinaryPath(),
			[
				"-hide_banner",
				"-loglevel",
				"error",
				"-nostdin",
				"-y",
				"-f",
				"concat",
				"-safe",
				"0",
				"-i",
				listPath,
				"-map",
				"0",
				"-c",
				"copy",
				outputPath,
			],
			{ timeout: 5 * 60 * 1000, maxBuffer: 1024 * 1024, windowsHide: true },
		);
		return { success: true, path: outputPath };
	} catch (error) {
		await fs.rm(outputPath, { force: true });
		return { success: false, error: String(error) };
	} finally {
		await fs.rm(listPath, { force: true });
	}
}

export async function saveReplay(requestedDurationSec: number): Promise<SaveReplayResult> {
	if (!captureChunkDir) {
		return { success: false, error: "Instant Replay is not currently running." };
	}
	const outputDir = await getRecordingsDir();
	return saveReplayFromDir(captureChunkDir, outputDir, requestedDurationSec);
}
