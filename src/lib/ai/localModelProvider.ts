/**
 * Renderer-side wrapper around `window.electronAi` (auto-injected by
 * `@electron/llm`, loaded once in `electron/main.ts`). This is the ONLY
 * place in the app that talks to the local LLM directly — every AI feature
 * goes through `promptLocalModelForJson`, which never trusts the model's
 * output blindly: the response must parse as JSON *and* pass the caller's
 * own validator before it's used. A model failure (not downloaded, timed
 * out, malformed output, wrong shape) always resolves to `{ ok: false }`
 * rather than throwing — callers are expected to fall back to a
 * deterministic heuristic (or report the feature unavailable), never crash.
 */

const MODEL_ALIAS = "gemma-4-e4b-it-q4_0";

let modelReadyPromise: Promise<{ ready: boolean; reason?: string }> | null = null;

/** Reset between test runs / after a model download or deletion changes availability. */
export function resetLocalModelReadyState() {
	modelReadyPromise = null;
}

async function ensureModelReady(): Promise<{ ready: boolean; reason?: string }> {
	if (typeof window === "undefined" || !window.electronAi || !window.electronAPI?.getAiModelStatus) {
		return { ready: false, reason: "Local AI model is not downloaded or unavailable." };
	}
	if (!modelReadyPromise) {
		modelReadyPromise = (async () => {
			try {
				const status = await window.electronAPI.getAiModelStatus();
				if (!status?.success) {
					return { ready: false, reason: "Unable to check local AI model status." };
				}
				if (status.status === "corrupted") {
					return {
						ready: false,
						reason: "Local AI model file failed verification — please re-download.",
					};
				}
				if (status.status !== "downloaded") {
					return { ready: false, reason: "Local AI model is not downloaded or unavailable." };
				}
				await window.electronAi?.create({ modelAlias: MODEL_ALIAS, temperature: 0.3 });
				return { ready: true };
			} catch (error) {
				console.warn("[ai] Failed to initialize local model:", error);
				return {
					ready: false,
					reason: error instanceof Error ? error.message : "Failed to initialize local model.",
				};
			}
		})();
	}
	const outcome = await modelReadyPromise;
	if (!outcome.ready) {
		modelReadyPromise = null;
	}
	return outcome;
}

export type LocalModelJsonResult<T> =
	| { ok: true; data: T }
	| { ok: false; reason: string };

export interface LocalModelJsonRequest<T> {
	prompt: string;
	responseJSONSchema: object;
	/** Deterministic runtime check — the model's raw JSON is never trusted without this. */
	validate: (data: unknown) => data is T;
	timeoutMs?: number;
}

export async function promptLocalModelForJson<T>(
	request: LocalModelJsonRequest<T>,
): Promise<LocalModelJsonResult<T>> {
	const readiness = await ensureModelReady();
	if (!readiness.ready || typeof window === "undefined" || !window.electronAi) {
		return {
			ok: false,
			reason: readiness.reason ?? "Local AI model is not downloaded or unavailable.",
		};
	}

	let raw: string;
	try {
		raw = await window.electronAi.prompt(request.prompt, {
			responseJSONSchema: request.responseJSONSchema,
			timeout: request.timeoutMs ?? 30_000,
		});
	} catch (error) {
		return {
			ok: false,
			reason: error instanceof Error ? error.message : "Local model request failed.",
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, reason: "Model returned invalid JSON." };
	}

	if (!request.validate(parsed)) {
		return { ok: false, reason: "Model output failed schema validation." };
	}

	return { ok: true, data: parsed };
}
