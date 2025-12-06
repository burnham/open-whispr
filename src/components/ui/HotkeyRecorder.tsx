import React, { useState, useEffect, useRef } from "react";
import { Keyboard as KeyboardIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";

interface HotkeyRecorderProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function HotkeyRecorder({
    value,
    onChange,
    className,
}: HotkeyRecorderProps) {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [currentCombo, setCurrentCombo] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLDivElement>(null);

    // Map of keys to Electron Accelerator format
    const keyMap: Record<string, string> = {
        " ": "Space",
        "Control": "Control",
        "Meta": window.electronAPI?.platform === 'darwin' ? "Command" : "Super",
        "Alt": "Alt",
        "Shift": "Shift",
        "ArrowUp": "Up",
        "ArrowDown": "Down",
        "ArrowLeft": "Left",
        "ArrowRight": "Right",
    };

    useEffect(() => {
        if (!isRecording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore standalone modifier presses if we want to wait for a combo
            // But we need to show them being pressed.

            const key = e.key;
            const code = e.code;

            // Determine the label for the key
            let label = key;
            if (keyMap[key]) {
                label = keyMap[key];
            } else if (key.length === 1) {
                label = key.toUpperCase();
            }

            // If it's a modifier, just add it to current combo visualization
            // If it's a non-modifier, it completes the combo (mostly)

            const isMac = window.electronAPI?.platform === 'darwin';

            const modifiers: string[] = [];

            if (e.ctrlKey) modifiers.push("Control");
            if (e.shiftKey) modifiers.push("Shift");
            if (e.altKey) modifiers.push("Alt");
            if (e.metaKey) modifiers.push(isMac ? "Command" : "Super");

            let finalKey = "";

            // If the pressed key is not a modifier itself, add it
            if (!["Control", "Meta", "Alt", "Shift"].includes(key)) {
                finalKey = label;
            }

            // Construct the accelerator string
            const parts = [...new Set([...modifiers, finalKey])].filter(Boolean);
            const accelerator = parts.join("+");

            // VALIDATION: Enforce at least one modifier if a key is pressed, UNLESS it's a Function key (F1-F12) or specific keys
            const isFunctionKey = /^F[1-9][0-2]?$/.test(finalKey);

            if (finalKey && modifiers.length === 0 && !isFunctionKey) {
                // Invalid: Single key without modifier (except F-keys)
                return;
            }

            if (parts.length > 0 && modifiers.length > 0) {
                onChange(accelerator);
            }

            // If a non-modifier key was pressed AND we have modifiers, OR if we want to allow single keys (but better to enforce mod+key)
            // For global shortcuts, Electron generally wants Modifier+Key.
            // If finalKey is empty (meaning only modifiers pressed), do NOT save yet.
            if (!finalKey) {
                return;
            }

            if (parts.length > 0 && modifiers.length > 0) {
                onChange(accelerator);
                setIsRecording(false);
                inputRef.current?.blur();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isRecording, onChange]);

    const startRecording = () => {
        setIsRecording(true);
        setCurrentCombo(new Set());
    };

    const stopRecording = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsRecording(false);
    };

    const clearHotkey = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setIsRecording(false);
    };

    // Format the display value
    const displayValue = value.split("+").map(part => {
        if (part === "CommandOrControl") return "Ctrl";
        return part;
    }).join(" + ");

    return (
        <div
            ref={inputRef}
            className={cn(
                "relative flex items-center justify-center w-full h-14 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none overflow-hidden bg-white",
                isRecording
                    ? "border-indigo-500 ring-4 ring-indigo-500/10 bg-indigo-50/50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                className
            )}
            onClick={startRecording}
            tabIndex={0}
            onBlur={() => setIsRecording(false)}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isRecording ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                )}>
                    <KeyboardIcon size={20} />
                </div>

                <div className="flex flex-col items-center">
                    <span className={cn(
                        "text-lg font-medium font-mono",
                        !value && !isRecording && "text-gray-400 italic",
                        isRecording && "text-indigo-600",
                        value && !isRecording && "text-gray-900"
                    )}>
                        {isRecording
                            ? t('settings.hotkey.pressKeys')
                            : (displayValue || t('settings.hotkey.clickToRecord'))}
                    </span>
                </div>
            </div>

            {value && !isRecording && (
                <button
                    onClick={clearHotkey}
                    className="absolute right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title={t('settings.hotkey.clear')}
                >
                    <X size={16} />
                </button>
            )}

            {isRecording && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500/20">
                    <div className="h-full bg-indigo-500 animate-progress-indeterminate" />
                </div>
            )}
        </div>
    );
}
