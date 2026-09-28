import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BUILT_IN_WALLPAPERS,
	DEFAULT_WALLPAPER_PATH,
	DEFAULT_WALLPAPER_RELATIVE_PATH,
	getAvailableWallpapers,
	resolveAvailableWallpaperPath,
} from "./wallpapers";

describe("wallpapers", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps the curated wallpaper list and default path aligned", () => {
		expect(DEFAULT_WALLPAPER_PATH).toBe("/wallpapers/aurora-borealis-polar.jpg");
		expect(DEFAULT_WALLPAPER_RELATIVE_PATH).toBe("wallpapers/aurora-borealis-polar.jpg");
		expect(BUILT_IN_WALLPAPERS.at(0)?.publicPath).toBe(DEFAULT_WALLPAPER_PATH);
		expect(BUILT_IN_WALLPAPERS).toHaveLength(24);
		const categories = new Set(BUILT_IN_WALLPAPERS.map((wallpaper) => wallpaper.category));
		expect([...categories].sort()).toEqual([
			"abstract",
			"alpine",
			"aurora",
			"botanical",
			"coast",
			"cosmic",
			"minimal",
			"topographic",
		]);
	});

	it("preserves the curated order when asset discovery returns extra files", async () => {
		vi.stubGlobal("window", {
			electronAPI: {
				listAssetDirectory: vi.fn(async () => ({
					success: true,
					files: [
						"minimal-sand-dune.jpg",
						"stray-legacy-file.jpg",
						"aurora-solar-dusk.jpg",
						"alpine-misty-pines.jpg",
					],
				})),
			},
		});

		await expect(getAvailableWallpapers()).resolves.toEqual([
			BUILT_IN_WALLPAPERS[1],
			BUILT_IN_WALLPAPERS[7],
			BUILT_IN_WALLPAPERS[22],
		]);
	});

	it("falls back to the default wallpaper when a bundled wallpaper is missing", async () => {
		vi.stubGlobal("window", {
			electronAPI: {
				listAssetDirectory: vi.fn().mockResolvedValue({
					success: true,
					files: ["aurora-solar-dusk.jpg"],
				}),
			},
		});

		await expect(resolveAvailableWallpaperPath("/wallpapers/tahoe-light.jpg")).resolves.toBe(
			DEFAULT_WALLPAPER_PATH,
		);
		await expect(resolveAvailableWallpaperPath("/wallpapers/aurora-solar-dusk.jpg")).resolves.toBe(
			"/wallpapers/aurora-solar-dusk.jpg",
		);
	});

	it("strips query strings and fragments before checking bundled wallpaper files", async () => {
		vi.stubGlobal("window", {
			electronAPI: {
				listAssetDirectory: vi.fn().mockResolvedValue({
					success: true,
					files: ["wispysky.mp4"],
				}),
			},
		});

		await expect(resolveAvailableWallpaperPath("/wallpapers/wispysky.mp4#t=0.1")).resolves.toBe(
			"/wallpapers/wispysky.mp4#t=0.1",
		);
	});

	it("preserves non-bundled wallpaper values", async () => {
		await expect(resolveAvailableWallpaperPath("#123456")).resolves.toBe("#123456");
		await expect(resolveAvailableWallpaperPath("data:image/png;base64,abc")).resolves.toBe(
			"data:image/png;base64,abc",
		);
	});
});
