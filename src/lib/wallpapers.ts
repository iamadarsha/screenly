export type WallpaperCategory =
	| "all"
	| "abstract"
	| "aurora"
	| "topographic"
	| "cosmic"
	| "minimal"
	| "alpine"
	| "coast"
	| "botanical";

export interface BuiltInWallpaper {
	id: string;
	label: string;
	relativePath: string;
	publicPath: string;
	category?: WallpaperCategory;
}

const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const VIDEO_FILE_PATTERN = /\.(avi|m4v|mkv|mov|mp4|webm)$/i;

export const SCREENLY_STUDIO_WALLPAPERS: BuiltInWallpaper[] = [
	createWallpaperEntry("abstract-flow-aurum.jpg", "Flow Aurum", "abstract"),
	createWallpaperEntry("abstract-prism-mesh.jpg", "Prism Mesh", "abstract"),
	createWallpaperEntry("abstract-silk-twilight.jpg", "Silk Twilight", "abstract"),
	createWallpaperEntry("aurora-borealis-polar.jpg", "Borealis Polar", "aurora"),
	createWallpaperEntry("aurora-solar-dusk.jpg", "Solar Dusk", "aurora"),
	createWallpaperEntry("aurora-emerald-night.jpg", "Emerald Night", "aurora"),
	createWallpaperEntry("topographic-dark-contours.jpg", "Dark Contours", "topographic"),
	createWallpaperEntry("topographic-light-relief.jpg", "Light Relief", "topographic"),
	createWallpaperEntry("topographic-neon-elevation.jpg", "Neon Elevation", "topographic"),
	createWallpaperEntry("cosmic-carina-nebula.jpg", "Carina Nebula", "cosmic"),
	createWallpaperEntry("cosmic-deep-field.jpg", "Deep Field", "cosmic"),
	createWallpaperEntry("cosmic-andromeda-core.jpg", "Andromeda Core", "cosmic"),
	createWallpaperEntry("minimal-graphite-texture.jpg", "Graphite Texture", "minimal"),
	createWallpaperEntry("minimal-sand-dune.jpg", "Sand Dune", "minimal"),
	createWallpaperEntry("minimal-paper-fiber.jpg", "Paper Fiber", "minimal"),
	createWallpaperEntry("alpine-alpenglow-summit.jpg", "Alpenglow Summit", "alpine"),
	createWallpaperEntry("alpine-misty-pines.jpg", "Misty Pines", "alpine"),
	createWallpaperEntry("alpine-glacier-reflections.jpg", "Glacier Reflections", "alpine"),
	createWallpaperEntry("coast-pacific-swell.jpg", "Pacific Swell", "coast"),
	createWallpaperEntry("coast-basalt-cliffs.jpg", "Basalt Cliffs", "coast"),
	createWallpaperEntry("coast-tide-sand-patterns.jpg", "Tide Sand Patterns", "coast"),
	createWallpaperEntry("botanical-monstera-macro.jpg", "Monstera Macro", "botanical"),
	createWallpaperEntry("botanical-fern-spirals.jpg", "Fern Spirals", "botanical"),
	createWallpaperEntry("botanical-moss-lichen.jpg", "Moss & Lichen", "botanical"),
];

export const BUILT_IN_WALLPAPERS: BuiltInWallpaper[] = [
	createWallpaperEntry("tahoe-light.jpg", "Tahoe Light"),
	createWallpaperEntry("tahoe-dark.jpg", "Tahoe Dark"),
	createWallpaperEntry("midnight-8.jpg", "Midnight 8"),
	createWallpaperEntry("ipad-17-dark.jpg", "iPad 17 Dark"),
	createWallpaperEntry("ipad-17-light.jpg", "iPad 17 Light"),
	createWallpaperEntry("sequoia-blue.jpg", "Sequoia Blue"),
	createWallpaperEntry("sequoia-blue-orange.jpg", "Sequoia Blue Orange"),
	createWallpaperEntry("ventura.jpg", "Ventura"),
	createWallpaperEntry("sonoma-clouds.jpg", "Sonoma Clouds"),
	createWallpaperEntry("sonoma-light.jpg", "Sonoma Light"),
	createWallpaperEntry("sonoma-dark.jpg", "Sonoma Dark"),
	createWallpaperEntry("glassmorphism-3.jpg", "Glassmorphism 3"),
	createWallpaperEntry("glassmorphism-4.jpg", "Glassmorphism 4"),
	createWallpaperEntry("energy-19.jpg", "Energy 19"),
	createWallpaperEntry("wallpaper3.jpg", "Wallpaper 3"),
	createWallpaperEntry("wallpaper4.jpg", "Wallpaper 4"),
	createWallpaperEntry("cityscape.jpg", "Cityscape"),
	createWallpaperEntry("levels.jpg", "Levels"),
	createWallpaperEntry("wallpaper10.jpg", "Wallpaper 10"),
	createWallpaperEntry("ventura-dark.jpg", "Ventura Dark"),
	createWallpaperEntry("sonoma-evening.jpg", "Sonoma Evening"),
	createWallpaperEntry("sonoma-horizon.jpg", "Sonoma Horizon"),
	createWallpaperEntry("iridescent-9.jpg", "Iridescent 9"),
	createWallpaperEntry("energy-17.jpg", "Energy 17"),
	createWallpaperEntry("wispysky.mp4", "Wispy Sky"),
];

export const ALL_CURATED_WALLPAPERS: BuiltInWallpaper[] = [
	...SCREENLY_STUDIO_WALLPAPERS,
	...BUILT_IN_WALLPAPERS,
];

export const WALLPAPER_PATHS = BUILT_IN_WALLPAPERS.map((wallpaper) => wallpaper.publicPath);
export const WALLPAPER_RELATIVE_PATHS = BUILT_IN_WALLPAPERS.map(
	(wallpaper) => wallpaper.relativePath,
);
export const DEFAULT_WALLPAPER_PATH = "/wallpapers/tahoe-light.jpg";
export const DEFAULT_WALLPAPER_RELATIVE_PATH = "wallpapers/tahoe-light.jpg";

function safeDecodeFileName(fileName: string) {
	try {
		return decodeURIComponent(fileName);
	} catch {
		return fileName;
	}
}

function getBundledWallpaperFileName(value: string) {
	if (!value.startsWith("/wallpapers/")) {
		return null;
	}

	const normalizedValue = value.split(/[?#]/)[0] ?? value;
	const fileName = normalizedValue.split("/").filter(Boolean).pop();
	return fileName ? safeDecodeFileName(fileName) : null;
}

export async function resolveAvailableWallpaperPath(wallpaper: string): Promise<string> {
	const bundledFileName = getBundledWallpaperFileName(wallpaper);
	if (
		!bundledFileName ||
		typeof window === "undefined" ||
		!window.electronAPI?.listAssetDirectory
	) {
		return wallpaper;
	}

	try {
		const result = await window.electronAPI.listAssetDirectory("wallpapers");
		if (!result.success || !result.files?.length) {
			return wallpaper;
		}

		return result.files.includes(bundledFileName) ? wallpaper : DEFAULT_WALLPAPER_PATH;
	} catch {
		return wallpaper;
	}
}

export function isVideoWallpaperSource(value: string): boolean {
	if (!value) {
		return false;
	}

	const normalizedValue = value.split("?")[0]?.toLowerCase() ?? value.toLowerCase();
	return VIDEO_FILE_PATTERN.test(normalizedValue);
}

function toWallpaperId(fileName: string) {
	return fileName
		.replace(/\.[^.]+$/, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function toWallpaperLabel(fileName: string) {
	const baseName = fileName.replace(/\.[^.]+$/, "").trim();
	if (!baseName) {
		return "Wallpaper";
	}

	return baseName
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function toWallpaperCategory(fileName: string): WallpaperCategory {
	const lower = fileName.toLowerCase();
	if (
		lower.includes("abstract") ||
		lower.includes("prism") ||
		lower.includes("silk") ||
		lower.includes("flow") ||
		lower.includes("energy")
	)
		return "abstract";
	if (lower.includes("aurora") || lower.includes("borealis")) return "aurora";
	if (
		lower.includes("topographic") ||
		lower.includes("contour") ||
		lower.includes("relief") ||
		lower.includes("elevation")
	)
		return "topographic";
	if (
		lower.includes("cosmic") ||
		lower.includes("nebula") ||
		lower.includes("deep-field") ||
		lower.includes("andromeda") ||
		lower.includes("galaxy") ||
		lower.includes("midnight")
	)
		return "cosmic";
	if (
		lower.includes("minimal") ||
		lower.includes("graphite") ||
		lower.includes("dune") ||
		lower.includes("paper") ||
		lower.includes("glassmorphism") ||
		lower.includes("levels")
	)
		return "minimal";
	if (
		lower.includes("alpine") ||
		lower.includes("summit") ||
		lower.includes("pines") ||
		lower.includes("glacier") ||
		lower.includes("mountain") ||
		lower.includes("mountaintrees")
	)
		return "alpine";
	if (
		lower.includes("coast") ||
		lower.includes("swell") ||
		lower.includes("cliffs") ||
		lower.includes("tide") ||
		lower.includes("ocean") ||
		lower.includes("wispysky")
	)
		return "coast";
	if (
		lower.includes("botanical") ||
		lower.includes("monstera") ||
		lower.includes("fern") ||
		lower.includes("moss") ||
		lower.includes("lichen") ||
		lower.includes("farmvalley")
	)
		return "botanical";
	return "minimal";
}

function createWallpaperEntry(
	fileName: string,
	label = toWallpaperLabel(fileName),
	category?: WallpaperCategory,
): BuiltInWallpaper {
	const encodedFileName = encodeURIComponent(fileName);
	return {
		id: toWallpaperId(fileName) || `wallpaper-${encodedFileName.toLowerCase()}`,
		label,
		relativePath: `wallpapers/${fileName}`,
		publicPath: `/wallpapers/${encodedFileName}`,
		category: category ?? toWallpaperCategory(fileName),
	};
}

export async function getAvailableWallpapers(): Promise<BuiltInWallpaper[]> {
	const fallbackWallpapers = BUILT_IN_WALLPAPERS;

	if (typeof window === "undefined" || !window.electronAPI?.listAssetDirectory) {
		return fallbackWallpapers;
	}

	try {
		const result = await window.electronAPI.listAssetDirectory("wallpapers");
		if (!result.success || !result.files?.length) {
			return fallbackWallpapers;
		}

		const discoveredFiles = new Set(
			result.files.filter(
				(fileName) =>
					IMAGE_FILE_PATTERN.test(fileName) || VIDEO_FILE_PATTERN.test(fileName),
			),
		);

		if (discoveredFiles.size === 0) {
			return fallbackWallpapers;
		}

		const curatedWallpapers = ALL_CURATED_WALLPAPERS.filter((wallpaper) =>
			discoveredFiles.has(wallpaper.relativePath.replace(/^wallpapers\//, "")),
		);

		return curatedWallpapers.length > 0 ? curatedWallpapers : fallbackWallpapers;
	} catch {
		return fallbackWallpapers;
	}
}
