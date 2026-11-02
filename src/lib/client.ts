"use client";

const DEVICE_KEY = "smf-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-device-id": getDeviceId(),
      ...(init?.headers ?? {}),
    },
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function postNotification(input: {
  type: string;
  title: string;
  body: string;
  stationName?: string | null;
  stationId?: string | null;
  dedupeKey?: string | null;
}): Promise<{ created: boolean; duplicate: boolean }> {
  const result = await api<{ created: boolean; duplicate: boolean }>("/api/notifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const registration = (window as Window & { __smfRegistration?: ServiceWorkerRegistration }).__smfRegistration;
    if (registration?.showNotification) {
      void registration.showNotification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
      });
      return;
    }
    new Notification(title, { body, icon: "/favicon.svg" });
  } catch {
    // Browser may block notifications even after permission.
  }
}
