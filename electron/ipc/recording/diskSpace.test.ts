import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "/tmp/screenly-test" } }));
vi.mock("../../appPaths", () => ({
	USER_DATA_PATH: "/tmp/screenly-test",
	RECORDINGS_DIR: "/tmp/screenly-test",
}));

const { classifyDiskSpace, getDiskSpaceStatus, getFreeDiskBytes } = await import("./diskSpace");

describe("classifyDiskSpace", () => {
	it("returns unknown for null or invalid input", () => {
		expect(classifyDiskSpace(null)).toBe("unknown");
		expect(classifyDiskSpace(Number.NaN)).toBe("unknown");
		expect(classifyDiskSpace(-1)).toBe("unknown");
	});

	it("returns critical below the critical threshold", () => {
		expect(classifyDiskSpace(0)).toBe("critical");
		expect(classifyDiskSpace(100 * 1024 ** 2)).toBe("critical");
		expect(classifyDiskSpace(500 * 1024 ** 2 - 1)).toBe("critical");
	});

	it("returns low between critical and warning thresholds", () => {
		expect(classifyDiskSpace(500 * 1024 ** 2)).toBe("low");
		expect(classifyDiskSpace(1 * 1024 ** 3)).toBe("low");
		expect(classifyDiskSpace(2 * 1024 ** 3 - 1)).toBe("low");
	});

	it("returns ok at or above the warning threshold", () => {
		expect(classifyDiskSpace(2 * 1024 ** 3)).toBe("ok");
		expect(classifyDiskSpace(100 * 1024 ** 3)).toBe("ok");
	});
});

describe("getFreeDiskBytes", () => {
	it("computes free bytes from bavail * bsize", () => {
		const statfs = () => ({ bavail: 1000, bsize: 4096 });
		expect(getFreeDiskBytes("/some/path", statfs)).toBe(1000 * 4096);
	});

	it("returns null when statfs throws", () => {
		const statfs = () => {
			throw new Error("ENOENT");
		};
		expect(getFreeDiskBytes("/missing", statfs)).toBeNull();
	});

	it("returns null when the computed value is not finite", () => {
		const statfs = () => ({ bavail: Number.POSITIVE_INFINITY, bsize: 1 });
		expect(getFreeDiskBytes("/weird", statfs)).toBeNull();
	});
});

describe("getDiskSpaceStatus", () => {
	it("combines free-byte lookup with classification", () => {
		const statfs = () => ({ bavail: 100, bsize: 1024 ** 2 });
		const result = getDiskSpaceStatus("/some/path", statfs);
		expect(result).toEqual({ status: "critical", freeBytes: 100 * 1024 ** 2 });
	});

	it("reports unknown when the stat call fails", () => {
		const statfs = () => {
			throw new Error("EPERM");
		};
		const result = getDiskSpaceStatus("/blocked", statfs);
		expect(result).toEqual({ status: "unknown", freeBytes: null });
	});
});
