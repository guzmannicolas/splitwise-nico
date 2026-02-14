import { supabase } from '../supabaseClient';

/**
 * Servicio para enviar notificaciones push a través de Edge Function
 * Responsabilidad única: Comunicación con send-push-notification
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
   * Envía notificación push a través de Edge Function
   * @param options - Configuración de la notificación
   * @returns Promise con resultado del envío
   */
  static async sendPushNotification(
    options: SendNotificationOptions
  ): Promise<{ success: boolean; error?: string; sent?: number }> {
    try {
      const { groupId, targetUserId, payload } = options;

      // Validar que al menos uno de los targets esté presente
      if (!groupId && !targetUserId) {
        throw new Error('Debe especificar groupId o targetUserId');
      }

      // Llamar a la Edge Function
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          ...payload,
          groupId,
          targetUserId,
        },
      });

      if (error) {
        console.error('Error enviando notificación:', error);
        return {
          success: false,
          error: error.message || 'Error al enviar notificación',
        };
      }

      return {
        success: true,
        sent: data?.sent || 0,
      };
    } catch (err) {
      console.error('Error en sendPushNotification:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  }

  /**
   * Envía notificación cuando se crea un nuevo gasto
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
        title: '💸 Nuevo gasto registrado',
        body: `${paidByName} agregó "${expenseDescription}" ($${amount.toFixed(2)})`,
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
   * Envía notificación cuando se registra una liquidación
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
        title: '✅ Liquidación registrada',
        body: `${fromUserName} pagó $${amount.toFixed(2)} a ${toUserName}`,
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
   * Envía notificación cuando alguien es invitado a un grupo
   */
  static async notifyInvitation(
    targetUserId: string,
    groupName: string,
    invitedByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      targetUserId,
      payload: {
        title: '🎉 Nueva invitación',
        body: `${invitedByName} te invitó a unirte a "${groupName}"`,
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
   * Envía notificación cuando se modifica un gasto
   */
  static async notifyExpenseUpdated(
    groupId: string,
    expenseDescription: string,
    updatedByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      groupId,
      payload: {
        title: '📝 Gasto modificado',
        body: `${updatedByName} actualizó "${expenseDescription}"`,
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
   * Envía notificación cuando se elimina un gasto
   */
  static async notifyExpenseDeleted(
    groupId: string,
    expenseDescription: string,
    deletedByName: string
  ): Promise<void> {
    await this.sendPushNotification({
      groupId,
      payload: {
        title: '🗑️ Gasto eliminado',
        body: `${deletedByName} eliminó "${expenseDescription}"`,
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
