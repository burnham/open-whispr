# Supported & Unsupported Keyboard Hotkey Shortcuts

If you're setting a custom hotkey in Open Whispr and it's not working or getting rejected, this guide breaks down exactly what works best and why.

## ✅ Recommended Shortcuts aka "Do Work"

To be valid and reliable, a shortcut generally should:

- **Include at least one modifier key** (like `Ctrl`, `Alt`, `Command`, `Win/Super`).
- **Use 3 keys or fewer**.
- **Not conflict** with reserved system-level shortcuts (like `Ctrl+C` for copy).

### Examples of good shortcuts:
- `Ctrl + Space`
- `Alt + Z`
- `Ctrl + Alt + K`
- `F1` (Function keys work on their own!)
- `F8`

## ⚠️ "May" Work (Permissive Mode)

Open Whispr allows you to try **any** combination. However, Windows or macOS might block some of them.

- **Modifier Only**: `Ctrl + Win` (Might work, but often reserved by OS).
- **Letters Only**: `A + B` (Technically allowed by our recorder, but usually blocked by the Operating System to prevent you from losing the ability to type 'A').

## ❌ Won’t work (System Limits)

Even though Open Whispr lets you record them, these will likely fail to register globally:

- **Single Letter**: `A` (Would block you from typing 'a').
- **System Reserved**: `Ctrl + Alt + Del` (Windows reserved).
- **Conflict**: If another app (like Zoom or Teams) has already grabbed that specific hotkey globally.

## Troubleshooting

If you see "Hotkey Not Saved":
1. Try adding a modifier (hold `Ctrl` or `Alt`).
2. Try a different letter.
3. Check if another app uses that key.
