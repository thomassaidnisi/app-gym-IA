import { useEffect } from "react";

let wakeLock: WakeLockSentinel | null = null;

export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    navigator.wakeLock.request("screen").then((lock) => {
      wakeLock = lock;
    }).catch(() => {
      // Wake lock not granted — not critical
    });

    return () => {
      wakeLock?.release().then(() => { wakeLock = null; }).catch(() => {});
    };
  }, []);
}
