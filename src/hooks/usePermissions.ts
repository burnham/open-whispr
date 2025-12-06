import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface UsePermissionsReturn {
  // State
  micPermissionGranted: boolean;
  accessibilityPermissionGranted: boolean;

  requestMicPermission: () => Promise<void>;
  testAccessibilityPermission: () => Promise<void>;
  setMicPermissionGranted: (granted: boolean) => void;
  setAccessibilityPermissionGranted: (granted: boolean) => void;
}

export interface UsePermissionsProps {
  showAlertDialog: (dialog: { title: string; description?: string }) => void;
}

export const usePermissions = (
  showAlertDialog?: UsePermissionsProps["showAlertDialog"]
): UsePermissionsReturn => {
  const { t } = useTranslation();
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [accessibilityPermissionGranted, setAccessibilityPermissionGranted] =
    useState(false);

  const requestMicPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
    } catch (err) {
      console.error("Microphone permission denied:", err);
      const title = t('settings.transcription.micAccessNeeded', "Microphone Permission Required");
      const desc = t('settings.transcription.micAccessNeededDesc', "Please grant microphone permissions to use voice dictation.");

      if (showAlertDialog) {
        showAlertDialog({
          title: title,
          description: desc,
        });
      } else {
        alert(desc);
      }
    }
  }, [showAlertDialog, t]);

  const testAccessibilityPermission = useCallback(async () => {
    try {
      await window.electronAPI.pasteText("OpenWhispr accessibility test");
      setAccessibilityPermissionGranted(true);
      const successTitle = t('dialogs.accessibilitySuccess', "✅ Accessibility Test Successful");
      const successDesc = t('dialogs.accessibilitySuccessDesc', "Accessibility permissions working! Check if the test text appeared in another app.");

      if (showAlertDialog) {
        showAlertDialog({
          title: successTitle,
          description: successDesc,
        });
      } else {
        alert(successDesc);
      }
    } catch (err) {
      console.error("Accessibility permission test failed:", err);
      const errorTitle = t('dialogs.accessibilityError', "❌ Accessibility Permissions Needed");
      const errorDesc = t('dialogs.accessibilityErrorDesc', "Please grant accessibility permissions in System Settings to enable automatic text pasting.");

      if (showAlertDialog) {
        showAlertDialog({
          title: errorTitle,
          description: errorDesc,
        });
      } else {
        alert(errorDesc);
      }
    }
  }, [showAlertDialog, t]);

  return {
    micPermissionGranted,
    accessibilityPermissionGranted,
    requestMicPermission,
    testAccessibilityPermission,
    setMicPermissionGranted,
    setAccessibilityPermissionGranted,
  };
};
