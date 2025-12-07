import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Settings, FileText, Mic, X } from "lucide-react";
import SettingsModal from "./SettingsModal";
import TitleBar from "./TitleBar";
import SupportDropdown from "./ui/SupportDropdown";
import TranscriptionItem from "./ui/TranscriptionItem";
import { ConfirmDialog, AlertDialog } from "./ui/dialog";
import { useDialogs } from "../hooks/useDialogs";
import { useHotkey } from "../hooks/useHotkey";
import { useToast } from "./ui/Toast";
import {
  useTranscriptions,
  initializeTranscriptions,
  removeTranscription as removeFromStore,
  clearTranscriptions as clearStoreTranscriptions,
} from "../stores/transcriptionStore";
import { formatHotkeyLabel } from "../utils/hotkeys";

import React, { Component, ErrorInfo, ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode; title?: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded text-red-800">
          <h3 className="font-bold mb-2">{this.props.title || "Something went wrong"}</h3>
          <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ControlPanel() {
  const { t } = useTranslation();
  // ... (rest of the existing code unchanged until return)
  const history = useTranscriptions();
  const [isLoading, setIsLoading] = useState(false);
  // Auto-open settings by default as it is now the main interface
  const [showSettings, setShowSettings] = useState(true);
  const { hotkey } = useHotkey();
  const { toast } = useToast();
  const [updateStatus, setUpdateStatus] = useState({
    updateAvailable: false,
    updateDownloaded: false,
    isDevelopment: false,
  });
  const isWindows = typeof window !== "undefined" && window.electronAPI?.getPlatform?.() === "win32";

  const {
    confirmDialog,
    alertDialog,
    showConfirmDialog,
    showAlertDialog,
    hideConfirmDialog,
    hideAlertDialog,
  } = useDialogs();

  const handleClose = () => {
    void window.electronAPI.windowClose();
  };

  useEffect(() => {
    loadTranscriptions();

    // Initialize update status
    const initializeUpdateStatus = async () => {
      try {
        const status = await window.electronAPI.getUpdateStatus();
        setUpdateStatus(status);
      } catch (error) {
        // Update status not critical for app function
      }
    };

    initializeUpdateStatus();

    // Set up update event listeners
    const handleUpdateAvailable = (_event: any, _info: any) => {
      setUpdateStatus((prev) => ({ ...prev, updateAvailable: true }));
    };

    const handleUpdateDownloaded = (_event: any, _info: any) => {
      setUpdateStatus((prev) => ({ ...prev, updateDownloaded: true }));
    };

    const handleUpdateError = (_event: any, _error: any) => {
      // Update errors are handled by the update service
    };

    const disposers = [
      window.electronAPI.onUpdateAvailable(handleUpdateAvailable),
      window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded),
      window.electronAPI.onUpdateError(handleUpdateError),
    ];

    // Cleanup listeners on unmount
    return () => {
      disposers.forEach((dispose) => dispose?.());
    };
  }, []);

  // Transcription loading is now handled by the RecentTranscriptions component
  // We keep this empty or minimal if needed for other features
  const loadTranscriptions = async () => {
    // No-op or minimal init if needed globally
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t('controlPanel.copied'),
        description: t('controlPanel.copied'),
        variant: "success",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: t('controlPanel.copyFailed'),
        description: t('controlPanel.copyFailed'),
        variant: "destructive",
      });
    }
  };

  const clearHistory = async () => {
    showConfirmDialog({
      title: t('dialogs.clearHistoryTitle'),
      description: t('dialogs.clearHistoryDesc'),
      onConfirm: async () => {
        try {
          const result = await window.electronAPI.clearTranscriptions();
          clearStoreTranscriptions();
          showAlertDialog({
            title: t('common.success'),
            description: `Successfully cleared ${result.cleared} transcriptions.`,
          });
        } catch (error) {
          showAlertDialog({
            title: t('common.error'),
            description: "Failed to clear history.",
          });
        }
      },
      variant: "destructive",
    });
  };

  const deleteTranscription = async (id: number) => {
    showConfirmDialog({
      title: t('dialogs.deleteTranscriptionTitle'),
      description: t('dialogs.deleteTranscriptionDesc'),
      onConfirm: async () => {
        try {
          const result = await window.electronAPI.deleteTranscription(id);
          if (result.success) {
            removeFromStore(id);
          } else {
            showAlertDialog({
              title: t('common.error'),
              description:
                "Failed to delete.",
            });
          }
        } catch (error) {
          showAlertDialog({
            title: t('common.error'),
            description: "Failed to delete.",
          });
        }
      },
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={hideConfirmDialog}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />

      <AlertDialog
        open={alertDialog.open}
        onOpenChange={hideAlertDialog}
        title={alertDialog.title}
        description={alertDialog.description}
        onOk={() => { }}
      />

      <TitleBar
        actions={
          <>
            {/* Update notification badge */}
            {!updateStatus.isDevelopment &&
              (updateStatus.updateAvailable ||
                updateStatus.updateDownloaded) && (
                <div className="relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            <SupportDropdown />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={16} />
            </Button>
            {isWindows && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleClose}
                  aria-label="Close window"
                >
                  <X size={14} />
                </Button>
              </div>
            )}
          </>
        }
      />

      <ErrorBoundary title="Settings Error">
        <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      </ErrorBoundary>

      {/* Main content - Fallback if settings are closed */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 bg-gray-50 dark:bg-[#292420]">
        <div className="w-16 h-16 bg-white dark:bg-[#3C2E24] rounded-2xl shadow-sm flex items-center justify-center mb-6">
          <Settings className="w-8 h-8 text-gray-400 dark:text-[#FEFEEB]" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-[#FEFEEB] mb-2">
          {t('settings.general.mainTitle')}
        </h2>
        <p className="text-gray-500 dark:text-[#FEFEEB]/70 mb-8 max-w-sm">
          {t('controlPanel.settingsClosedDesc', 'The control panel settings are currently closed.')}
        </p>
        <Button
          onClick={() => setShowSettings(true)}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-[#4E3F30] dark:hover:bg-[#3E3226] text-white dark:text-[#FEFEEB]"
        >
          {t('common.openSettings', 'Open Settings')}
        </Button>
      </div>
    </div>
  );
}
