/**
 * Push Notification Service
 */

import { Platform } from 'react-native';

export type NotificationType =
  | 'workflow_complete' | 'task_assigned' | 'checkpoint_created'
  | 'agent_failed' | 'security_alert' | 'billing_alert' | 'provider_alert';

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

  async initialize(): Promise<boolean> {
    try {
      // In production: request permissions via expo-notifications
      return true;
    } catch {
      return false;
    }
  }

  async registerDevice(userId: string): Promise<string | null> {
    try {
      // In production: get push token and register with backend
      return `device-${userId}-${Date.now()}`;
    } catch {
      return null;
    }
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
    };
    return icons[type] ?? '🔔';
  }
}

export const notificationService = new NotificationService();
