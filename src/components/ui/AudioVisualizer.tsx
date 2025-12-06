import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface AudioVisualizerProps {
    deviceId?: string;
    isRecording?: boolean;
    className?: string;
    barColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    deviceId,
    isRecording = false,
    className,
    barColor = "bg-emerald-500" // Discord-like green/purple
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [volume, setVolume] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const requestRef = useRef<number>();
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let mounted = true;

        const initAudio = async () => {
            if (!isRecording) {
                cleanup();
                setVolume(0);
                return;
            }

            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }

                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                const constraints: MediaStreamConstraints = {
                    audio: deviceId ? { deviceId: { exact: deviceId } } : true
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!mounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                streamRef.current = stream;
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;

                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyser);
                sourceRef.current = source;

                visualize();
            } catch (error) {
                console.error('Error accessing microphone:', error);
            }
        };

        const visualize = () => {
            if (!analyserRef.current || !mounted) return;

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;

            // Normalize to 0-100 range with some boost for visibility
            const normalizedVolume = Math.min(100, (average / 128) * 100 * 1.5);

            setVolume(normalizedVolume);
            requestRef.current = requestAnimationFrame(visualize);
        };

        const cleanup = () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
            // Don't close AudioContext, just disconnect, so we can reuse it
        };

        initAudio();

        return () => {
            mounted = false;
            cleanup();
        };
    }, [deviceId, isRecording]);

    // Visualizer style similar to Discord's input test
    return (
        <div className={cn("w-full space-y-2", className)}>
            <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700 relative">
                {/* Background ticks/segments */}
                <div className="absolute inset-0 flex justify-between px-1">
                    {[...Array(40)].map((_, i) => (
                        <div key={i} className="w-[1px] h-full bg-white/20" />
                    ))}
                </div>

                {/* Active volume bar */}
                <div
                    className={cn("h-full transition-all duration-75 ease-out", barColor)}
                    style={{ width: `${volume}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <span>-60 dB</span>
                <span>-10 dB</span>
                <span>0 dB</span>
            </div>
        </div>
    );
};
