import { supabase } from '../supabaseClient';

/**
 * Service for sending push notifications via Edge Function
 * Single responsibility: communication with send-push-notification
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface SendNotificationOptions {
  groupId?: string;
  targetUserId?: string;
  payload: NotificationPayload;
}

export class NotificationService {
  /**
   * Sends a push notification via Edge Function
   * @param options - Notification configuration
   * @returns Promise with the send result
   */
  static async sendPushNotification(
    options: SendNotificationOptions
  ): Promise<{ success: boolean; error?: string; sent?: number }> {
    try {
      const { groupId, targetUserId, payload } = options;

      // At least one target must be provided
      if (!groupId && !targetUserId) {
        throw new Error('Must specify groupId or targetUserId');
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          ...payload,
          groupId,
          targetUserId,
        },
      });

      if (error) {
        console.error('Error sending notification:', error);
        return {
          success: false,
          error: error.message || 'Failed to send notification',
        };
      }

      return {
        success: true,
        sent: data?.sent || 0,
      };
    } catch (err) {
      console.error('Error in sendPushNotification:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends a notification when a new expense is created
   */
  static async notifyNewExpense(
    groupId: string,
    expenseDescription: string,
    amount: number,
    paidByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      groupId,
      payload: {
        title: '💸 New expense recorded',
        body: `${paidByName} added "${expenseDescription}" ($${amount.toFixed(2)})`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `expense-${groupId}`,
        data: {
          type: 'new_expense',
          groupId,
        },
      },
    });
  }

  /**
   * Sends a notification when a settlement is recorded
   */
  static async notifySettlement(
    groupId: string,
    fromUserName: string,
    toUserName: string,
    amount: number
  ): Promise<void> {
    await this.sendPushNotification({
      groupId,
      payload: {
        title: '✅ Settlement recorded',
        body: `${fromUserName} paid $${amount.toFixed(2)} to ${toUserName}`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `settlement-${groupId}`,
        data: {
          type: 'settlement',
          groupId,
        },
      },
    });
  }

  /**
   * Sends a notification when someone is invited to a group
   */
  static async notifyInvitation(
    targetUserId: string,
    groupName: string,
    invitedByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      targetUserId,
      payload: {
        title: '🎉 New invitation',
        body: `${invitedByName} invited you to join "${groupName}"`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'invitation',
        data: {
          type: 'invitation',
        },
      },
    });
  }

  /**
   * Sends a notification when an expense is updated
   */
  static async notifyExpenseUpdated(
    groupId: string,
    expenseDescription: string,
    updatedByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      groupId,
      payload: {
        title: '📝 Expense updated',
        body: `${updatedByName} updated "${expenseDescription}"`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `expense-update-${groupId}`,
        data: {
          type: 'expense_updated',
          groupId,
        },
      },
    });
  }

  /**
   * Sends a notification when an expense is deleted
   */
  static async notifyExpenseDeleted(
    groupId: string,
    expenseDescription: string,
    deletedByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      groupId,
      payload: {
        title: '🗑️ Expense deleted',
        body: `${deletedByName} deleted "${expenseDescription}"`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `expense-delete-${groupId}`,
        data: {
          type: 'expense_deleted',
          groupId,
        },
      },
    });
  }
}
