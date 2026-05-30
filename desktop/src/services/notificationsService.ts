import { api } from "@/lib/api";

export interface AppNotification {
  _id: string;
  userId: string;
  type: string;
  text: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const data = await api.get<{ results: AppNotification[] }>("/api/auth/notifications");
  return data.results;
}

export async function markNotificationsRead(): Promise<void> {
  await api.patch("/api/auth/notifications/mark-read", {});
}
