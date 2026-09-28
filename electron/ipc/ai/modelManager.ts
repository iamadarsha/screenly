import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { get as httpsGet } from "node:https";
import path from "node:path";

/**
 * Generic local-model download/verification/storage manager for Phase 4C's
 * "local reasoning runtime." Deliberately not tied to any specific model —
 * whichever model gets chosen (Gemma 4 E4B, something smaller, etc.) plugs in
 * as a `ModelDescriptor` rather than needing its own bespoke downloader.
 *
 * This is separate from `electron/ipc/captions/whisper.ts`'s existing
 * whisper-model downloader (which stays as-is, untouched, still used for
 * ASR) — that downloader has no checksum verification or cancellation, and
 * changing its shared `downloadFileWithProgress` risked regressing a
 * working, already-shipped feature. This module adds those two things fresh.
 */

export type ModelStatus = "not-downloaded" | "downloaded" | "corrupted";

export interface ModelDescriptor {
	/** Stable id for this model, used only for logging/progress events. */
	id: string;
	url: string;
	/** Lowercase hex SHA-256 of the expected file contents. */
	sha256: string;
	destinationPath: string;
}

export interface ModelDownloadResult {
	success: boolean;
	path?: string;
	error?: string;
	cancelled?: boolean;
}

function tempPathFor(destinationPath: string): string {
	return `${destinationPath}.download`;
}

export function computeFileSha256(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = createHash("sha256");
		const stream = createReadStream(filePath);
		stream.on("data", (chunk) => hash.update(chunk));
		stream.on("error", reject);
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}

function normalizeHash(value: string): string {
	return value.trim().toLowerCase();
}

/**
 * Checks whether a model is present and intact. A file that exists but fails
 * checksum verification is reported as "corrupted", not silently treated as
 * missing or as usable — callers should offer to re-download, never load it.
 */
export async function getModelStatus(descriptor: ModelDescriptor): Promise<ModelStatus> {
	try {
		await fs.access(descriptor.destinationPath);
	} catch {
		return "not-downloaded";
	}

	const actualHash = await computeFileSha256(descriptor.destinationPath);
	return normalizeHash(actualHash) === normalizeHash(descriptor.sha256)
		? "downloaded"
		: "corrupted";
}

/**
 * Downloads to a `.download` temp path, verifies its checksum, and only then
 * renames it into place — a partial or corrupted download can never be
 * mistaken for a real, usable model file. Supports cancellation via
 * `signal`: an already-aborted or later-aborted signal destroys the
 * in-flight request and reports `{ success: false, cancelled: true }`
 * (not an error) rather than throwing.
 */
export function downloadModel(
	descriptor: ModelDescriptor,
	options: { onProgress?: (progress: number) => void; signal?: AbortSignal } = {},
): Promise<ModelDownloadResult> {
	const { onProgress, signal } = options;
	const temp = tempPathFor(descriptor.destinationPath);

	const cleanupTemp = () => fs.rm(temp, { force: true }).catch(() => undefined);

	if (signal?.aborted) {
		return Promise.resolve({ success: false, cancelled: true });
	}

	return new Promise((resolve) => {
		let settled = false;
		const settle = (result: ModelDownloadResult) => {
			if (settled) return;
			settled = true;
			resolve(result);
		};

		const runRequest = async () => {
			await fs.mkdir(path.dirname(descriptor.destinationPath), { recursive: true });
			await cleanupTemp();

			const request = (currentUrl: string, redirectCount = 0) => {
				const req = httpsGet(currentUrl, { timeout: 30_000 }, (response) => {
					const statusCode = response.statusCode ?? 0;
					const location = response.headers.location;

					if (statusCode >= 300 && statusCode < 400 && location) {
						response.resume();
						if (redirectCount >= 5) {
							settle({ success: false, error: "Too many redirects while downloading model." });
							return;
						}
						request(new URL(location, currentUrl).toString(), redirectCount + 1);
						return;
					}

					if (statusCode < 200 || statusCode >= 300) {
						response.resume();
						settle({
							success: false,
							error: `Model download failed with status ${statusCode}.`,
						});
						return;
					}

					const totalBytes = Number.parseInt(
						String(response.headers["content-length"] ?? "0"),
						10,
					);
					let downloadedBytes = 0;
					const fileStream = createWriteStream(temp);

					response.on("data", (chunk: Buffer) => {
						downloadedBytes += chunk.length;
						if (Number.isFinite(totalBytes) && totalBytes > 0) {
							onProgress?.(Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)));
						}
					});
					response.on("error", (error) => fileStream.destroy(error));
					fileStream.on("error", (error) => {
						response.destroy();
						void cleanupTemp().then(() =>
							settle({ success: false, error: error.message }),
						);
					});
					fileStream.on("finish", () => {
						void (async () => {
							const actualHash = await computeFileSha256(temp);
							if (normalizeHash(actualHash) !== normalizeHash(descriptor.sha256)) {
								await cleanupTemp();
								settle({
									success: false,
									error: "Downloaded file failed checksum verification.",
								});
								return;
							}
							await fs.rename(temp, descriptor.destinationPath);
							onProgress?.(100);
							settle({ success: true, path: descriptor.destinationPath });
						})();
					});

					response.pipe(fileStream);
				});

				req.on("error", (error) => {
					void cleanupTemp().then(() => settle({ success: false, error: error.message }));
				});
				req.on("timeout", () => req.destroy(new Error("Model download timed out.")));

				signal?.addEventListener(
					"abort",
					() => {
						req.destroy();
						void cleanupTemp().then(() => settle({ success: false, cancelled: true }));
					},
					{ once: true },
				);
			};

			request(descriptor.url);
		};

		void runRequest().catch((error) => {
			void cleanupTemp().then(() =>
				settle({ success: false, error: error instanceof Error ? error.message : String(error) }),
			);
		});
	});
}

export async function deleteModel(descriptor: ModelDescriptor): Promise<void> {
	await fs.rm(descriptor.destinationPath, { force: true });
	await fs.rm(tempPathFor(descriptor.destinationPath), { force: true });
}
