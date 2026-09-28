import path from "node:path";
import { USER_DATA_PATH } from "../appPaths";

export const PROJECT_FILE_EXTENSION = "screenly";
export const LEGACY_PROJECT_FILE_EXTENSIONS = ["openscreen", "recordly"];
export const PROJECTS_DIRECTORY_NAME = "Projects";
export const PROJECT_THUMBNAIL_SUFFIX = ".preview.png";
export const RECENT_PROJECTS_FILE = path.join(USER_DATA_PATH, "recent-projects.json");
export const MAX_RECENT_PROJECTS = 16;
export const SHORTCUTS_FILE = path.join(USER_DATA_PATH, "shortcuts.json");
export const RECORDINGS_SETTINGS_FILE = path.join(USER_DATA_PATH, "recordings-settings.json");
export const COUNTDOWN_SETTINGS_FILE = path.join(USER_DATA_PATH, "countdown-settings.json");
export const APP_SETTINGS_FILE = path.join(USER_DATA_PATH, "app-settings.json");
export const AUTO_RECORDING_PREFIX = "recording-";
export const ALLOW_SCREENLY_WINDOW_CAPTURE = Boolean(process.env["VITE_DEV_SERVER_URL"]);
export const RECORDING_SESSION_MANIFEST_SUFFIX = ".screenly-session.json";
export const RECORDING_CHECKPOINT_SUFFIX = ".screenly-checkpoint.json";
export const RECORDING_CHECKPOINT_HEARTBEAT_MS = 5_000;
export const DISK_SPACE_LOW_WARNING_BYTES = 2 * 1024 ** 3; // 2 GB
export const DISK_SPACE_CRITICAL_BYTES = 500 * 1024 ** 2; // 500 MB
export const REPLAY_BUFFER_DURATIONS_SEC = [30, 60, 120, 300] as const;
export const REPLAY_BUFFER_CHUNK_SEC = 10;
export const REPLAY_BUFFER_DIR_NAME = ".screenly-replay-buffer";
export const REPLAY_BUFFER_SETTINGS_FILE = path.join(
	USER_DATA_PATH,
	"replay-buffer-settings.json",
);
export const REPLAY_BUFFER_SAVE_SHORTCUT = "CommandOrControl+Shift+R";
export const WHISPER_MODEL_DOWNLOAD_URL =
	"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin";
export const WHISPER_MODEL_DIR = path.join(USER_DATA_PATH, "whisper");
export const WHISPER_SMALL_MODEL_PATH = path.join(WHISPER_MODEL_DIR, "ggml-small.bin");
/** Storage root for Phase 4C local reasoning models — separate from the whisper ASR model dir. */
export const AI_MODELS_DIR = path.join(USER_DATA_PATH, "ai-models");
/**
 * Gemma 4 E4B (instruction-tuned, Q4_0 quantization), from the official
 * ggml-org GGUF conversion — the same maintainers as whisper.cpp/llama.cpp.
 * URL and SHA-256 verified directly against the Hugging Face repo's file
 * listing before use (never guessed). Apache-2.0 licensed. ~4.3 GiB.
 */
export const GEMMA4_E4B_MODEL_ALIAS = "gemma-4-e4b-it-q4_0";
export const GEMMA4_E4B_MODEL_URL =
	"https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_0.gguf";
export const GEMMA4_E4B_MODEL_SHA256 =
	"a555b900214b477d8880e7832e0b8925e139b0159640036b09fe472b6f2097f2";
export const GEMMA4_E4B_MODEL_PATH = path.join(AI_MODELS_DIR, "gemma-4-E4B-it-Q4_0.gguf");
export const COMPANION_AUDIO_LAYOUTS = [
	{ platform: "mac" as const, systemSuffix: ".system.m4a", micSuffix: ".mic.m4a" },
	{ platform: "win" as const, systemSuffix: ".system.wav", micSuffix: ".mic.wav" },
	{ platform: "mac" as const, systemSuffix: ".system.webm", micSuffix: ".mic.webm" },
];

export const CURSOR_TELEMETRY_VERSION = 2;
export const CURSOR_SAMPLE_INTERVAL_MS = 33;
export const MAX_CURSOR_SAMPLES = 60 * 60 * 30; // 1 hour @ 30Hz
