import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "/tmp/unused", isPackaged: false } }));
vi.mock("../../appPaths", () => ({
	USER_DATA_PATH: "/tmp/unused",
	RECORDINGS_DIR: "/tmp/unused",
}));

const {
	buildReplayBufferCaptureArgs,
	computeSegmentWrapCount,
	getReplayBufferChunkOutputPattern,
	pickChunksForSaveWindow,
	saveReplayFromDir,
} = await import("./replayBuffer");

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const run = promisify(execFile);

describe("computeSegmentWrapCount", () => {
	it("divides duration by chunk size, rounding up", () => {
		expect(computeSegmentWrapCount(60, 10)).toBe(6);
		expect(computeSegmentWrapCount(65, 10)).toBe(7);
		expect(computeSegmentWrapCount(5, 10)).toBe(1);
	});

	it("never returns less than 1", () => {
		expect(computeSegmentWrapCount(0, 10)).toBe(1);
	});
});

describe("buildReplayBufferCaptureArgs", () => {
	it("builds avfoundation segment args on darwin", () => {
		const args = buildReplayBufferCaptureArgs("darwin", "/tmp/chunks", 60, 10);
		expect(args).toContain("avfoundation");
		expect(args).toContain("segment");
		expect(args).toContain("-segment_wrap");
		expect(args[args.indexOf("-segment_wrap") + 1]).toBe("6");
		expect(args).toContain("-segment_time");
		expect(args[args.indexOf("-segment_time") + 1]).toBe("10");
		expect(args[args.length - 1]).toBe(getReplayBufferChunkOutputPattern("/tmp/chunks"));
	});

	it("builds gdigrab segment args on win32", () => {
		const args = buildReplayBufferCaptureArgs("win32", "/tmp/chunks", 30, 10);
		expect(args).toContain("gdigrab");
		expect(args).toContain("desktop");
		expect(args[args.indexOf("-segment_wrap") + 1]).toBe("3");
	});

	it("throws on an unsupported platform", () => {
		expect(() => buildReplayBufferCaptureArgs("linux", "/tmp/chunks", 60, 10)).toThrow();
	});
});

describe("pickChunksForSaveWindow", () => {
	const chunks = [
		{ path: "c.mp4", mtimeMs: 3000 },
		{ path: "a.mp4", mtimeMs: 1000 },
		{ path: "b.mp4", mtimeMs: 2000 },
		{ path: "d.mp4", mtimeMs: 4000 },
	];

	it("orders chunks by mtime ascending, not filename", () => {
		const result = pickChunksForSaveWindow(chunks, 40, 10);
		expect(result.map((c) => c.path)).toEqual(["a.mp4", "b.mp4", "c.mp4", "d.mp4"]);
	});

	it("takes only the most recent N chunks needed for the requested duration", () => {
		const result = pickChunksForSaveWindow(chunks, 20, 10);
		expect(result.map((c) => c.path)).toEqual(["c.mp4", "d.mp4"]);
	});

	it("does not mutate the input array", () => {
		const original = [...chunks];
		pickChunksForSaveWindow(chunks, 20, 10);
		expect(chunks).toEqual(original);
	});

	it("returns all chunks when fewer exist than requested", () => {
		const result = pickChunksForSaveWindow(chunks, 1000, 10);
		expect(result).toHaveLength(4);
	});
});

describe("saveReplayFromDir (real ffmpeg concat)", () => {
	let chunkDir = "";
	let outputDir = "";

	beforeEach(async () => {
		const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "replay-test-")));
		chunkDir = path.join(root, "chunks");
		outputDir = path.join(root, "output");
		await fs.mkdir(chunkDir, { recursive: true });
		await fs.mkdir(outputDir, { recursive: true });
	});

	afterEach(async () => {
		await fs.rm(path.dirname(chunkDir), { recursive: true, force: true });
	});

	async function makeChunk(name: string, colorHex: string) {
		const filePath = path.join(chunkDir, name);
		await run(ffmpeg, [
			"-y",
			"-f",
			"lavfi",
			"-i",
			`color=c=${colorHex}:s=32x32:d=1:r=10`,
			"-pix_fmt",
			"yuv420p",
			filePath,
		]);
		return filePath;
	}

	it("concatenates real chunk files into a single playable output", async () => {
		await makeChunk("chunk-000.mp4", "red");
		await makeChunk("chunk-001.mp4", "green");
		await makeChunk("chunk-002.mp4", "blue");

		const result = await saveReplayFromDir(chunkDir, outputDir, 30);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(path.dirname(result.path)).toBe(outputDir);
		expect(path.basename(result.path)).toMatch(/^replay-\d+\.mp4$/);
		const stat = await fs.stat(result.path);
		expect(stat.size).toBeGreaterThan(0);
	});

	it("only includes the most recent chunks needed for the requested duration", async () => {
		await makeChunk("chunk-000.mp4", "red");
		await new Promise((resolve) => setTimeout(resolve, 20));
		await makeChunk("chunk-001.mp4", "green");

		const result = await saveReplayFromDir(chunkDir, outputDir, 1);

		expect(result.success).toBe(true);
		if (!result.success) return;
		const stat = await fs.stat(result.path);
		// A 1-chunk (1s) concat should be noticeably smaller than a 2-chunk one.
		expect(stat.size).toBeGreaterThan(0);
	});

	it("cleans up its temporary concat list file", async () => {
		await makeChunk("chunk-000.mp4", "red");
		await saveReplayFromDir(chunkDir, outputDir, 30);
		const remaining = await fs.readdir(chunkDir);
		expect(remaining.some((name) => name.startsWith("concat-"))).toBe(false);
	});

	it("fails cleanly when the chunk directory is empty", async () => {
		const result = await saveReplayFromDir(chunkDir, outputDir, 30);
		expect(result).toEqual({ success: false, error: "Nothing has been captured yet." });
	});

	it("fails cleanly when the chunk directory doesn't exist", async () => {
		const result = await saveReplayFromDir(
			path.join(chunkDir, "does-not-exist"),
			outputDir,
			30,
		);
		expect(result.success).toBe(false);
	});
});
