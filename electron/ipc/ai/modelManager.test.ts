import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpsGetMock = vi.fn();
vi.mock("node:https", () => ({
	get: (...args: unknown[]) => httpsGetMock(...(args as Parameters<typeof httpsGetMock>)),
}));

const {
	computeFileSha256,
	deleteModel,
	downloadModel,
	getModelStatus,
} = await import("./modelManager");

function sha256Of(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

function mockResponse(
	body: string,
	options: { statusCode?: number; headers?: Record<string, string> } = {},
) {
	const readable = Readable.from([Buffer.from(body)]);
	return Object.assign(readable, {
		statusCode: options.statusCode ?? 200,
		headers: { "content-length": String(body.length), ...options.headers },
	});
}

function mockRequest() {
	const emitter = new EventEmitter();
	return Object.assign(emitter, { destroy: vi.fn() });
}

/** Wires httpsGetMock to respond once with the given body/status, async (next microtask). */
function respondWith(body: string, options?: { statusCode?: number; headers?: Record<string, string> }) {
	const req = mockRequest();
	httpsGetMock.mockImplementationOnce((_url: string, _opts: unknown, callback: (r: unknown) => void) => {
		queueMicrotask(() => callback(mockResponse(body, options)));
		return req;
	});
	return req;
}

let directory: string;

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "screenly-model-manager-"));
	httpsGetMock.mockReset();
});

afterEach(async () => {
	await fs.rm(directory, { recursive: true, force: true });
});

describe("computeFileSha256", () => {
	it("computes the sha256 of a file's contents", async () => {
		const filePath = path.join(directory, "sample.bin");
		await fs.writeFile(filePath, "hello world");
		expect(await computeFileSha256(filePath)).toBe(sha256Of("hello world"));
	});
});

describe("getModelStatus", () => {
	it("reports not-downloaded when the file doesn't exist", async () => {
		const status = await getModelStatus({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("content"),
			destinationPath: path.join(directory, "missing.bin"),
		});
		expect(status).toBe("not-downloaded");
	});

	it("reports downloaded when the file matches the expected checksum", async () => {
		const destinationPath = path.join(directory, "model.bin");
		await fs.writeFile(destinationPath, "content");
		const status = await getModelStatus({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("content"),
			destinationPath,
		});
		expect(status).toBe("downloaded");
	});

	it("reports corrupted when the file exists but fails checksum verification", async () => {
		const destinationPath = path.join(directory, "model.bin");
		await fs.writeFile(destinationPath, "tampered content");
		const status = await getModelStatus({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("original content"),
			destinationPath,
		});
		expect(status).toBe("corrupted");
	});

	it("is case-insensitive when comparing checksums", async () => {
		const destinationPath = path.join(directory, "model.bin");
		await fs.writeFile(destinationPath, "content");
		const status = await getModelStatus({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("content").toUpperCase(),
			destinationPath,
		});
		expect(status).toBe("downloaded");
	});
});

describe("downloadModel", () => {
	it("downloads, verifies checksum, and renames into place on success", async () => {
		const destinationPath = path.join(directory, "model.bin");
		respondWith("real model bytes");

		const result = await downloadModel({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("real model bytes"),
			destinationPath,
		});

		expect(result).toEqual({ success: true, path: destinationPath });
		expect(await fs.readFile(destinationPath, "utf8")).toBe("real model bytes");
		await expect(fs.access(`${destinationPath}.download`)).rejects.toThrow();
	});

	it("rejects and cleans up the temp file when the checksum doesn't match", async () => {
		const destinationPath = path.join(directory, "model.bin");
		respondWith("corrupted in transit");

		const result = await downloadModel({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("expected bytes"),
			destinationPath,
		});

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/checksum/i);
		await expect(fs.access(destinationPath)).rejects.toThrow();
		await expect(fs.access(`${destinationPath}.download`)).rejects.toThrow();
	});

	it("reports a non-2xx status as a failure without touching the destination", async () => {
		const destinationPath = path.join(directory, "model.bin");
		respondWith("not found", { statusCode: 404 });

		const result = await downloadModel({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("anything"),
			destinationPath,
		});

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/404/);
		await expect(fs.access(destinationPath)).rejects.toThrow();
	});

	it("reports cancellation (not an error) when the signal aborts before starting", async () => {
		const destinationPath = path.join(directory, "model.bin");
		const controller = new AbortController();
		controller.abort();

		const result = await downloadModel(
			{ id: "m", url: "https://example.test/model.bin", sha256: sha256Of("x"), destinationPath },
			{ signal: controller.signal },
		);

		expect(result).toEqual({ success: false, cancelled: true });
		expect(httpsGetMock).not.toHaveBeenCalled();
	});

	it("reports progress as bytes arrive", async () => {
		const destinationPath = path.join(directory, "model.bin");
		const body = "x".repeat(1000);
		respondWith(body);
		const onProgress = vi.fn();

		await downloadModel(
			{ id: "m", url: "https://example.test/model.bin", sha256: sha256Of(body), destinationPath },
			{ onProgress },
		);

		expect(onProgress).toHaveBeenCalled();
		expect(onProgress).toHaveBeenLastCalledWith(100);
	});
});

describe("deleteModel", () => {
	it("removes both the model file and any leftover temp download", async () => {
		const destinationPath = path.join(directory, "model.bin");
		await fs.writeFile(destinationPath, "content");
		await fs.writeFile(`${destinationPath}.download`, "partial");

		await deleteModel({
			id: "m",
			url: "https://example.test/model.bin",
			sha256: sha256Of("content"),
			destinationPath,
		});

		await expect(fs.access(destinationPath)).rejects.toThrow();
		await expect(fs.access(`${destinationPath}.download`)).rejects.toThrow();
	});

	it("is a no-op when nothing exists", async () => {
		await expect(
			deleteModel({
				id: "m",
				url: "https://example.test/model.bin",
				sha256: sha256Of("content"),
				destinationPath: path.join(directory, "missing.bin"),
			}),
		).resolves.toBeUndefined();
	});
});
