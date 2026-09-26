import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "/tmp/unused" } }));
vi.mock("../../appPaths", () => ({
	USER_DATA_PATH: "/tmp/unused",
	RECORDINGS_DIR: "/tmp/unused",
}));

const { createReplayBufferSettingsStore } = await import("./replayBufferSettingsStore");

let filePath = "";

beforeEach(async () => {
	const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "replay-settings-")));
	filePath = path.join(root, "replay-buffer-settings.json");
});

afterEach(async () => {
	await fs.rm(path.dirname(filePath), { recursive: true, force: true });
});

describe("createReplayBufferSettingsStore", () => {
	it("defaults to disabled with a 60s buffer when no file exists", async () => {
		const store = createReplayBufferSettingsStore(filePath);
		expect(await store.read()).toEqual({ enabled: false, durationSec: 60 });
	});

	it("persists an update and reads it back", async () => {
		const store = createReplayBufferSettingsStore(filePath);
		await store.update({ enabled: true, durationSec: 120 });
		expect(await store.read()).toEqual({ enabled: true, durationSec: 120 });
	});

	it("merges a partial update onto existing settings", async () => {
		const store = createReplayBufferSettingsStore(filePath);
		await store.update({ enabled: true, durationSec: 120 });
		await store.update({ enabled: false });
		expect(await store.read()).toEqual({ enabled: false, durationSec: 120 });
	});

	it("rejects an unsupported duration and falls back to the default", async () => {
		const store = createReplayBufferSettingsStore(filePath);
		await store.update({ durationSec: 45 });
		expect((await store.read()).durationSec).toBe(60);
	});

	it("treats a corrupt settings file as defaults rather than throwing", async () => {
		await fs.writeFile(filePath, "{ not valid json", "utf-8");
		const store = createReplayBufferSettingsStore(filePath);
		expect(await store.read()).toEqual({ enabled: false, durationSec: 60 });
	});

	it("serializes concurrent updates instead of racing", async () => {
		const store = createReplayBufferSettingsStore(filePath);
		await Promise.all([
			store.update({ durationSec: 30 }),
			store.update({ durationSec: 300 }),
			store.update({ enabled: true }),
		]);
		const result = await store.read();
		expect(result.enabled).toBe(true);
		expect([30, 300]).toContain(result.durationSec);
	});
});
