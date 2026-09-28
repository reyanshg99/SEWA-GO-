import { Alert, Platform } from "react-native";

type NoticeButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

/** Uses native alerts on iOS/Android and browser dialogs on Expo Web. */
export function showAlert(title: string, message?: string, buttons?: NoticeButton[]) {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    Alert.alert(title, message, buttons);
    return;
  }

  const content = message ? `${title}\n\n${message}` : title;
  if (buttons && buttons.length > 1) {
    if (window.confirm(content)) {
      buttons[buttons.length - 1]?.onPress?.();
    } else {
      buttons.find((button) => button.style === "cancel")?.onPress?.();
    }
    return;
  }

  window.alert(content);
  buttons?.[0]?.onPress?.();
}
