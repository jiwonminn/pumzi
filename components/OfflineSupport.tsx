"use client";

import { useEffect } from "react";

// Registers the service worker in public/sw.js, which keeps a copy of the app on the device.
// Off in development, where a saved copy would hide code changes.
export function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.active?.postMessage("refresh"))
      .catch(() => {
        // No service worker (private window, older browser): the app still works online.
      });
  }, []);

  return null;
}
