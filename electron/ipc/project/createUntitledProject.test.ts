import { afterEach, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

vi.mock("electron", () => ({
	app: {
		getPath: () => "/tmp/mock-user-data",
		setPath: vi.fn(),
	},
}));

import { createUntitledProject } from "./createUntitledProject";
const dirs: string[] = [];
afterEach(async () => {
	await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
it("publishes complete, uniquely named projects under concurrent creation without replacing existing projects", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "screenly-new-"));
	dirs.push(dir);
	await fs.writeFile(path.join(dir, "Untitled Project.screenly"), "original");
	const paths = await Promise.all(
		[1, 2, 3].map((n) => createUntitledProject(dir, JSON.stringify({ id: n }))),
	);
	expect(paths.map((p) => path.basename(p)).sort()).toEqual([
		"Untitled Project 1.screenly",
		"Untitled Project 2.screenly",
		"Untitled Project 3.screenly",
	]);
	expect(await fs.readFile(path.join(dir, "Untitled Project.screenly"), "utf8")).toBe("original");
	for (let i = 0; i < paths.length; i++)
		expect(JSON.parse(await fs.readFile(paths[i], "utf8"))).toEqual({ id: i + 1 });
	expect((await fs.readdir(dir)).filter((p) => p.endsWith(".tmp"))).toEqual([]);
});
