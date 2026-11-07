// Supabase Edge Function: send-sms-alert
// Sends transactional SMS & WhatsApp alerts to farmers & mechanics.
// Providers: Fast2SMS (India domestic SMS) and Twilio (WhatsApp & international).
// Automatically falls back to simulated delivery with audit logging in development/staging.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

interface SendAlertPayload {
  phone: string;
  message: string;
  type?: 'job_assigned' | 'mechanic_arrived' | 'quote_ready' | 'job_completed' | 'otp' | 'system';
  channel?: 'sms' | 'whatsapp' | 'both';
  userId?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const body: SendAlertPayload = await req.json().catch(() => ({}));

    const { phone, message, type = 'system', channel = 'sms', userId, metadata } = body;

    if (!phone || !message) {
      return errorResponse('phone and message are required', 400);
    }

    // Clean phone number: remove spaces, dashes, parentheses
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    const tenDigitPhone = cleanedPhone.replace(/^\+91/, '').replace(/^0/, '');

    const fast2smsApiKey = Deno.env.get('FAST2SMS_API_KEY') || '';
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || '';
    const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';

    const deliveryResults: Record<string, unknown> = {};

    // 1. Fast2SMS Delivery (if SMS channel requested and key provided)
    if ((channel === 'sms' || channel === 'both') && fast2smsApiKey) {
      try {
        const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: message,
            language: 'english',
            flash: 0,
            numbers: tenDigitPhone,
          }),
        });

        const smsData = await smsRes.json().catch(() => ({}));
        deliveryResults.fast2sms = {
          success: smsRes.ok && smsData.return === true,
          response: smsData,
        };
      } catch (err: any) {
        console.error('Fast2SMS request failed:', err);
        deliveryResults.fast2sms = { success: false, error: err.message };
      }
    }

    // 2. Twilio WhatsApp Delivery (if WhatsApp channel requested and Twilio credentials provided)
    if ((channel === 'whatsapp' || channel === 'both') && twilioAccountSid && twilioAuthToken) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const formattedTo = cleanedPhone.startsWith('+') ? cleanedPhone : `+91${tenDigitPhone}`;

        const formData = new URLSearchParams();
        formData.append('From', twilioWhatsappNumber.startsWith('whatsapp:') ? twilioWhatsappNumber : `whatsapp:${twilioWhatsappNumber}`);
        formData.append('To', `whatsapp:${formattedTo}`);
        formData.append('Body', message);

        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const twilioData = await twilioRes.json().catch(() => ({}));
        deliveryResults.twilio_whatsapp = {
          success: twilioRes.ok,
          sid: twilioData.sid || null,
        };
      } catch (err: any) {
        console.error('Twilio WhatsApp request failed:', err);
        deliveryResults.twilio_whatsapp = { success: false, error: err.message };
      }
    }

    // 3. Fallback: If no provider keys configured, use simulated development dispatcher
    const isSimulated = !fast2smsApiKey && !(twilioAccountSid && twilioAuthToken);
    if (isSimulated) {
      deliveryResults.simulated = {
        success: true,
        provider: 'mock_telephony',
        dispatched_to: cleanedPhone,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Record In-App Notification if userId provided or found from phone
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${cleanedPhone},phone.eq.+91${tenDigitPhone}`)
        .maybeSingle();

      if (profile) targetUserId = profile.id;
    }

    if (targetUserId) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'job_update',
        title: getNotificationTitle(type),
        body: message,
        data: {
          channel,
          phone: cleanedPhone,
          ...(metadata || {}),
        },
      });
    }

    // 5. Audit Log for Telemetry & Platform Monitoring
    await supabase.from('audit_logs').insert({
      user_id: targetUserId || null,
      action: 'sms_alert_dispatched',
      resource_type: 'notifications',
      new_values: {
        phone: cleanedPhone,
        type,
        channel,
        isSimulated,
        deliveryResults,
        messageSnippet: message.slice(0, 80),
      },
    });

    return jsonResponse({
      success: true,
      phone: cleanedPhone,
      channel,
      type,
      simulated: isSimulated,
      deliveryResults,
    });
  } catch (err: any) {
    console.error('Unhandled error in send-sms-alert:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'job_assigned':
      return 'Mechanic Assigned to Your Tractor';
    case 'mechanic_arrived':
      return 'Mechanic Has Arrived';
    case 'quote_ready':
      return 'Repair Estimate Ready';
    case 'job_completed':
      return 'Tractor Repair Completed';
    case 'otp':
      return 'Verification Code';
    default:
      return 'Tractor Seva Update';
  }
}
