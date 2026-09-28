import { describe, expect, it } from "vitest";
import { resolveKeystrokeCombo } from "./keystrokeCombo";

describe("resolveKeystrokeCombo", () => {
	it("records real shortcuts", () => {
		expect(resolveKeystrokeCombo("KeyS", { metaKey: true })).toEqual(["Cmd", "KeyS"]);
		expect(resolveKeystrokeCombo("KeyZ", { metaKey: true, shiftKey: true })).toEqual(["Cmd", "Shift", "KeyZ"]);
		expect(resolveKeystrokeCombo("Enter", {})).toEqual(["Enter"]);
	});

	it("never records plain typing, including Shift+letter capitals", () => {
		expect(resolveKeystrokeCombo("KeyP", {})).toBeNull();
		expect(resolveKeystrokeCombo("KeyP", { shiftKey: true })).toBeNull();
		expect(resolveKeystrokeCombo("Digit1", { shiftKey: true })).toBeNull();
	});

	it("does not emit a bare modifier as a key", () => {
		expect(resolveKeystrokeCombo("Meta", { metaKey: true })).toEqual(["Cmd"]);
	});
});
