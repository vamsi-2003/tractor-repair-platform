import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface AlertPayload {
  phone: string;
  message: string;
  type: 'job_assigned' | 'mechanic_arrived' | 'quote_ready' | 'job_completed' | 'otp' | 'system';
  channel?: 'sms' | 'whatsapp' | 'both';
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatches an SMS & WhatsApp notification via the Supabase Edge Function `send-sms-alert`.
 * Automatically triggers an instant local heads-up push alert as well so the device rings immediately.
 */
export async function sendAlert(payload: AlertPayload): Promise<{ success: boolean; simulated?: boolean }> {
  try {
    // 1. Invoke Edge Function
    const { data, error } = await supabase.functions.invoke('send-sms-alert', {
      body: payload,
    });

    if (error) {
      console.warn('send-sms-alert function notice:', error.message);
    }

    // 2. Also trigger instant local notification so the user hears/sees it immediately on device
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: getTitleForType(payload.type),
          body: payload.message,
          sound: 'default',
          data: payload.metadata || {},
        },
        trigger: null, // deliver immediately
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      simulated: data?.simulated ?? true,
    };
  } catch (err: any) {
    console.warn('sendAlert notice:', err);
    return { success: false };
  }
}

export async function notifyMechanicAssigned(params: {
  customerPhone: string;
  mechanicName: string;
  mechanicPhone: string;
  startCode: string;
  tractorModel?: string;
  etaMinutes?: number;
  userId?: string;
}) {
  const modelStr = params.tractorModel ? ` (${params.tractorModel})` : '';
  const etaStr = params.etaMinutes ? ` ETA: ~${params.etaMinutes} mins.` : '';
  const message = `Tractor Seva: Mechanic ${params.mechanicName} (${params.mechanicPhone}) is assigned to your tractor${modelStr}.${etaStr} Share Start Code: ${params.startCode} when mechanic arrives.`;

  return sendAlert({
    phone: params.customerPhone,
    message,
    type: 'job_assigned',
    channel: 'both',
    userId: params.userId,
    metadata: { startCode: params.startCode, mechanicPhone: params.mechanicPhone },
  });
}

export async function notifyMechanicArrived(params: {
  customerPhone: string;
  mechanicName: string;
  userId?: string;
}) {
  const message = `Tractor Seva: Mechanic ${params.mechanicName} has arrived at your farm and started tractor inspection.`;

  return sendAlert({
    phone: params.customerPhone,
    message,
    type: 'mechanic_arrived',
    channel: 'sms',
    userId: params.userId,
  });
}

export async function notifyQuoteReady(params: {
  customerPhone: string;
  totalAmount: number;
  mechanicName: string;
  userId?: string;
}) {
  const message = `Tractor Seva: Mechanic ${params.mechanicName} submitted a repair estimate of ₹${params.totalAmount.toFixed(0)}. Open the app to approve or call the mechanic.`;

  return sendAlert({
    phone: params.customerPhone,
    message,
    type: 'quote_ready',
    channel: 'both',
    userId: params.userId,
    metadata: { totalAmount: params.totalAmount },
  });
}

export async function notifyJobCompleted(params: {
  customerPhone: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'online';
  userId?: string;
}) {
  const methodStr = params.paymentMethod === 'online' ? 'paid online via UPI' : 'paid in cash';
  const message = `Tractor Seva: Tractor repair completed successfully! Total ₹${params.totalAmount.toFixed(0)} (${methodStr}). Thank you for choosing Tractor Seva!`;

  return sendAlert({
    phone: params.customerPhone,
    message,
    type: 'job_completed',
    channel: 'both',
    userId: params.userId,
    metadata: { totalAmount: params.totalAmount, paymentMethod: params.paymentMethod },
  });
}

function getTitleForType(type: string): string {
  switch (type) {
    case 'job_assigned':
      return 'Mechanic Assigned';
    case 'mechanic_arrived':
      return 'Mechanic Arrived';
    case 'quote_ready':
      return 'Repair Estimate Ready';
    case 'job_completed':
      return 'Repair Completed';
    default:
      return 'Tractor Seva';
  }
}
