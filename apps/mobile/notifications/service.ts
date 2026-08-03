/**
 * Push Notification Service — wraps expo-notifications with graceful fallback.
 */
import { Platform } from 'react-native';

export type NotificationType =
  | 'workflow_complete' | 'task_assigned' | 'checkpoint_created'
  | 'agent_failed' | 'security_alert' | 'billing_alert' | 'provider_alert'
  | 'message' | 'error';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  timestamp: Date;
}

export class NotificationService {
  private listeners: ((notification: PushNotification) => void)[] = [];
  private expoNotifications: any = null;

  async initialize(): Promise<boolean> {
    try {
      this.expoNotifications = require('expo-notifications');
      this.expoNotifications.setNotificationHandler?.({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      const { status } = await this.expoNotifications.requestPermissionsAsync?.() ?? { status: 'denied' };
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async registerDevice(userId: string): Promise<string | null> {
    try {
      if (!this.expoNotifications) return null;
      const token = await this.expoNotifications.getExpoPushTokenAsync?.();
      return token?.data ?? `device-${userId}-${Date.now()}`;
    } catch {
      return null;
    }
  }

  async local(notification: Omit<PushNotification, 'read' | 'timestamp' | 'id'>): Promise<void> {
    try {
      const n: PushNotification = { ...notification, id: `${Date.now()}`, read: false, timestamp: new Date() };
      this.handleNotification(n);
      if (this.expoNotifications) {
        await this.expoNotifications.scheduleNotificationAsync?.({
          content: { title: n.title, body: n.body, data: n.data ?? {} },
          trigger: null,
        });
      }
    } catch {}
  }

  onNotification(callback: (notification: PushNotification) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  handleNotification(notification: PushNotification): void {
    for (const listener of this.listeners) {
      try { listener(notification); } catch {}
    }
  }

  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      workflow_complete: '✅',
      task_assigned: '📋',
      checkpoint_created: '💾',
      agent_failed: '❌',
      security_alert: '🔒',
      billing_alert: '💳',
      provider_alert: '☁️',
      message: '💬',
      error: '⚠️',
    };
    return icons[type] ?? '🔔';
  }
}

export const notificationService = new NotificationService();
