import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
	hasLoggedInteractionHookFailure,
	interactionCaptureCleanup,
	isCursorCaptureActive,
	lastLeftClick,
	setHasLoggedInteractionHookFailure,
	setInteractionCaptureCleanup,
	setLastLeftClick,
	setLinuxCursorScreenPoint,
} from "../state";
import type {
	CursorInteractionType,
	HookMouseEvent,
	HookKeyboardEvent,
	UiohookLike,
	UiohookModuleNamespace,
} from "../types";
import {
	getCursorCaptureElapsedMs,
	getHookCursorScreenPoint,
	getNormalizedCursorPoint,
	isCursorCapturePaused,
	pushCursorSample,
	pushKeystrokeSample,
} from "./telemetry";

const nodeRequire = createRequire(import.meta.url);

export function normalizeHookMouseButton(rawButton: unknown): 1 | 2 | 3 {
	if (typeof rawButton !== "number" || !Number.isFinite(rawButton)) {
		return 1;
	}

	if (rawButton === 2 || rawButton === 39) {
		return 2;
	}

	if (rawButton === 3 || rawButton === 38) {
		return 3;
	}

	return 1;
}

export function getHookMouseButton(event: HookMouseEvent | null | undefined): 1 | 2 | 3 {
	return normalizeHookMouseButton(
		event?.button ?? event?.mouseButton ?? event?.data?.button ?? event?.data?.mouseButton,
	);
}

export function stopInteractionCapture() {
	if (interactionCaptureCleanup) {
		interactionCaptureCleanup();
		setInteractionCaptureCleanup(null);
	}
}

function isUiohookLike(value: unknown): value is UiohookLike {
	const candidate = value as Partial<UiohookLike> | null;
	return typeof candidate?.on === "function" && typeof candidate?.start === "function";
}

function resolveUiohookModule(moduleExports: UiohookModuleNamespace): UiohookLike | null {
	const injectKey = (hook: UiohookLike) => {
		if (moduleExports.UiohookKey) hook.UiohookKey = moduleExports.UiohookKey;
		return hook;
	};
	const defaultExport = moduleExports.default;

	if (moduleExports.uIOhook) {
		return injectKey(moduleExports.uIOhook);
	}

	if (moduleExports.uiohook) {
		return injectKey(moduleExports.uiohook);
	}

	if (moduleExports.Uiohook) {
		return injectKey(moduleExports.Uiohook);
	}

	if (isUiohookLike(defaultExport)) {
		return injectKey(defaultExport);
	}

	if (defaultExport?.uIOhook) {
		return injectKey(defaultExport.uIOhook);
	}

	if (defaultExport?.uiohook) {
		return injectKey(defaultExport.uiohook);
	}

	if (defaultExport?.Uiohook) {
		return injectKey(defaultExport.Uiohook);
	}

	return null;
}

function shouldRepairBundledUiohookBinary(error: unknown): error is NodeJS.ErrnoException {
	if (process.platform !== "darwin") {
		return false;
	}

	if (process.arch !== "arm64") {
		return false;
	}

	const candidate = error as NodeJS.ErrnoException | null;
	return (
		candidate?.code === "ERR_DLOPEN_FAILED" &&
		typeof candidate.message === "string" &&
		candidate.message.includes("incompatible architecture")
	);
}

export function repairBundledUiohookBinaryForCurrentArch(
	error: unknown,
	options?: {
		packageRoot?: string;
		platform?: NodeJS.Platform;
		arch?: string;
		log?: (message: string) => void;
	},
) {
	const platform = options?.platform ?? process.platform;
	const arch = options?.arch ?? process.arch;

	if (platform !== "darwin" || arch !== "arm64") {
		return false;
	}

	const candidate = error as NodeJS.ErrnoException | null;
	if (
		candidate?.code !== "ERR_DLOPEN_FAILED" ||
		typeof candidate.message !== "string" ||
		!candidate.message.includes("incompatible architecture")
	) {
		return false;
	}

	const packageRoot =
		options?.packageRoot ?? path.dirname(nodeRequire.resolve("uiohook-napi/package.json"));
	const prebuildPath = path.join(packageRoot, "prebuilds", `darwin-${arch}`, "node.napi.node");
	const buildPath = path.join(packageRoot, "build", "Release", "uiohook_napi.node");

	if (!fs.existsSync(prebuildPath)) {
		return false;
	}

	try {
		fs.mkdirSync(path.dirname(buildPath), { recursive: true });
		fs.copyFileSync(prebuildPath, buildPath);
		(options?.log ?? console.warn)(
			"[CursorTelemetry] Repaired stale uiohook-napi binary using bundled darwin-arm64 prebuild.",
		);
		return true;
	} catch {
		return false;
	}
}

function loadUiohookModule() {
	try {
		const moduleExports = nodeRequire("uiohook-napi") as UiohookModuleNamespace;
		return resolveUiohookModule(moduleExports);
	} catch (error) {
		if (!shouldRepairBundledUiohookBinary(error)) {
			throw error;
		}

		if (!repairBundledUiohookBinaryForCurrentArch(error)) {
			throw error;
		}

		delete nodeRequire.cache[nodeRequire.resolve("uiohook-napi")];
		const moduleExports = nodeRequire("uiohook-napi") as UiohookModuleNamespace;
		return resolveUiohookModule(moduleExports);
	}
}

export function shouldStartGlobalInteractionHook(platform: NodeJS.Platform = process.platform) {
	// On macOS, uiohook can block forever while its native event tap starts
	// (notably when Accessibility permission is unavailable or stale). Because
	// start() executes synchronously, that freezes Electron's main thread and
	// makes every window, including the recording HUD, unresponsive. Cursor
	// position and visual-state telemetry still come from the existing native
	// macOS monitor and Electron sampler.
	return platform !== "darwin";
}

export function recordCursorMouseDown(button: 1 | 2 | 3) {
	if (!isCursorCaptureActive || isCursorCapturePaused()) {
		return;
	}

	const point = getNormalizedCursorPoint();
	if (!point) {
		return;
	}

	const timeMs = getCursorCaptureElapsedMs();
	let interactionType: CursorInteractionType = "click";

	if (button === 2) {
		interactionType = "right-click";
	} else if (button === 3) {
		interactionType = "middle-click";
	} else {
		const thresholdMs = 350;
		const distance = lastLeftClick
			? Math.hypot(point.cx - lastLeftClick.cx, point.cy - lastLeftClick.cy)
			: Number.POSITIVE_INFINITY;

		if (lastLeftClick && timeMs - lastLeftClick.timeMs <= thresholdMs && distance <= 0.04) {
			interactionType = "double-click";
		}

		setLastLeftClick({ timeMs, cx: point.cx, cy: point.cy });
	}

	pushCursorSample(point.cx, point.cy, timeMs, interactionType);
}

export function recordCursorMouseUp() {
	if (!isCursorCaptureActive || isCursorCapturePaused()) {
		return;
	}

	const point = getNormalizedCursorPoint();
	if (!point) {
		return;
	}

	pushCursorSample(point.cx, point.cy, getCursorCaptureElapsedMs(), "mouseup");
}

let activeKeys = new Set<string>();
let keycodeToName: Record<number, string> | null = null;

export function recordKeystroke(keys: string[]) {
	if (!isCursorCaptureActive || isCursorCapturePaused() || keys.length === 0) {
		return;
	}

	const point = getNormalizedCursorPoint();
	if (!point) {
		return;
	}

	pushKeystrokeSample(point.cx, point.cy, getCursorCaptureElapsedMs(), keys);
}

export async function startInteractionCapture(captureKeystrokes = false) {
	if (!isCursorCaptureActive) {
		return;
	}

	if (!["darwin", "win32", "linux"].includes(process.platform)) {
		return;
	}

	if (!captureKeystrokes && !shouldStartGlobalInteractionHook()) {
		console.warn("[CursorTelemetry] Skipping the blocking global interaction hook on macOS.");
		return;
	}

	stopInteractionCapture();

	try {
		const hook = loadUiohookModule();
		console.log(
			"[CursorTelemetry] hook loaded:",
			!!hook,
			"has.on:",
			typeof hook?.on,
			"has.start:",
			typeof hook?.start,
		);
		if (!isCursorCaptureActive) {
			return;
		}

		if (!hook || typeof hook.on !== "function" || typeof hook.start !== "function") {
			console.log("[CursorTelemetry] hook unusable — aborting interaction capture");
			return;
		}

		const onMouseDown = (event: HookMouseEvent) => {
			recordCursorMouseDown(getHookMouseButton(event));
		};

		const onMouseUp = () => {
			recordCursorMouseUp();
		};

		const onMouseMove = (event: HookMouseEvent) => {
			if (process.platform !== "linux" || !isCursorCaptureActive || isCursorCapturePaused()) {
				return;
			}

			const point = getHookCursorScreenPoint(event);
			if (!point) {
				return;
			}

			setLinuxCursorScreenPoint({ x: point.x, y: point.y, updatedAt: Date.now() });
		};

		if (captureKeystrokes && hook.UiohookKey && !keycodeToName) {
			keycodeToName = Object.fromEntries(
				Object.entries(hook.UiohookKey).map(([name, code]) => [code, name])
			);
		}

		const processKeystrokeEvent = (event: HookKeyboardEvent, type: "down" | "up") => {
			if (!captureKeystrokes || !keycodeToName) return;

			const name = keycodeToName[event.keycode];
			if (!name) return;

			if (type === "down") {
				activeKeys.add(name);
			} else {
				activeKeys.delete(name);
			}

			const isModifierHeld = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
			const isSafeKey =
				name.startsWith("F") ||
				name.startsWith("Arrow") ||
				name.startsWith("Page") ||
				["Escape", "Enter", "Tab", "Home", "End", "Backspace", "Delete", "Insert", "Space"].includes(name);

			if (type === "down" && (isModifierHeld || isSafeKey)) {
				const keys = [];
				if (event.metaKey) keys.push("Cmd");
				if (event.ctrlKey) keys.push("Ctrl");
				if (event.altKey) keys.push("Alt");
				if (event.shiftKey) keys.push("Shift");
				if (!["Alt", "Ctrl", "Cmd", "Shift", "Meta", "Right Alt", "Right Ctrl", "Right Shift", "Right Meta"].includes(name)) {
					keys.push(name);
				}
				
				if (keys.length > 0) {
					recordKeystroke(keys);
				}
			}
		};

		const onKeyDown = (event: HookMouseEvent & HookKeyboardEvent) => processKeystrokeEvent(event, "down");
		const onKeyUp = (event: HookMouseEvent & HookKeyboardEvent) => processKeystrokeEvent(event, "up");

		hook.on("mousedown", onMouseDown);
		hook.on("mouseup", onMouseUp);
		if (captureKeystrokes) {
			hook.on("keydown", onKeyDown);
			hook.on("keyup", onKeyUp);
		}
		if (process.platform === "linux") {
			hook.on("mousemove", onMouseMove);
		}

		setInteractionCaptureCleanup(() => {
			activeKeys.clear();
			try {
				if (typeof hook.off === "function") {
					hook.off("mousedown", onMouseDown);
					hook.off("mouseup", onMouseUp);
					if (captureKeystrokes) {
						hook.off("keydown", onKeyDown);
						hook.off("keyup", onKeyUp);
					}
					if (process.platform === "linux") {
						hook.off("mousemove", onMouseMove);
					}
				} else if (typeof hook.removeListener === "function") {
					hook.removeListener("mousedown", onMouseDown);
					hook.removeListener("mouseup", onMouseUp);
					if (captureKeystrokes) {
						hook.removeListener("keydown", onKeyDown);
						hook.removeListener("keyup", onKeyUp);
					}
					if (process.platform === "linux") {
						hook.removeListener("mousemove", onMouseMove);
					}
				}
			} catch {
				// ignore listener cleanup errors
			}

			try {
				if (typeof hook.stop === "function") {
					hook.stop();
				}
			} catch {
				// ignore hook shutdown errors
			}
		});

		hook.start();
	} catch (error) {
		if (!hasLoggedInteractionHookFailure) {
			setHasLoggedInteractionHookFailure(true);
			console.warn("[CursorTelemetry] Global interaction capture unavailable:", error);
		}
	}
}
