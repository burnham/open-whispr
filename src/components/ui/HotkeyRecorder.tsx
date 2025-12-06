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

            const key = e.key;

            // Determine the label for the key
            let label = key;
            if (keyMap[key]) {
                label = keyMap[key];
            } else if (key.length === 1) {
                label = key.toUpperCase();
            }

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

            // Validation per Supported Shortcuts docs:
            // 1. Function keys (F1-F24) and Media keys are allowed without modifiers.
            // 2. All other keys MUST have at least one modifier.
            const isFunctionKey = /^F(1[0-2]|[1-9])$/.test(finalKey);
            const isMediaKey = ["MediaPlayPause", "MediaNextTrack", "MediaPreviousTrack", "MediaStop", "VolumeUp", "VolumeDown", "VolumeMute"].includes(finalKey);
            const hasModifier = modifiers.length > 0;

            const isValid = hasModifier || isFunctionKey || isMediaKey;

            // We update the value in real-time as they type, but only if it could potentially be valid
            if (parts.length > 0) {
                onChange(accelerator);
            }

            // If it has a final key (non-modifier), check invalidity
            if (finalKey) {
                if (isValid) {
                    setIsRecording(false);
                    inputRef.current?.blur();
                } else {
                    // Keep recording, waiting for a modifier. 
                    // Ideally we'd show a "Press a modifier" warning here, but for now we just don't "finish" the recording.
                    // The user is forced to add a modifier or keep typing.
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isRecording, onChange]);

    const startRecording = () => {
        setIsRecording(true);
    };

    const clearHotkey = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setIsRecording(false);
    };

    // Format the display value
    const displayValue = value ? value.split("+").map(part => {
        if (part === "CommandOrControl") return "Ctrl";
        if (part === "Super") return "Win";
        return part;
    }).join(" + ") : "";

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
                            ? t('settings.general.hotkey.pressKeys')
                            : (displayValue || t('settings.general.hotkey.clickToRecord'))}
                    </span>
                </div>
            </div>

            {value && !isRecording && (
                <button
                    onClick={clearHotkey}
                    className="absolute right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title={t('settings.general.hotkey.clear')}
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
