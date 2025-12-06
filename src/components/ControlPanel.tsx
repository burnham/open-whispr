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
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
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

  const loadTranscriptions = async () => {
    try {
      setIsLoading(true);
      await initializeTranscriptions();
    } catch (error) {
      showAlertDialog({
        title: "Unable to load history",
        description: "Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
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

      {/* Main content */}
      <div className="p-6">

        <div className="space-y-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  {t('controlPanel.recentTranscriptions')}
                </CardTitle>
                <div className="flex gap-2">
                  {history.length > 0 && (
                    <Button
                      onClick={clearHistory}
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto mb-3 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📝</span>
                  </div>
                  <p className="text-neutral-600">{t('controlPanel.loading')}</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                    <Mic className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    {t('controlPanel.noTranscriptions')}
                  </h3>
                  <p className="text-neutral-600 mb-4 max-w-sm mx-auto">
                    {t('controlPanel.pressHotkey')}
                  </p>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 max-w-md mx-auto">
                    <h4 className="font-medium text-neutral-800 mb-2">
                      {t('controlPanel.quickStart')}
                    </h4>
                    <ol className="text-sm text-neutral-600 text-left space-y-1">
                      <li>1. {t('controlPanel.step1')}</li>
                      <li>
                        2. {t('controlPanel.step2').replace('{key}', formatHotkeyLabel(hotkey))}
                      </li>
                      <li>3. {t('controlPanel.step3')}</li>
                      <li>
                        4. {t('controlPanel.step4').replace('{key}', formatHotkeyLabel(hotkey))}
                      </li>
                      <li>5. {t('controlPanel.step5')}</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {history.map((item, index) => (
                    <TranscriptionItem
                      key={item.id}
                      item={item}
                      index={index}
                      total={history.length}
                      onCopy={copyToClipboard}
                      onDelete={deleteTranscription}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
