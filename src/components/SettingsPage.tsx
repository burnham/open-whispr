import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { RefreshCw, Download, Keyboard, Mic, Shield } from "lucide-react";
import WhisperModelPicker from "./WhisperModelPicker";
import ProcessingModeSelector from "./ui/ProcessingModeSelector";
import ApiKeyInput from "./ui/ApiKeyInput";
import { ConfirmDialog, AlertDialog } from "./ui/dialog";
import { useSettings } from "../hooks/useSettings";
import { useDialogs } from "../hooks/useDialogs";
import { useAgentName } from "../utils/agentName";
import { useWhisper } from "../hooks/useWhisper";
import { usePermissions } from "../hooks/usePermissions";
import { useClipboard } from "../hooks/useClipboard";
import { REASONING_PROVIDERS } from "../utils/languages";
import { formatHotkeyLabel } from "../utils/hotkeys";
import LanguageSelector from "./ui/LanguageSelector";
import { LanguageSwitcher } from "./ui/LanguageSwitcher";
import PromptStudio from "./ui/PromptStudio";
import { API_ENDPOINTS } from "../config/constants";
import AIModelSelectorEnhanced from "./AIModelSelectorEnhanced";
import MicrophoneSelector from "./ui/MicrophoneSelector";
import type { UpdateInfoResult } from "../types/electron";
import HotkeyRecorder from "./ui/HotkeyRecorder";
const InteractiveKeyboard = React.lazy(() => import("./ui/Keyboard"));

export type SettingsSectionType =
  | "general"
  | "transcription"
  | "aiModels"
  | "agentConfig"
  | "prompts";

interface SettingsPageProps {
  activeSection?: SettingsSectionType;
}

export default function SettingsPage({
  activeSection = "general",
}: SettingsPageProps) {
  const { t } = useTranslation();
  // Use custom hooks
  const {
    confirmDialog,
    alertDialog,
    showConfirmDialog,
    showAlertDialog,
    hideConfirmDialog,
    hideAlertDialog,
  } = useDialogs();

  const {
    useLocalWhisper,
    whisperModel,
    allowOpenAIFallback,
    allowLocalFallback,
    fallbackWhisperModel,
    preferredLanguage,
    cloudTranscriptionBaseUrl,
    cloudReasoningBaseUrl,
    useReasoningModel,
    reasoningModel,
    reasoningProvider,
    openaiApiKey,
    anthropicApiKey,
    geminiApiKey,
    dictationKey,
    setUseLocalWhisper,
    setWhisperModel,
    setAllowOpenAIFallback,
    setAllowLocalFallback,
    setFallbackWhisperModel,
    setPreferredLanguage,
    setCloudTranscriptionBaseUrl,
    setCloudReasoningBaseUrl,
    setUseReasoningModel,
    setReasoningModel,
    setReasoningProvider,
    setOpenaiApiKey,
    setAnthropicApiKey,
    setGeminiApiKey,
    setDictationKey,
    selectedMicrophone,
    setSelectedMicrophone,
    updateTranscriptionSettings,
    updateReasoningSettings,
    updateApiKeys,
  } = useSettings();

  // Update state
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<{
    updateAvailable: boolean;
    updateDownloaded: boolean;
    isDevelopment: boolean;
  }>({ updateAvailable: false, updateDownloaded: false, isDevelopment: false });
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [installInitiated, setInstallInitiated] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<{
    version?: string;
    releaseDate?: string;
    releaseNotes?: string;
  }>({});
  const [isRemovingModels, setIsRemovingModels] = useState(false);
  const cachePathHint =
    typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
      ? "%USERPROFILE%\\.cache\\openwhispr\\models"
      : "~/.cache/openwhispr/models";

  const isUpdateAvailable =
    !updateStatus.isDevelopment &&
    (updateStatus.updateAvailable || updateStatus.updateDownloaded);

  const whisperHook = useWhisper(showAlertDialog);
  const permissionsHook = usePermissions(showAlertDialog);
  const { pasteFromClipboardWithFallback } = useClipboard(showAlertDialog);
  const { agentName, setAgentName } = useAgentName();
  const installTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribeToUpdates = useCallback(() => {
    if (!window.electronAPI) return () => { };

    const disposers: Array<(() => void) | void> = [];

    if (window.electronAPI.onUpdateAvailable) {
      disposers.push(
        window.electronAPI.onUpdateAvailable((_event, info) => {
          setUpdateStatus((prev) => ({
            ...prev,
            updateAvailable: true,
            updateDownloaded: false,
          }));
          if (info) {
            setUpdateInfo({
              version: info.version || "unknown",
              releaseDate: info.releaseDate,
              releaseNotes: info.releaseNotes ?? undefined,
            });
          }
        })
      );
    }

    if (window.electronAPI.onUpdateNotAvailable) {
      disposers.push(
        window.electronAPI.onUpdateNotAvailable(() => {
          setUpdateStatus((prev) => ({
            ...prev,
            updateAvailable: false,
            updateDownloaded: false,
          }));
          setUpdateInfo({});
          setDownloadingUpdate(false);
          setInstallInitiated(false);
          setUpdateDownloadProgress(0);
        })
      );
    }

    if (window.electronAPI.onUpdateDownloaded) {
      disposers.push(
        window.electronAPI.onUpdateDownloaded((_event, info) => {
          setUpdateStatus((prev) => ({ ...prev, updateDownloaded: true }));
          setDownloadingUpdate(false);
          setInstallInitiated(false);
          if (info) {
            setUpdateInfo({
              version: info.version || "unknown",
              releaseDate: info.releaseDate,
              releaseNotes: info.releaseNotes ?? undefined,
            });
          }
        })
      );
    }

    if (window.electronAPI.onUpdateDownloadProgress) {
      disposers.push(
        window.electronAPI.onUpdateDownloadProgress((_event, progressObj) => {
          setUpdateDownloadProgress(progressObj.percent || 0);
        })
      );
    }

    if (window.electronAPI.onUpdateError) {
      disposers.push(
        window.electronAPI.onUpdateError((_event, error) => {
          setCheckingForUpdates(false);
          setDownloadingUpdate(false);
          setInstallInitiated(false);
          console.error("Update error:", error);
          showAlertDialog({
            title: "Update Error",
            description:
              typeof error?.message === "string"
                ? error.message
                : "The updater encountered a problem. Please try again or download the latest release manually.",
          });
        })
      );
    }

    return () => {
      disposers.forEach((dispose) => dispose?.());
    };
  }, [showAlertDialog]);

  // Local state for provider selection (overrides computed value)
  const [localReasoningProvider, setLocalReasoningProvider] = useState(() => {
    return localStorage.getItem("reasoningProvider") || reasoningProvider;
  });

  // Defer heavy operations for better performance
  useEffect(() => {
    let mounted = true;
    let unsubscribeUpdates;

    // Defer version and update checks to improve initial render
    const timer = setTimeout(async () => {
      if (!mounted) return;

      const versionResult = await window.electronAPI?.getAppVersion();
      if (versionResult && mounted) setCurrentVersion(versionResult.version);

      const statusResult = await window.electronAPI?.getUpdateStatus();
      if (statusResult && mounted) {
        setUpdateStatus((prev) => ({
          ...prev,
          ...statusResult,
          updateAvailable: prev.updateAvailable || statusResult.updateAvailable,
          updateDownloaded: prev.updateDownloaded || statusResult.updateDownloaded,
        }));
        if ((statusResult.updateAvailable || statusResult.updateDownloaded) && window.electronAPI?.getUpdateInfo) {
          const info = await window.electronAPI.getUpdateInfo();
          if (info) {
            setUpdateInfo({
              version: info.version || "unknown",
              releaseDate: info.releaseDate,
              releaseNotes: info.releaseNotes ?? undefined,
            });
          }
        }
      }

      unsubscribeUpdates = subscribeToUpdates();

      // Check whisper after initial render
      if (mounted) {
        whisperHook.checkWhisperInstallation();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      // Always clean up update listeners if they exist
      unsubscribeUpdates?.();
    };
  }, [whisperHook, subscribeToUpdates]);

  useEffect(() => {
    if (installInitiated) {
      if (installTimeoutRef.current) {
        clearTimeout(installTimeoutRef.current);
      }
      installTimeoutRef.current = setTimeout(() => {
        setInstallInitiated(false);
        showAlertDialog({
          title: "Still Running",
          description:
            "OpenWhispr didn't restart automatically. Please quit the app manually to finish installing the update.",
        });
      }, 10000);
    } else if (installTimeoutRef.current) {
      clearTimeout(installTimeoutRef.current);
      installTimeoutRef.current = null;
    }

    return () => {
      if (installTimeoutRef.current) {
        clearTimeout(installTimeoutRef.current);
        installTimeoutRef.current = null;
      }
    };
  }, [installInitiated, showAlertDialog]);

  const saveReasoningSettings = useCallback(async () => {
    const normalizedReasoningBase = (cloudReasoningBaseUrl || '').trim();
    setCloudReasoningBaseUrl(normalizedReasoningBase);

    // Update reasoning settings
    updateReasoningSettings({
      useReasoningModel,
      reasoningModel,
      cloudReasoningBaseUrl: normalizedReasoningBase
    });

    // Save API keys to backend based on provider
    if (localReasoningProvider === "openai" && openaiApiKey) {
      await window.electronAPI?.saveOpenAIKey(openaiApiKey);
    }
    if (localReasoningProvider === "anthropic" && anthropicApiKey) {
      await window.electronAPI?.saveAnthropicKey(anthropicApiKey);
    }
    if (localReasoningProvider === "gemini" && geminiApiKey) {
      await window.electronAPI?.saveGeminiKey(geminiApiKey);
    }

    updateApiKeys({
      ...(localReasoningProvider === "openai" &&
        openaiApiKey.trim() && { openaiApiKey }),
      ...(localReasoningProvider === "anthropic" &&
        anthropicApiKey.trim() && { anthropicApiKey }),
      ...(localReasoningProvider === "gemini" &&
        geminiApiKey.trim() && { geminiApiKey }),
    });

    // Save the provider separately since it's computed from the model
    localStorage.setItem("reasoningProvider", localReasoningProvider);

    const providerLabel =
      localReasoningProvider === 'custom'
        ? 'Custom'
        : REASONING_PROVIDERS[
          localReasoningProvider as keyof typeof REASONING_PROVIDERS
        ]?.name || localReasoningProvider;

    showAlertDialog({
      title: "Reasoning Settings Saved",
      description: `AI text enhancement ${useReasoningModel ? "enabled" : "disabled"
        } with ${providerLabel
        } ${reasoningModel}`,
    });
  }, [
    useReasoningModel,
    reasoningModel,
    localReasoningProvider,
    openaiApiKey,
    anthropicApiKey,
    updateReasoningSettings,
    updateApiKeys,
    showAlertDialog,
  ]);

  const saveApiKey = useCallback(async () => {
    try {
      // Save all API keys to backend
      if (openaiApiKey) {
        await window.electronAPI?.saveOpenAIKey(openaiApiKey);
      }
      if (anthropicApiKey) {
        await window.electronAPI?.saveAnthropicKey(anthropicApiKey);
      }
      if (geminiApiKey) {
        await window.electronAPI?.saveGeminiKey(geminiApiKey);
      }

      updateApiKeys({ openaiApiKey, anthropicApiKey, geminiApiKey });
      updateTranscriptionSettings({ allowLocalFallback, fallbackWhisperModel });

      try {
        if (openaiApiKey) {
          await window.electronAPI?.createProductionEnvFile(openaiApiKey);
        }

        const savedKeys: string[] = [];
        if (openaiApiKey) savedKeys.push("OpenAI");
        if (anthropicApiKey) savedKeys.push("Anthropic");
        if (geminiApiKey) savedKeys.push("Gemini");

        showAlertDialog({
          title: "API Keys Saved",
          description: `${savedKeys.join(", ")} API key${savedKeys.length > 1 ? 's' : ''} saved successfully! Your credentials have been securely recorded.${allowLocalFallback ? " Local Whisper fallback is enabled." : ""
            }`,
        });
      } catch (envError) {
        showAlertDialog({
          title: "API Key Saved",
          description: `OpenAI API key saved successfully and will be available for transcription${allowLocalFallback ? " with Local Whisper fallback enabled" : ""
            }`,
        });
      }
    } catch (error) {
      console.error("Failed to save API key:", error);
      updateApiKeys({ openaiApiKey });
      updateTranscriptionSettings({ allowLocalFallback, fallbackWhisperModel });
      showAlertDialog({
        title: "API Key Saved",
        description: "OpenAI API key saved to localStorage (fallback mode)",
      });
    }
  }, [
    openaiApiKey,
    anthropicApiKey,
    geminiApiKey,
    allowLocalFallback,
    fallbackWhisperModel,
    updateApiKeys,
    updateTranscriptionSettings,
    showAlertDialog,
  ]);

  const resetAccessibilityPermissions = () => {
    const message = `🔄 RESET ACCESSIBILITY PERMISSIONS\n\nIf you've rebuilt or reinstalled OpenWhispr and automatic inscription isn't functioning, you may have obsolete permissions from the previous version.\n\n📋 STEP-BY-STEP RESTORATION:\n\n1️⃣ Open System Settings (or System Preferences)\n   • macOS Ventura+: Apple Menu → System Settings\n   • Older macOS: Apple Menu → System Preferences\n\n2️⃣ Navigate to Privacy & Security → Accessibility\n\n3️⃣ Look for obsolete OpenWhispr entries:\n   • Any entries named "OpenWhispr"\n   • Any entries named "Electron"\n   • Any entries with unclear or generic names\n   • Entries pointing to old application locations\n\n4️⃣ Remove ALL obsolete entries:\n   • Select each old entry\n   • Click the minus (-) button\n   • Enter your password if prompted\n\n5️⃣ Add the current OpenWhispr:\n   • Click the plus (+) button\n   • Navigate to and select the CURRENT OpenWhispr app\n   • Ensure the checkbox is ENABLED\n\n6️⃣ Restart OpenWhispr completely\n\n💡 This is very common during development when rebuilding applications!\n\nClick OK when you're ready to open System Settings.`;

    showConfirmDialog({
      title: "Reset Accessibility Permissions",
      description: message,
      onConfirm: () => {
        showAlertDialog({
          title: "Opening System Settings",
          description:
            "Opening System Settings... Look for the Accessibility section under Privacy & Security.",
        });

        window.open(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
          "_blank"
        );
      },
    });
  };

  const saveKey = async () => {
    try {
      const result = await window.electronAPI?.updateHotkey(dictationKey);

      if (!result?.success) {
        showAlertDialog({
          title: "Hotkey Not Saved",
          description:
            result?.message ||
            "This key could not be registered. Please choose a different key.",
        });
        return;
      }

      showAlertDialog({
        title: "Key Saved",
        description: `Dictation key saved: ${formatHotkeyLabel(dictationKey)}`,
      });
    } catch (error) {
      console.error("Failed to update hotkey:", error);
      showAlertDialog({
        title: "Error",
        description: `Failed to update hotkey: ${error.message}`,
      });
    }
  };

  const handleRemoveModels = useCallback(() => {
    if (isRemovingModels) return;

    showConfirmDialog({
      title: "Remove downloaded models?",
      description:
        `This deletes all locally cached Whisper models (${cachePathHint}) and frees disk space. You can download them again from the model picker.`,
      confirmText: "Delete Models",
      variant: "destructive",
      onConfirm: () => {
        setIsRemovingModels(true);
        window.electronAPI
          ?.modelDeleteAll?.()
          .then((result) => {
            if (!result?.success) {
              showAlertDialog({
                title: "Unable to Remove Models",
                description:
                  result?.error ||
                  "Something went wrong while deleting the cached models.",
              });
              return;
            }

            window.dispatchEvent(new Event("openwhispr-models-cleared"));

            showAlertDialog({
              title: "Models Removed",
              description:
                "All downloaded Whisper models were deleted. You can re-download any model from the picker when needed.",
            });
          })
          .catch((error) => {
            showAlertDialog({
              title: "Unable to Remove Models",
              description: error?.message || "An unknown error occurred.",
            });
          })
          .finally(() => {
            setIsRemovingModels(false);
          });
      },
    });
  }, [isRemovingModels, cachePathHint, showConfirmDialog, showAlertDialog]);

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-8">
            {/* Language Section */}
            <div className="border-b pb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('settings.general.title')}
                </h3>
              </div>
              <LanguageSwitcher />
            </div>

            {/* App Updates Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('settings.general.appUpdates')}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings.general.appUpdatesDesc')}
                </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {t('settings.general.currentVersion')}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {currentVersion || t('common.loading')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {updateStatus.isDevelopment ? (
                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                      {t('settings.general.developmentMode')}
                    </span>
                  ) : updateStatus.updateAvailable ? (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      {t('settings.general.updateAvailable')}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">
                      {t('settings.general.upToDate')}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={async () => {
                    setCheckingForUpdates(true);
                    try {
                      const result =
                        await window.electronAPI?.checkForUpdates();
                      if (result?.updateAvailable && result.version !== currentVersion) {
                        setUpdateInfo({
                          version: result.version || 'unknown',
                          releaseDate: result.releaseDate,
                          releaseNotes: result.releaseNotes,
                        });
                        setUpdateStatus((prev) => ({
                          ...prev,
                          updateAvailable: true,
                          updateDownloaded: false,
                        }));
                        showAlertDialog({
                          title: t('settings.general.updateAvailable'),
                          description: `${t('settings.general.updateAvailable')}: v${result.version || 'new version'}`,
                        });
                      } else {
                        // If updateAvailable is true but versions match, treat as up to date (reinstall scenario handled elsewhere if needed)
                        showAlertDialog({
                          title: t('settings.general.upToDate'),
                          description: t('settings.general.upToDate'),
                        });
                      }
                    } catch (error: any) {
                      showAlertDialog({
                        title: t('common.error'),
                        description: `Error: ${error.message}`,
                      });
                    } finally {
                      setCheckingForUpdates(false);
                    }
                  }}
                  disabled={checkingForUpdates || updateStatus.isDevelopment}
                  className="w-full"
                >
                  {checkingForUpdates ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      {t('settings.general.checkForUpdates')}...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} className="mr-2" />
                      {t('settings.general.checkForUpdates')}
                    </>
                  )}
                </Button>

                {isUpdateAvailable && !updateStatus.updateDownloaded && (
                  <div className="space-y-2">
                    <Button
                      onClick={async () => {
                        setDownloadingUpdate(true);
                        setUpdateDownloadProgress(0);
                        try {
                          await window.electronAPI?.downloadUpdate();
                        } catch (error: any) {
                          setDownloadingUpdate(false);
                          showAlertDialog({
                            title: t('common.error'),
                            description: `Failed: ${error.message}`,
                          });
                        }
                      }}
                      disabled={downloadingUpdate}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {downloadingUpdate ? (
                        <>
                          <Download size={16} className="animate-pulse mr-2" />
                          {t('settings.general.downloadUpdate')}... {Math.round(updateDownloadProgress)}%
                        </>
                      ) : (
                        <>
                          <Download size={16} className="mr-2" />
                          {t('settings.general.downloadUpdate')}{updateInfo.version ? ` v${updateInfo.version}` : ''}
                        </>
                      )}
                    </Button>

                    {downloadingUpdate && (
                      <div className="space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className="h-full bg-green-600 transition-all duration-200"
                            style={{ width: `${Math.min(100, Math.max(0, updateDownloadProgress))}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-600 text-right">
                          {Math.round(updateDownloadProgress)}% downloaded
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {updateStatus.updateDownloaded && (
                  <Button
                    onClick={() => {
                      showConfirmDialog({
                        title: t('settings.general.installRestart'),
                        description: t('settings.general.installRestart'),
                        confirmText: t('settings.general.installRestart'),
                        onConfirm: async () => {
                          try {
                            setInstallInitiated(true);
                            const result = await window.electronAPI?.installUpdate?.();
                            if (!result?.success) {
                              setInstallInitiated(false);
                              showAlertDialog({
                                title: t('common.error'),
                                description:
                                  result?.message ||
                                  "Failed to start.",
                              });
                              return;
                            }

                            showAlertDialog({
                              title: t('settings.general.installRestart'),
                              description:
                                "Restarting...",
                            });
                          } catch (error: any) {
                            setInstallInitiated(false);
                            showAlertDialog({
                              title: t('common.error'),
                              description: `Failed: ${error.message}`,
                            });
                          }
                        },
                      });
                    }}
                    disabled={installInitiated}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {installInitiated ? (
                      <>
                        <RefreshCw size={16} className="animate-spin mr-2" />
                        {t('settings.general.installRestart')}...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🚀</span>
                        {t('settings.general.installRestart')}
                      </>
                    )}
                  </Button>
                )}

                {updateInfo.version && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Update v{updateInfo.version}
                    </h4>
                    {updateInfo.releaseDate && (
                      <p className="text-sm text-blue-700 mb-2">
                        {t('settings.general.released')} {new Date(updateInfo.releaseDate).toLocaleDateString()}
                      </p>
                    )}
                    {updateInfo.releaseNotes && (
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">{t('settings.general.whatsNew')}</p>
                        <div className="whitespace-pre-wrap">{updateInfo.releaseNotes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hotkey Section */}
            <div className="border-t pt-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('settings.general.dictationHotkey')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t('settings.general.dictationHotkeyDesc')}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <HotkeyRecorder
                    value={dictationKey}
                    onChange={setDictationKey}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {t('settings.general.clickToRecord')}
                  </p>
                </div>
                <Button
                  onClick={saveKey}
                  disabled={!dictationKey.trim()}
                  className="w-full"
                >
                  {t('settings.general.saveHotkey')}
                </Button>
              </div>
            </div>

            {/* Microphone Section */}
            <div className="border-t pt-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('settings.transcription.microphone')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t('settings.transcription.microphoneSelect')}
                </p>
              </div>
              <div className="space-y-4">
                <MicrophoneSelector
                  selectedMicrophone={selectedMicrophone || "default"}
                  onMicrophoneSelect={(deviceId) => {
                    updateTranscriptionSettings({ selectedMicrophone: deviceId });
                  }}
                />
              </div>
            </div>

            {/* Permissions Section */}
            <div className="border-t pt-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('settings.general.permissions')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t('settings.general.permissionsDesc')}
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={permissionsHook.requestMicPermission}
                  variant="outline"
                  className="w-full"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {t('settings.general.testMic')}
                </Button>
                <Button
                  onClick={permissionsHook.testAccessibilityPermission}
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {t('settings.general.testAccess')}
                </Button>
                {window.electronAPI?.platform === 'darwin' && (
                  <Button
                    onClick={resetAccessibilityPermissions}
                    variant="secondary"
                    className="w-full"
                  >
                    <span className="mr-2">⚙️</span>
                    {t('settings.general.fixPermissions')}
                  </Button>
                )}
              </div>
            </div>

            {/* About Section */}
            <div className="border-t pt-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('settings.general.about')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t('settings.general.aboutDesc')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
                <div className="text-center p-4 border border-gray-200 rounded-xl bg-white">
                  <div className="w-8 h-8 mx-auto mb-2 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-medium text-gray-800 mb-1">
                    {t('settings.general.dictationHotkey')}
                  </p>
                  <p className="text-gray-600 font-mono text-xs">
                    {formatHotkeyLabel(dictationKey)}
                  </p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-xl bg-white">
                  <div className="w-8 h-8 mx-auto mb-2 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🏷️</span>
                  </div>
                  <p className="font-medium text-gray-800 mb-1">{t('settings.general.currentVersion')}</p>
                  <p className="text-gray-600 text-xs">
                    {currentVersion || "0.1.0"}
                  </p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-xl bg-white">
                  <div className="w-8 h-8 mx-auto mb-2 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="font-medium text-gray-800 mb-1">{t('settings.general.status')}</p>
                  <p className="text-green-600 text-xs font-medium">{t('settings.general.active')}</p>
                </div>
              </div>

              {/* System Actions */}
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    showConfirmDialog({
                      title: t('dialogs.resetOnboardingTitle'),
                      description: t('dialogs.resetOnboardingDesc'),
                      onConfirm: () => {
                        localStorage.removeItem("onboardingCompleted");
                        window.location.reload();
                      },
                      variant: "destructive",
                    });
                  }}
                  variant="outline"
                  className="w-full text-amber-600 border-amber-300 hover:bg-amber-50 hover:border-amber-400"
                >
                  <span className="mr-2">🔄</span>
                  {t('settings.general.resetOnboarding')}
                </Button>
                <Button
                  onClick={() => {
                    showConfirmDialog({
                      title: t('dialogs.cleanDataTitle'),
                      description: t('dialogs.cleanDataDesc'),
                      onConfirm: () => {
                        window.electronAPI
                          ?.cleanupApp()
                          .then(() => {
                            showAlertDialog({
                              title: t('common.success'),
                              description:
                                "Cleanup completed!",
                            });
                            setTimeout(() => {
                              window.location.reload();
                            }, 1000);
                          })
                          .catch((error) => {
                            showAlertDialog({
                              title: t('common.error'),
                              description: `Failed: ${error.message}`,
                            });
                          });
                      },
                      variant: "destructive",
                    });
                  }}
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <span className="mr-2">🗑️</span>
                  {t('settings.general.cleanAppData')}
                </Button>
              </div>

              <div className="space-y-3 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <h4 className="font-medium text-rose-900">{t('settings.general.localModelStorage')}</h4>
                <p className="text-sm text-rose-800">
                  {t('settings.general.removeModelsDesc')}
                </p>
                <Button
                  variant="destructive"
                  onClick={handleRemoveModels}
                  disabled={isRemovingModels}
                  className="w-full"
                >
                  {isRemovingModels ? t('common.loading') : t('settings.general.removeModels')}
                </Button>
                <p className="text-xs text-rose-700">
                  {t('settings.general.currentCacheLocation')}: <code>{cachePathHint}</code>
                </p>
              </div>
            </div>
          </div>
        );

      case "transcription":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('settings.transcription.speechToText')}
              </h3>
              <ProcessingModeSelector
                useLocalWhisper={useLocalWhisper}
                setUseLocalWhisper={(value) => {
                  setUseLocalWhisper(value);
                  updateTranscriptionSettings({ useLocalWhisper: value });
                }}
              />
            </div>



            {!useLocalWhisper && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-medium text-blue-900">{t('settings.transcription.openAiSetup')}</h4>
                <ApiKeyInput
                  apiKey={openaiApiKey}
                  setApiKey={setOpenaiApiKey}
                  helpText={
                    <>
                      {t('settings.transcription.supportsOpenAI')}{" "}
                      <a
                        href="https://platform.openai.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {t('settings.transcription.getApiKey')}
                      </a>
                      .
                    </>
                  }
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-blue-900">
                    {t('settings.transcription.customBaseUrl')}
                  </label>
                  <Input
                    value={cloudTranscriptionBaseUrl}
                    onChange={(event) => setCloudTranscriptionBaseUrl(event.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCloudTranscriptionBaseUrl(API_ENDPOINTS.TRANSCRIPTION_BASE)}
                    >
                      {t('settings.transcription.resetDefault')}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-800">
                    {t('settings.transcription.cloudNote')}
                    <code className="ml-1">{API_ENDPOINTS.TRANSCRIPTION_BASE}</code>.
                  </p>
                </div>
              </div>
            )}

            {useLocalWhisper && whisperHook.whisperInstalled && (
              <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <h4 className="font-medium text-purple-900">
                  {t('settings.transcription.localModel')}
                </h4>
                <WhisperModelPicker
                  selectedModel={whisperModel}
                  onModelSelect={setWhisperModel}
                  variant="settings"
                />
              </div>
            )}

            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <h4 className="font-medium text-gray-900">{t('settings.transcription.language')}</h4>
              <LanguageSelector
                value={preferredLanguage}
                onChange={(value) => {
                  setPreferredLanguage(value);
                  updateTranscriptionSettings({ preferredLanguage: value });
                }}
                className="w-full"
              />
            </div>

            <Button
              onClick={() => {
                const normalizedTranscriptionBase = (cloudTranscriptionBaseUrl || '').trim();
                setCloudTranscriptionBaseUrl(normalizedTranscriptionBase);

                updateTranscriptionSettings({
                  useLocalWhisper,
                  whisperModel,
                  preferredLanguage,
                  cloudTranscriptionBaseUrl: normalizedTranscriptionBase,
                });

                if (!useLocalWhisper && openaiApiKey.trim()) {
                  updateApiKeys({ openaiApiKey });
                }

                const descriptionParts = [
                  `Transcription mode: ${useLocalWhisper ? 'Local Whisper' : 'Cloud'}.`,
                  `Language: ${preferredLanguage}.`,
                ];

                if (!useLocalWhisper) {
                  const baseLabel = normalizedTranscriptionBase || API_ENDPOINTS.TRANSCRIPTION_BASE;
                  descriptionParts.push(`Endpoint: ${baseLabel}.`);
                }

                showAlertDialog({
                  title: t('common.save'),
                  description: descriptionParts.join(' '),
                });
              }}
              className="w-full"
            >
              {t('settings.transcription.saveSettings')}
            </Button>
          </div>
        );

      case "aiModels":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('settings.aiModels.enhancement')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {t('settings.aiModels.enhancementDesc')}
              </p>
            </div>

            <AIModelSelectorEnhanced
              useReasoningModel={useReasoningModel}
              setUseReasoningModel={(value) => {
                setUseReasoningModel(value);
                updateReasoningSettings({ useReasoningModel: value });
              }}
              setCloudReasoningBaseUrl={setCloudReasoningBaseUrl}
              cloudReasoningBaseUrl={cloudReasoningBaseUrl}
              reasoningModel={reasoningModel}
              setReasoningModel={setReasoningModel}
              localReasoningProvider={localReasoningProvider}
              setLocalReasoningProvider={setLocalReasoningProvider}
              openaiApiKey={openaiApiKey}
              setOpenaiApiKey={setOpenaiApiKey}
              anthropicApiKey={anthropicApiKey}
              setAnthropicApiKey={setAnthropicApiKey}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
              pasteFromClipboard={pasteFromClipboardWithFallback}
              showAlertDialog={showAlertDialog}
            />

            <Button onClick={saveReasoningSettings} className="w-full">
              {t('settings.aiModels.saveSettings')}
            </Button>
          </div>
        );

      case "agentConfig":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('settings.agentConfig.agentName')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {t('settings.agentConfig.agentNameDesc')}
              </p>
            </div>

            <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
              <h4 className="font-medium text-purple-900 mb-3">
                💡 {t('settings.agentConfig.howToUse')}
              </h4>
              <ul className="text-sm text-purple-800 space-y-2">
                <li>
                  • {t('settings.agentConfig.tip1').replace('{name}', agentName || 'Agent')}
                </li>
                <li>
                  • {t('settings.agentConfig.tip2').replace('{name}', agentName || 'Agent')}
                </li>
                <li>
                  • {t('settings.agentConfig.tip3')}
                </li>
              </ul>
            </div>

            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <h4 className="font-medium text-gray-900">{t('settings.agentConfig.currentName')}</h4>
              <div className="flex gap-3">
                <Input
                  placeholder={t('settings.agentConfig.placeholder')}
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="flex-1 text-center text-lg font-mono"
                />
                <Button
                  onClick={() => {
                    setAgentName(agentName.trim());
                    showAlertDialog({
                      title: t('common.success'),
                      description: `Your agent is now named "${agentName.trim()}".`,
                    });
                  }}
                  disabled={!agentName.trim()}
                >
                  {t('settings.agentConfig.save')}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {t('settings.agentConfig.nameHint')}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                🎯 {t('settings.agentConfig.exampleUsage')}
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  • {t('settings.agentConfig.ex1').replace('{name}', agentName || 'Agent')}
                </p>
                <p>
                  • {t('settings.agentConfig.ex2').replace('{name}', agentName || 'Agent')}
                </p>
                <p>
                  • {t('settings.agentConfig.ex3')}
                </p>
              </div>
            </div>
          </div>
        );


      case "prompts":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('settings.prompts.title')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {t('settings.prompts.desc')}
              </p>
            </div>
            <PromptStudio />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && hideConfirmDialog()}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
      />

      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => !open && hideAlertDialog()}
        title={alertDialog.title}
        description={alertDialog.description}
        onOk={() => { }}
      />

      {renderSectionContent()}
    </>
  );
}
