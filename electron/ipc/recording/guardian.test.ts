import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "/tmp/screenly-test" } }));
vi.mock("../../appPaths", () => ({
	USER_DATA_PATH: "/tmp/screenly-test",
	RECORDINGS_DIR: "/tmp/screenly-test",
}));

const {
	discardRecoverableRecording,
	finalizeRecordingCheckpoint,
	getRecordingCheckpointPath,
	scanForRecoverableRecordings,
	updateRecordingCheckpointHeartbeat,
	writeRecordingCheckpointStart,
} = await import("./guardian");

let root = "";

beforeEach(async () => {
	root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "screenly-guardian-")));
});

afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

describe("writeRecordingCheckpointStart + scanForRecoverableRecordings", () => {
	it("flags an in-progress recording as recoverable when its checkpoint is still present", async () => {
		const videoPath = path.join(root, "recording-1.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");

		await writeRecordingCheckpointStart({
			videoPath,
			backend: "mac-screencapturekit",
			capturesMicrophone: true,
			capturesSystemAudio: false,
			capturesWebcam: true,
		});

		const recoverable = await scanForRecoverableRecordings(root);
		expect(recoverable).toHaveLength(1);
		expect(recoverable[0]).toMatchObject({
			videoPath,
			backend: "mac-screencapturekit",
			fileSizeBytes: "fake-video-bytes".length,
		});
	});

	it("does not flag a recording that was cleanly finalized", async () => {
		const videoPath = path.join(root, "recording-2.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");
		await writeRecordingCheckpointStart({
			videoPath,
			backend: "windows-wgc",
			capturesMicrophone: false,
			capturesSystemAudio: false,
			capturesWebcam: false,
		});

		await finalizeRecordingCheckpoint(videoPath);

		expect(await scanForRecoverableRecordings(root)).toEqual([]);
	});

	it("cleans up a checkpoint whose video never materialized", async () => {
		const videoPath = path.join(root, "recording-3.mp4");
		await writeRecordingCheckpointStart({
			videoPath,
			backend: "ffmpeg",
			capturesMicrophone: false,
			capturesSystemAudio: true,
			capturesWebcam: false,
		});

		expect(await scanForRecoverableRecordings(root)).toEqual([]);
		// The stale checkpoint should have been removed, not just skipped.
		await expect(fs.access(getRecordingCheckpointPath(videoPath))).rejects.toThrow();
	});

	it("cleans up a checkpoint whose video exists but is empty", async () => {
		const videoPath = path.join(root, "recording-4.mp4");
		await fs.writeFile(videoPath, "");
		await writeRecordingCheckpointStart({
			videoPath,
			backend: "browser",
			capturesMicrophone: false,
			capturesSystemAudio: false,
			capturesWebcam: false,
		});

		expect(await scanForRecoverableRecordings(root)).toEqual([]);
	});

	it("leaves an unreadable/corrupt checkpoint in place rather than guessing", async () => {
		const videoPath = path.join(root, "recording-5.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");
		await fs.writeFile(getRecordingCheckpointPath(videoPath), "{ not valid json");

		expect(await scanForRecoverableRecordings(root)).toEqual([]);
		await expect(fs.access(getRecordingCheckpointPath(videoPath))).resolves.toBeUndefined();
	});

	it("discards a checkpoint that has a version other than 1", async () => {
		const videoPath = path.join(root, "recording-6.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");
		await fs.writeFile(
			getRecordingCheckpointPath(videoPath),
			JSON.stringify({ version: 2, videoFileName: "recording-6.mp4" }),
		);

		expect(await scanForRecoverableRecordings(root)).toEqual([]);
		await expect(fs.access(getRecordingCheckpointPath(videoPath))).rejects.toThrow();
	});
});

describe("updateRecordingCheckpointHeartbeat", () => {
	it("advances lastHeartbeatAt without touching other fields", async () => {
		const videoPath = path.join(root, "recording-7.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");
		await writeRecordingCheckpointStart({
			videoPath,
			backend: "mac-screencapturekit",
			capturesMicrophone: true,
			capturesSystemAudio: true,
			capturesWebcam: false,
		});

		const before = JSON.parse(
			await fs.readFile(getRecordingCheckpointPath(videoPath), "utf-8"),
		) as { lastHeartbeatAt: number; startedAt: number };

		await new Promise((resolve) => setTimeout(resolve, 5));
		await updateRecordingCheckpointHeartbeat(videoPath);

		const after = JSON.parse(
			await fs.readFile(getRecordingCheckpointPath(videoPath), "utf-8"),
		) as { lastHeartbeatAt: number; startedAt: number };

		expect(after.startedAt).toBe(before.startedAt);
		expect(after.lastHeartbeatAt).toBeGreaterThanOrEqual(before.lastHeartbeatAt);
	});

	it("is a no-op when no checkpoint exists", async () => {
		const videoPath = path.join(root, "never-started.mp4");
		await expect(updateRecordingCheckpointHeartbeat(videoPath)).resolves.toBeUndefined();
	});
});

describe("discardRecoverableRecording", () => {
	it("removes only the checkpoint when deleteVideo is false", async () => {
		const videoPath = path.join(root, "recording-8.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");
		await writeRecordingCheckpointStart({
			videoPath,
			backend: "browser",
			capturesMicrophone: false,
			capturesSystemAudio: false,
			capturesWebcam: false,
		});

		await discardRecoverableRecording(getRecordingCheckpointPath(videoPath), {
			deleteVideo: false,
		});

		await expect(fs.access(getRecordingCheckpointPath(videoPath))).rejects.toThrow();
		await expect(fs.access(videoPath)).resolves.toBeUndefined();
	});

	it("removes both the checkpoint and the video when deleteVideo is true", async () => {
		const videoPath = path.join(root, "recording-9.mp4");
		await fs.writeFile(videoPath, "fake-video-bytes");
		await writeRecordingCheckpointStart({
			videoPath,
			backend: "browser",
			capturesMicrophone: false,
			capturesSystemAudio: false,
			capturesWebcam: false,
		});

		await discardRecoverableRecording(getRecordingCheckpointPath(videoPath), {
			deleteVideo: true,
		});

		await expect(fs.access(getRecordingCheckpointPath(videoPath))).rejects.toThrow();
		await expect(fs.access(videoPath)).rejects.toThrow();
	});
});
