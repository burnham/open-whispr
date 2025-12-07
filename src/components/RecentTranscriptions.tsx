import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Mic, FileText } from "lucide-react";
import TranscriptionItem from "./ui/TranscriptionItem";
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

export default function RecentTranscriptions() {
    const { t } = useTranslation();
    const history = useTranscriptions();
    const [isLoading, setIsLoading] = useState(true);
    const { hotkey } = useHotkey();
    const { toast } = useToast();

    const {
        showConfirmDialog,
        showAlertDialog,
    } = useDialogs();

    useEffect(() => {
        loadTranscriptions();
    }, []);

    const loadTranscriptions = async () => {
        try {
            setIsLoading(true);
            await initializeTranscriptions();
        } catch (error) {
            // Non-critical error
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
                            description: "Failed to delete.",
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
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#FEFEEB] mb-2">
                        {t('controlPanel.recentTranscriptions')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-[#FEFEEB]/70">
                        View and manage your recent voice transcriptions.
                    </p>
                </div>

                {history.length > 0 && (
                    <Button
                        onClick={clearHistory}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 size={16} className="mr-2" />
                        {t('common.clearAll', 'Clear All')}
                    </Button>
                )}
            </div>

            <Card className="dark:bg-card dark:border-border">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 mx-auto mb-3 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm">📝</span>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-400">{t('controlPanel.loading')}</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                                <Mic className="w-8 h-8 text-neutral-400" />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-200 mb-2">
                                {t('controlPanel.noTranscriptions')}
                            </h3>
                            <p className="text-neutral-600 dark:text-neutral-400 mb-4 max-w-sm mx-auto">
                                {t('controlPanel.pressHotkey')}
                            </p>
                            <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 max-w-md mx-auto text-left">
                                <h4 className="font-medium text-neutral-800 dark:text-neutral-300 mb-2">
                                    {t('controlPanel.quickStart')}
                                </h4>
                                <ol className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                                    <li>1. {t('controlPanel.step1')}</li>
                                    <li>
                                        2. {t('controlPanel.step2').replace('{key}', formatHotkeyLabel(hotkey))}
                                    </li>
                                    <li>3. {t('controlPanel.step3')}</li>
                                </ol>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
                            {history.map((item, index) => (
                                <TranscriptionItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    total={history.length}
                                    onCopy={copyToClipboard}
                                    onDelete={deleteTranscription}
                                // Ensure TranscriptionItem supports dark mode classes internally
                                // or is transparent
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
