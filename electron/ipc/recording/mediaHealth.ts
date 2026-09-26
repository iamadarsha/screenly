export type MediaHealthStatus = "ok" | "stalled" | "unknown";

export type MediaHealthSample = {
	atMs: number;
	sizeBytes: number;
};

/** No growth for longer than this while actively recording means the stream has stalled. */
export const MEDIA_HEALTH_STALL_THRESHOLD_MS = 15_000;

/** Bound memory for a long recording; only the tail matters for stall detection. */
export const MEDIA_HEALTH_MAX_SAMPLES = 12;

export function appendMediaHealthSample(
	samples: MediaHealthSample[],
	sample: MediaHealthSample,
): MediaHealthSample[] {
	const next = [...samples, sample];
	return next.length > MEDIA_HEALTH_MAX_SAMPLES
		? next.slice(next.length - MEDIA_HEALTH_MAX_SAMPLES)
		: next;
}

/**
 * A stream is "stalled" when its output file hasn't grown in longer than the
 * threshold. A single sample is never enough evidence either way.
 */
export function classifyMediaHealth(
	samples: MediaHealthSample[],
	nowMs: number,
): MediaHealthStatus {
	if (samples.length === 0) return "unknown";

	let lastGrowthAtMs = samples[0].atMs;
	for (let i = 1; i < samples.length; i++) {
		if (samples[i].sizeBytes > samples[i - 1].sizeBytes) {
			lastGrowthAtMs = samples[i].atMs;
		}
	}

	if (samples.length < 2) return "unknown";
	return nowMs - lastGrowthAtMs > MEDIA_HEALTH_STALL_THRESHOLD_MS ? "stalled" : "ok";
}
