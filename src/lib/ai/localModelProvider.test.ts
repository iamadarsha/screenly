import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promptLocalModelForJson, resetLocalModelReadyState } from "./localModelProvider";

describe("localModelProvider", () => {
	beforeEach(() => {
		resetLocalModelReadyState();
		(globalThis as unknown as { window: unknown }).window = {};
	});

	afterEach(() => {
		resetLocalModelReadyState();
		delete (globalThis as unknown as { window?: unknown }).window;
	});

	it("returns unavailable when window is undefined", async () => {
		delete (globalThis as unknown as { window?: unknown }).window;
		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/not downloaded or unavailable/i);
		}
	});

	it("returns unavailable when window.electronAi is missing", async () => {
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "downloaded" }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/not downloaded or unavailable/i);
		}
	});

	it("returns unavailable when window.electronAPI.getAiModelStatus is missing", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockResolvedValue('{"key":"value"}'),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/not downloaded or unavailable/i);
		}
	});

	it("returns specific corrupted reason when model fails verification", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockResolvedValue('{"key":"value"}'),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "corrupted" }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/failed verification|re-download/i);
		}
	});

	it("returns specific reason when model status check fails", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockResolvedValue('{"key":"value"}'),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: false }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/unable to check/i);
		}
	});

	it("returns unavailable when model status is not-downloaded", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockResolvedValue('{"key":"value"}'),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "not-downloaded" }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toMatch(/not downloaded or unavailable/i);
		}
	});

	it("handles model creation failure gracefully and allows subsequent retry", async () => {
		const createMock = vi.fn().mockRejectedValueOnce(new Error("Model initialization crashed"));
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: createMock,
			prompt: vi.fn().mockResolvedValue('{"key":"value"}'),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "downloaded" }),
		};

		const result1 = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result1.ok).toBe(false);
		if (!result1.ok) {
			expect(result1.reason).toBe("Model initialization crashed");
		}

		// Subsequent attempt should retry rather than being permanently locked
		createMock.mockResolvedValueOnce(undefined);
		const result2 = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result2.ok).toBe(true);
	});

	it("handles model prompt throwing an error", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockRejectedValue(new Error("Inference timeout")),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "downloaded" }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe("Inference timeout");
		}
	});

	it("handles model returning malformed JSON", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockResolvedValue("This is not JSON at all"),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "downloaded" }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe("Model returned invalid JSON.");
		}
	});

	it("handles model returning JSON that fails schema validation", async () => {
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: vi.fn().mockResolvedValue(undefined),
			prompt: vi.fn().mockResolvedValue('{"wrongKey": 123}'),
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "downloaded" }),
		};

		const result = await promptLocalModelForJson({
			prompt: "test",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d && typeof d === "object" && "key" in d),
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe("Model output failed schema validation.");
		}
	});

	it("returns parsed and validated data on success without re-creating model on second call", async () => {
		const createMock = vi.fn().mockResolvedValue(undefined);
		const promptMock = vi.fn().mockResolvedValue('{"key":"hello"}');
		(window as unknown as { electronAi: unknown }).electronAi = {
			create: createMock,
			prompt: promptMock,
		};
		(window as unknown as { electronAPI: unknown }).electronAPI = {
			getAiModelStatus: vi.fn().mockResolvedValue({ success: true, status: "downloaded" }),
		};

		const result1 = await promptLocalModelForJson({
			prompt: "test 1",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d && typeof d === "object" && "key" in d),
		});

		expect(result1).toEqual({ ok: true, data: { key: "hello" } });
		expect(createMock).toHaveBeenCalledTimes(1);

		const result2 = await promptLocalModelForJson({
			prompt: "test 2",
			responseJSONSchema: {},
			validate: (d): d is { key: string } => Boolean(d && typeof d === "object" && "key" in d),
		});

		expect(result2).toEqual({ ok: true, data: { key: "hello" } });
		expect(createMock).toHaveBeenCalledTimes(1); // Cached, did not call create again!
	});
});
