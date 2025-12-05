import React, { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select";

interface MicrophoneSelectorProps {
    selectedMicrophone: string;
    onMicrophoneSelect: (deviceId: string) => void;
    className?: string;
}

interface AudioDevice {
    deviceId: string;
    label: string;
}

export default function MicrophoneSelector({
    selectedMicrophone,
    onMicrophoneSelect,
    className = "",
}: MicrophoneSelectorProps) {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [permissionGranted, setPermissionGranted] = useState(false);

    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission to access devices to get labels
                // We only need to do this once to ensure we can read the labels
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setPermissionGranted(true);

                // Stop the tracks immediately as we only needed permission
                stream.getTracks().forEach(track => track.stop());

                const deviceInfos = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = deviceInfos
                    .filter((device) => device.kind === "audioinput")
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
                    }));

                setDevices(audioInputs);

                // If the selected microphone is not in the list (and it's not "default"), 
                // or if no microphone is selected, default to the first one or "default"
                const deviceExists = audioInputs.some(d => d.deviceId === selectedMicrophone);
                if (!deviceExists && selectedMicrophone !== "default" && audioInputs.length > 0) {
                    // Don't auto-change it here to avoid side effects, but the UI will show the value
                }
            } catch (error) {
                console.error("Error enumerating devices:", error);
                setPermissionGranted(false);
            }
        };

        getDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener("devicechange", getDevices);

        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", getDevices);
        };
    }, [selectedMicrophone]);

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Microphone
            </label>
            <Select
                value={selectedMicrophone}
                onValueChange={onMicrophoneSelect}
                disabled={!permissionGranted && devices.length === 0}
            >
                <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select a microphone" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="default">Default System Microphone</SelectItem>
                    {devices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {!permissionGranted && devices.length === 0 && (
                <p className="text-xs text-amber-600">
                    Microphone access is needed to list devices.
                </p>
            )}
        </div>
    );
}
