const MODIFIER_KEY_NAMES = ["Alt", "Ctrl", "Cmd", "Shift", "Meta", "Right Alt", "Right Ctrl", "Right Shift", "Right Meta"];

/**
 * Decides whether a key press is a shortcut worth showing, and returns its label parts.
 * Plain typing is never recorded. Shift alone does not count as a shortcut modifier, since
 * Shift+letter is just a capital letter and recording it would leak typed text.
 */
export function resolveKeystrokeCombo(
	name: string,
	mods: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
): string[] | null {
	const isShortcutModifier = Boolean(mods.altKey || mods.ctrlKey || mods.metaKey);
	const isSafeKey =
		name.startsWith("F") ||
		name.startsWith("Arrow") ||
		name.startsWith("Page") ||
		["Escape", "Enter", "Tab", "Home", "End", "Backspace", "Delete", "Insert", "Space"].includes(name);
	if (!isShortcutModifier && !isSafeKey) return null;
	const keys: string[] = [];
	if (mods.metaKey) keys.push("Cmd");
	if (mods.ctrlKey) keys.push("Ctrl");
	if (mods.altKey) keys.push("Alt");
	if (mods.shiftKey) keys.push("Shift");
	if (!MODIFIER_KEY_NAMES.includes(name)) keys.push(name);
	return keys.length > 0 ? keys : null;
}
