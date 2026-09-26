import fs from "node:fs/promises";
import { REPLAY_BUFFER_DURATIONS_SEC } from "../constants";
import { parseJsonWithByteOrderMark } from "../utils";

export type ReplayBufferDurationSec = (typeof REPLAY_BUFFER_DURATIONS_SEC)[number];

export type ReplayBufferSettings = {
	enabled: boolean;
	durationSec: ReplayBufferDurationSec;
};

const DEFAULT_SETTINGS: ReplayBufferSettings = {
	// Off by default: a continuously-running background capture is a real,
	// ongoing resource cost that a user should opt into, not discover after
	// the fact.
	enabled: false,
	durationSec: 60,
};

function normalizeDurationSec(value: unknown): ReplayBufferDurationSec {
	return (REPLAY_BUFFER_DURATIONS_SEC as readonly number[]).includes(value as number)
		? (value as ReplayBufferDurationSec)
		: DEFAULT_SETTINGS.durationSec;
}

export function createReplayBufferSettingsStore(filePath: string) {
	let operationQueue: Promise<void> = Promise.resolve();

	const readFile = async (): Promise<ReplayBufferSettings> => {
		try {
			const content = await fs.readFile(filePath, "utf-8");
			const parsed = parseJsonWithByteOrderMark<Partial<ReplayBufferSettings>>(content);
			return {
				enabled: parsed.enabled === true,
				durationSec: normalizeDurationSec(parsed.durationSec),
			};
		} catch {
			return DEFAULT_SETTINGS;
		}
	};

	return {
		async read(): Promise<ReplayBufferSettings> {
			await operationQueue;
			return readFile();
		},
		async update(patch: {
			enabled?: boolean;
			durationSec?: number;
		}): Promise<ReplayBufferSettings> {
			const operation = operationQueue.then(async () => {
				const existing = await readFile();
				const next: ReplayBufferSettings = {
					enabled: patch.enabled ?? existing.enabled,
					durationSec: normalizeDurationSec(patch.durationSec ?? existing.durationSec),
				};
				await fs.writeFile(filePath, JSON.stringify(next, null, 2), "utf-8");
				return next;
			});
			operationQueue = operation.then(
				() => undefined,
				() => undefined,
			);
			return operation;
		},
	};
}
