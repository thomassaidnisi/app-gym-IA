import { useCallback, useState } from "react";
import { useAuth } from "../components/AuthContext";
import { savePushSubscription } from "../lib/db";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : "denied"
  );

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await savePushSubscription(user.id, subscription);
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  }, [isSupported]);

  return { isSupported, permission, subscribe, unsubscribe };
}
