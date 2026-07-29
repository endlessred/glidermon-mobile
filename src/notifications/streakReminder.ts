// notifications/streakReminder.ts
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const REMINDER_ID = "streak-reminder";
const CHANNEL_ID = "streak-reminders";

let handlerConfigured = false;

/** Call once at app boot. Idempotent. */
export function configureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Streak reminders",
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

/** Requests OS notification permission. Returns whether it was granted. */
export async function requestPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const result = await Notifications.requestPermissionsAsync();
    return !!result.granted;
  } catch {
    return false;
  }
}

/**
 * (Re)schedules today's streak reminder for the given local hour (0-23).
 * Cancels any previously scheduled reminder first. No-ops if that hour has
 * already passed today.
 */
export async function scheduleReminderForToday(hour: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);

    const fireDate = new Date();
    fireDate.setHours(hour, 0, 0, 0);
    if (fireDate.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "Don't lose your streak! 🔥",
        body: "GliderMon is waiting on today's check-in to keep your streak alive.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
      },
    });
  } catch {
    // Best-effort — a failed schedule just means no reminder fires today.
  }
}

export async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // no-op
  }
}
