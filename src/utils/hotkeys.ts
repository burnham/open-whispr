export function formatHotkeyLabel(hotkey?: string | null): string {
  if (!hotkey || hotkey.trim() === "") {
    return "`";
  }

  if (hotkey === "GLOBE") {
    return "🌐 Globe";
  }

  return hotkey
    .split("+")
    .map((part) => {
      if (part === "CommandOrControl") return "Ctrl";
      if (part === "Control") return "Ctrl";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" + ");
}
