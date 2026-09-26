import fs from "node:fs";
import { DISK_SPACE_CRITICAL_BYTES, DISK_SPACE_LOW_WARNING_BYTES } from "../constants";

export type DiskSpaceStatus = "ok" | "low" | "critical" | "unknown";

export type DiskSpaceInfo = {
	status: DiskSpaceStatus;
	freeBytes: number | null;
};

export function classifyDiskSpace(freeBytes: number | null): DiskSpaceStatus {
	if (freeBytes === null || !Number.isFinite(freeBytes) || freeBytes < 0) {
		return "unknown";
	}
	if (freeBytes < DISK_SPACE_CRITICAL_BYTES) {
		return "critical";
	}
	if (freeBytes < DISK_SPACE_LOW_WARNING_BYTES) {
		return "low";
	}
	return "ok";
}

export function getFreeDiskBytes(
	targetPath: string,
	statfs: (path: string) => { bavail: number; bsize: number } = fs.statfsSync,
): number | null {
	try {
		const stats = statfs(targetPath);
		const free = stats.bavail * stats.bsize;
		return Number.isFinite(free) ? free : null;
	} catch {
		return null;
	}
}

export function getDiskSpaceStatus(
	targetPath: string,
	statfs?: (path: string) => { bavail: number; bsize: number },
): DiskSpaceInfo {
	const freeBytes = getFreeDiskBytes(targetPath, statfs);
	return { status: classifyDiskSpace(freeBytes), freeBytes };
}
