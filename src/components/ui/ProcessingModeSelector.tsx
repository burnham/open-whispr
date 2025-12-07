import React from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Lock } from "lucide-react";

interface ProcessingModeSelectorProps {
  useLocalWhisper: boolean;
  setUseLocalWhisper: (value: boolean) => void;
  className?: string;
}

export default function ProcessingModeSelector({
  useLocalWhisper,
  setUseLocalWhisper,
  className = "",
}: ProcessingModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
      <button
        onClick={() => setUseLocalWhisper(false)}
        className={`p-4 border-2 rounded-xl text-left transition-all cursor-pointer ${!useLocalWhisper
          ? "border-indigo-500 bg-indigo-50 dark:bg-secondary/20 dark:border-primary"
          : "border-neutral-200 bg-white dark:bg-card dark:border-border hover:border-neutral-300"
          }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-blue-600 dark:text-[#0CA5B0]" />
            <h4 className="font-medium text-neutral-900 dark:text-foreground">{t('settings.transcription.cloudWhisper')}</h4>
          </div>
          <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
            {t('settings.transcription.cloudWhisperDesc')}
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-muted-foreground">
          {t('settings.transcription.cloudWhisperDetail')}
        </p>
      </button>

      <button
        onClick={() => setUseLocalWhisper(true)}
        className={`p-4 border-2 rounded-xl text-left transition-all cursor-pointer ${useLocalWhisper
          ? "border-indigo-500 bg-indigo-50 dark:bg-secondary/20 dark:border-primary"
          : "border-neutral-200 bg-white dark:bg-card dark:border-border hover:border-neutral-300"
          }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-blue-600 dark:text-[#0CA5B0]" />
            <h4 className="font-medium text-neutral-900 dark:text-foreground">{t('settings.transcription.localWhisper')}</h4>
          </div>
          <span className="text-xs text-blue-600 bg-blue-100 dark:bg-[#0CA5B0]/20 dark:text-[#0CA5B0] px-2 py-1 rounded-full">
            {t('settings.transcription.localWhisperDesc')}
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-muted-foreground">
          {t('settings.transcription.localWhisperDetail')}
        </p>
      </button>
    </div>
  );
}
