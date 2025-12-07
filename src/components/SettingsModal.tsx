import React from "react";
import { Settings, Mic, Brain, User, Sparkles, FileText } from "lucide-react";
import SidebarModal, { SidebarItem } from "./ui/SidebarModal";
import SettingsPage, { SettingsSectionType } from "./SettingsPage";
import { useTranslation } from "react-i18next";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({
  open,
  onOpenChange,
}: SettingsModalProps) {
  const { t } = useTranslation();

  const sidebarItems: SidebarItem<SettingsSectionType>[] = [
    { id: "general", label: t('settings.general.menu.general'), icon: Settings },
    { id: "transcription", label: t('settings.general.menu.transcription'), icon: Mic },
    { id: "aiModels", label: t('settings.general.menu.aiModels'), icon: Brain },
    { id: "agentConfig", label: t('settings.general.menu.agentConfig'), icon: User },
    { id: "prompts", label: t('settings.general.menu.prompts'), icon: Sparkles },
    { id: "recent", label: t('controlPanel.recentTranscriptions', 'Recent Transcriptions'), icon: FileText as any },
  ];

  const [activeSection, setActiveSection] =
    React.useState<SettingsSectionType>("general");

  return (
    <SidebarModal<SettingsSectionType>
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.general.mainTitle')}
      sidebarItems={sidebarItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      <SettingsPage activeSection={activeSection} />
    </SidebarModal>
  );
}
