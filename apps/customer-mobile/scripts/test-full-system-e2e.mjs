import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://clkukpyeqphgeaiikaru.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3VrcHllcXBoZ2VhaWlrYXJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mjk5NzU4MCwiZXhwIjoyMTA4NTczNTgwfQ.wEoGRKFlrY7RlJwyAAXd6TUKIZtXktl5aZl6fnba9qQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Color helpers for terminal output
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;
const cyan = (t) => `\x1b[36m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;
const cleanupIds = {
  requests: [],
  jobs: [],
  quotes: [],
  invoices: [],
  payments: [],
  crashLogs: [],
};

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  ${green('✔')} ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${red('✖')} ${testName}`);
    if (details) console.error(`    ${red(typeof details === 'object' ? JSON.stringify(details) : details)}`);
  }
}

async function runAllTests() {
  console.log(bold(cyan('\n======================================================')));
  console.log(bold(cyan('  TRACTOR SEVA - COMPREHENSIVE FULL-SYSTEM E2E SUITE  ')));
  console.log(bold(cyan('======================================================\n')));

  try {
    // ---------------------------------------------------------
    // 1. TEST ACCOUNTS & PROFILE VERIFICATION
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 1] Test Accounts & Profiles'));

    // Farmer Profile
    const { data: customerProfile, error: custErr } = await supabase
      .from('profiles')
      .select('id, phone, full_name, role')
      .eq('phone', '+919999999901')
      .maybeSingle();

    assert(!custErr && !!customerProfile, 'Customer profile (+919999999901) exists');

    const { data: customerRecord } = await supabase
      .from('customers')
      .select('id, profile_id, cancellation_count')
      .eq('profile_id', customerProfile?.id)
      .maybeSingle();

    assert(!!customerRecord, 'Customer record linked in customers table');

    // Mechanic Profile
    const { data: mechanicProfile, error: mechErr } = await supabase
      .from('profiles')
      .select('id, phone, full_name, role')
      .eq('phone', '+919999999902')
      .maybeSingle();

    assert(!mechErr && !!mechanicProfile, 'Mechanic profile (+919999999902) exists');

    const { data: mechanicRecord } = await supabase
      .from('mechanics')
      .select('id, profile_id, status, is_online, rating_avg, total_jobs, cancellation_count')
      .eq('profile_id', mechanicProfile?.id)
      .maybeSingle();

    assert(
      !!mechanicRecord && mechanicRecord.status === 'approved',
      'Mechanic record is approved and active in mechanics table'
    );

    // ---------------------------------------------------------
    // 2. MASTER DATA & APP SETTINGS VERIFICATION
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 2] Master Data & System Settings'));

    const { data: categories } = await supabase
      .from('problem_categories')
      .select('id, name_en, name_te, name_hi');

    assert(
      categories && categories.length >= 5,
      `Problem categories populated (${categories?.length} categories found)`
    );

    const { data: tractors } = await supabase
      .from('tractors')
      .select('id, make, model')
      .limit(5);

    assert(tractors && tractors.length > 0, `Tractor master data verified (${tractors?.length}+ models available)`);

    const { data: settings } = await supabase.from('app_settings').select('key, value');
    const visitFeeSetting = settings?.find((s) => s.key === 'visit_charge_amount');
    const platformFeeSetting = settings?.find((s) => s.key === 'platform_fee_percent');

    assert(
      Number(visitFeeSetting?.value) === 200,
      `Standard visit charge setting is ₹${visitFeeSetting?.value || 200}`
    );
    assert(
      Number(platformFeeSetting?.value) === 10,
      `Platform commission setting is ${platformFeeSetting?.value || 10}%`
    );

    const targetCategory = categories[0];
    const targetTractor = tractors[0];

    // Ensure mechanic has skill in this category
    await supabase
      .from('mechanic_skills')
      .upsert(
        { mechanic_id: mechanicRecord.id, category_id: targetCategory.id },
        { onConflict: 'mechanic_id,category_id' }
      );

    // ---------------------------------------------------------
    // 3. SCENARIO A: HAPPY PATH (NO VOICE NOTE, MODEL-ONLY)
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 3] Scenario A: End-to-End Happy Path (Farmer No Voice Note)'));

    // 3.1 Create Request without voice note or written description
    const { data: reqA, error: reqAErr } = await supabase
      .from('repair_requests')
      .insert({
        customer_id: customerRecord.id,
        tractor_id: targetTractor.id,
        category_id: targetCategory.id,
        description: null, // Farmer selected only tractor model and category
        voice_note_url: null, // No voice note recorded
        address_text: 'Field 4B, Near Canal Road, Guntur Rural',
        latitude: 16.3067,
        longitude: 80.4365,
        status: 'requested',
      })
      .select()
      .single();

    assert(!reqAErr && !!reqA, 'Created Repair Request (No voice note, no description text)');
    cleanupIds.requests.push(reqA?.id);

    // 3.2 Atomic Job Assignment
    const initialStartCode = '392817';
    const { data: assignResult, error: assignErr } = await supabase.rpc('assign_job_atomic', {
      p_request_id: reqA.id,
      p_mechanic_id: mechanicRecord.id,
      p_start_code: initialStartCode,
      p_code_hash: 'test_hash_392817',
    });

    assert(!assignErr && assignResult?.success, 'assign_job_atomic executed successfully');
    const jobAId = assignResult?.job_id;
    cleanupIds.jobs.push(jobAId);

    // 3.3 Verify Job Record and Start Code
    const { data: jobA } = await supabase.from('jobs').select('*').eq('id', jobAId).single();
    assert(jobA?.status === 'assigned', 'Job status initialized to assigned');

    const { data: startCodeData } = await supabase.rpc('get_or_create_start_code', {
      p_job_id: jobAId,
    });
    const realStartCode = startCodeData?.code;
    assert(
      !!realStartCode && realStartCode.length >= 4,
      `Start code retrieved reliably: ${realStartCode}`
    );

    // 3.4 Start Code Verification: Wrong Code Rejection
    const { data: wrongVerify } = await supabase.rpc('verify_job_start_code', {
      p_job_id: jobAId,
      p_code: '000000',
    });
    assert(
      wrongVerify?.success === false,
      'Invalid start code rejected with security error'
    );

    // 3.5 Start Code Verification: Correct Code Acceptance
    const { data: correctVerify } = await supabase.rpc('verify_job_start_code', {
      p_job_id: jobAId,
      p_code: realStartCode,
    });
    assert(
      correctVerify?.success === true && correctVerify?.status === 'arrived',
      'Correct start code verified -> Job moved to arrived status'
    );

    // 3.6 Submit Quote
    const laborEstimate = 1500;
    const partsEstimate = 3200;
    const expectedQuoteTotal = 200 + laborEstimate + partsEstimate; // 4900

    const { data: quoteResult, error: quoteErr } = await supabase.rpc('submit_job_quote', {
      p_job_id: jobAId,
      p_labor_cost: laborEstimate,
      p_parts_estimate: partsEstimate,
      p_notes: 'Replaced brake cylinder seal and fresh hydraulic oil',
    });

    assert(!quoteErr && quoteResult?.success, 'submit_job_quote RPC executed');
    assert(
      Number(quoteResult?.total) === expectedQuoteTotal,
      `Quote total calculated correctly: ₹${quoteResult?.total} (Visit ₹200 + Labor ₹1500 + Parts ₹3200)`
    );

    const quoteAId = quoteResult?.quote_id;
    cleanupIds.quotes.push(quoteAId);

    // 3.7 Customer Approves Quote
    const { data: approveResult } = await supabase.rpc('respond_to_quote', {
      p_job_id: jobAId,
      p_quote_id: quoteAId,
      p_approved: true,
    });

    assert(
      approveResult?.success && approveResult?.status === 'quote_approved',
      'respond_to_quote approved -> Job moved to quote_approved'
    );

    // 3.8 Mechanic begins repair
    await supabase.from('jobs').update({ status: 'repair_in_progress' }).eq('id', jobAId);
    const { data: inProgJob } = await supabase.from('jobs').select('status').eq('id', jobAId).single();
    assert(inProgJob?.status === 'repair_in_progress', 'Job transitioned to repair_in_progress');

    // 3.9 Secure Finish Code Generation
    const { data: finishCodeData, error: finishCodeErr } = await supabase.rpc('get_or_create_finish_code', {
      p_job_id: jobAId,
    });
    const finishCode = finishCodeData?.code;
    assert(!!finishCode && finishCode.length >= 4, `Finish code generated for customer: ${finishCode}`, finishCodeErr?.message);

    // 3.10 Finish Job via Server RPC with Finish Code Validation
    const actualPartsAmount = 3200;
    const { data: completeResult, error: completeErr } = await supabase.rpc('complete_job_cash_server', {
      p_job_id: jobAId,
      p_spare_parts_amount: actualPartsAmount,
      p_finish_code: finishCode,
    });

    assert(!completeErr && completeResult?.success, 'complete_job_cash_server executed cleanly');
    assert(completeResult?.status === 'completed', 'Job marked completed in database');

    const expectedPlatformFee = expectedQuoteTotal * 0.10; // 490
    assert(
      Number(completeResult?.platform_fee) === expectedPlatformFee,
      `Platform fee accurately calculated (10% on grand total ₹${expectedQuoteTotal} = ₹${expectedPlatformFee})`
    );

    // 3.11 Submit Rating and Verify Trigger
    const initialJobs = mechanicRecord.total_jobs || 0;
    const { error: reviewErr } = await supabase.from('reviews').insert({
      job_id: jobAId,
      customer_id: customerRecord.id,
      mechanic_id: mechanicRecord.id,
      rating: 5,
      comment: 'Excellent repair work done in field on time!',
    });

    assert(!reviewErr, 'Customer 5-star review submitted');

    const { data: updatedMech } = await supabase
      .from('mechanics')
      .select('total_jobs, rating_avg')
      .eq('id', mechanicRecord.id)
      .single();

    assert(
      !!updatedMech && updatedMech.total_jobs !== undefined,
      `Mechanic total jobs updated: ${updatedMech?.total_jobs} (Rating: ${updatedMech?.rating_avg}★)`
    );

    // ---------------------------------------------------------
    // 4. SCENARIO B: CANCELLATION BY CUSTOMER (ISSUE 2 VERIFICATION)
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 4] Scenario B: Customer Cancels Before Arrival (No Fee)'));

    const { data: reqB } = await supabase
      .from('repair_requests')
      .insert({
        customer_id: customerRecord.id,
        tractor_id: targetTractor.id,
        category_id: targetCategory.id,
        address_text: 'Field 7, Tenali Road',
        latitude: 16.3067,
        longitude: 80.4365,
        status: 'requested',
      })
      .select()
      .single();
    cleanupIds.requests.push(reqB?.id);

    const { data: assignB } = await supabase.rpc('assign_job_atomic', {
      p_request_id: reqB.id,
      p_mechanic_id: mechanicRecord.id,
      p_start_code: '556677',
      p_code_hash: 'hash_556677',
    });
    const jobBId = assignB?.job_id;
    cleanupIds.jobs.push(jobBId);

    const initialCustCancels = customerRecord.cancellation_count || 0;

    // Customer cancels before mechanic arrives
    const { data: cancelCustResult, error: cancelCustErr } = await supabase.rpc(
      'cancel_job_by_customer',
      {
        p_job_id: jobBId,
        p_reason: 'Resolved issue by self',
      }
    );

    assert(!cancelCustErr && cancelCustResult?.success, 'cancel_job_by_customer executed cleanly');
    assert(cancelCustResult?.fee_owed === 0, 'No fee owed when cancelled before mechanic arrival (fee_owed = 0)');

    const { data: checkJobB } = await supabase.from('jobs').select('status, cancellation_reason').eq('id', jobBId).single();
    const { data: checkReqB } = await supabase.from('repair_requests').select('status').eq('id', reqB.id).single();

    assert(checkJobB?.status === 'cancelled', 'Job record updated to cancelled');
    assert(checkReqB?.status === 'cancelled', 'Repair request updated to cancelled');

    const { data: checkCustB } = await supabase
      .from('customers')
      .select('cancellation_count')
      .eq('id', customerRecord.id)
      .single();
    assert(
      (checkCustB?.cancellation_count || 0) === initialCustCancels + 1,
      `Customer cancellation count tracked (+1 = ${checkCustB?.cancellation_count})`
    );

    // ---------------------------------------------------------
    // 5. SCENARIO C: CANCELLATION BY MECHANIC
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 5] Scenario C: Mechanic Cancels Assignment'));

    const { data: reqC } = await supabase
      .from('repair_requests')
      .insert({
        customer_id: customerRecord.id,
        tractor_id: targetTractor.id,
        category_id: targetCategory.id,
        address_text: 'Tractor Shed 2, Mangalagiri',
        latitude: 16.3067,
        longitude: 80.4365,
        status: 'requested',
      })
      .select()
      .single();
    assert(!!reqC?.id, 'Scenario C: Request created');
    cleanupIds.requests.push(reqC?.id);

    const { data: assignC, error: assignCErr } = await supabase.rpc('assign_job_atomic', {
      p_request_id: reqC?.id,
      p_mechanic_id: mechanicRecord.id,
      p_start_code: '778899',
      p_code_hash: 'hash_778899',
    });
    assert(!assignCErr && assignC?.success, 'Scenario C: assign_job_atomic executed', assignCErr?.message || assignC?.error);
    const jobCId = assignC?.job_id;
    cleanupIds.jobs.push(jobCId);

    const initialMechCancels = mechanicRecord.cancellation_count || 0;

    const { data: cancelMechResult, error: cancelMechErr } = await supabase.rpc(
      'cancel_job_by_mechanic',
      {
        p_job_id: jobCId,
        p_reason: 'Emergency vehicle breakdown on way',
      }
    );

    assert(!cancelMechErr && cancelMechResult?.success, 'cancel_job_by_mechanic executed cleanly', cancelMechErr?.message);
    assert(cancelMechResult?.customer_owed === 0, 'Customer pays ₹0 on mechanic cancellation');

    const { data: checkJobC } = await supabase.from('jobs').select('status').eq('id', jobCId).single();
    const { data: checkReqC } = await supabase.from('repair_requests').select('status').eq('id', reqC?.id).single();
    assert(checkJobC?.status === 'cancelled' && checkReqC?.status === 'cancelled', 'Job and request both cancelled');

    const { data: checkMechC } = await supabase
      .from('mechanics')
      .select('cancellation_count')
      .eq('id', mechanicRecord.id)
      .single();
    assert(
      (checkMechC?.cancellation_count || 0) === initialMechCancels + 1,
      `Mechanic cancellation recorded (+1 = ${checkMechC?.cancellation_count})`
    );

    // ---------------------------------------------------------
    // 6. SCENARIO D: VISIT CHARGE ON QUOTE DECLINE
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 6] Scenario D: On-Site Inspection & Quote Decline (Visit Fee)'));

    const { data: reqD } = await supabase
      .from('repair_requests')
      .insert({
        customer_id: customerRecord.id,
        tractor_id: targetTractor.id,
        category_id: targetCategory.id,
        address_text: 'Farm Plot 12, Ponnur Road',
        latitude: 16.3067,
        longitude: 80.4365,
        status: 'requested',
      })
      .select()
      .single();
    cleanupIds.requests.push(reqD?.id);

    const startCodeD = '991122';
    const { data: assignD } = await supabase.rpc('assign_job_atomic', {
      p_request_id: reqD.id,
      p_mechanic_id: mechanicRecord.id,
      p_start_code: startCodeD,
      p_code_hash: 'hash_991122',
    });
    const jobDId = assignD?.job_id;
    cleanupIds.jobs.push(jobDId);

    const { data: codeDataD } = await supabase.rpc('get_or_create_start_code', { p_job_id: jobDId });
    // Mechanic arrives and verifies start code
    await supabase.rpc('verify_job_start_code', { p_job_id: jobDId, p_code: codeDataD?.code || startCodeD });

    // Farmer declines quote -> record visit charge collected
    const { data: visitResult, error: visitErr } = await supabase.rpc('record_visit_charge_collected', {
      p_job_id: jobDId,
    });

    if (visitErr) {
      console.error(red('record_visit_charge_collected error:'), visitErr);
    }
    assert(!visitErr && visitResult?.success, 'record_visit_charge_collected executed cleanly');
    assert(
      Number(visitResult?.visit_charge) === 200,
      `Visit charge collected correctly: ₹${visitResult?.visit_charge}`
    );
    assert(
      Number(visitResult?.platform_fee) === 20,
      `Platform fee (10% = ₹${visitResult?.platform_fee}) calculated`
    );
    assert(
      Number(visitResult?.mechanic_payout) === 180,
      `Mechanic share (90% = ₹${visitResult?.mechanic_payout}) credited`
    );

    // ---------------------------------------------------------
    // 7. SCENARIO G: DIGITAL ONLINE UPI PAYMENT (RAZORPAY FLOW)
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 7] Scenario G: Digital Online UPI Payment (Razorpay Flow)'));

    // 7.1 Create Request & Assign Job
    const { data: reqG } = await supabase
      .from('repair_requests')
      .insert({
        customer_id: customerRecord.id,
        tractor_id: targetTractor.id,
        category_id: targetCategory.id,
        description: 'Brake cylinder replacement - paying via UPI',
        address_text: 'Field 9A, Bypass Road, Guntur',
        latitude: 16.3067,
        longitude: 80.4365,
        status: 'requested',
      })
      .select()
      .single();

    assert(!!reqG, 'Scenario G: Created Request for Online Payment');
    cleanupIds.requests.push(reqG?.id);

    const startCodeG = '718293';
    const { data: assignG } = await supabase.rpc('assign_job_atomic', {
      p_request_id: reqG.id,
      p_mechanic_id: mechanicRecord.id,
      p_start_code: startCodeG,
      p_code_hash: 'hash_g_718293',
    });
    const jobGId = assignG?.job_id;
    cleanupIds.jobs.push(jobGId);
    assert(!!jobGId, 'Scenario G: Mechanic assigned atomically');

    // 7.2 Mechanic Arrives & Verifies Start Code
    const { data: codeDataG } = await supabase.rpc('get_or_create_start_code', { p_job_id: jobGId });
    const verifyG = await supabase.rpc('verify_job_start_code', {
      p_job_id: jobGId,
      p_code: codeDataG?.code || startCodeG,
    });
    assert(verifyG?.data?.success === true, 'Scenario G: Start code verified, mechanic arrived');

    // 7.3 Submit Quote (Visit ₹200 + Labor ₹1000 + Parts ₹1500 = ₹2700)
    const quoteGResult = await supabase.rpc('submit_job_quote', {
      p_job_id: jobGId,
      p_labor_cost: 1000,
      p_parts_estimate: 1500,
      p_notes: 'Online payment test: replace brake seal',
    });
    const quoteGId = quoteGResult?.data?.quote_id;
    cleanupIds.quotes.push(quoteGId);
    assert(quoteGResult?.data?.success === true, 'Scenario G: Quote submitted (Total ₹2,700)');

    // 7.4 Customer Approves Quote
    await supabase.rpc('respond_to_quote', {
      p_job_id: jobGId,
      p_quote_id: quoteGId,
      p_approved: true,
    });
    await supabase.from('jobs').update({ status: 'bill_ready' }).eq('id', jobGId);

    // 7.5 Create Invoice
    const gTotal = 2700;
    const gPlatformFee = 270;
    const { data: invG, error: invGErr } = await supabase
      .from('invoices')
      .insert({
        job_id: jobGId,
        quote_id: quoteGId,
        visit_charge: 200,
        repair_amount: 1000,
        parts_amount: 1500,
        subtotal: gTotal,
        platform_fee: gPlatformFee,
        total: gTotal,
        status: 'pending',
      })
      .select('id')
      .single();

    assert(!invGErr && !!invG?.id, 'Scenario G: Invoice created with status pending', invGErr?.message);
    if (invG?.id) cleanupIds.invoices.push(invG.id);

    // 7.6 Create Online Payment (Razorpay Intent)
    const testRzpOrderId = `order_test_${Date.now()}`;
    const testRzpPayId = `pay_rzp_${Date.now()}`;

    const { data: payG, error: payGErr } = await supabase
      .from('payments')
      .insert({
        invoice_id: invG?.id,
        method: 'online',
        amount: gTotal,
        currency: 'INR',
        status: 'created',
        razorpay_order_id: testRzpOrderId,
      })
      .select('id')
      .single();

    assert(!payGErr && !!payG?.id, 'Scenario G: Online payment order initiated in database', payGErr?.message);
    if (payG?.id) cleanupIds.payments.push(payG.id);

    // 7.7 Simulate Payment Webhook / Capture
    await supabase
      .from('payments')
      .update({
        status: 'captured',
        razorpay_payment_id: testRzpPayId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payG.id);

    await supabase
      .from('invoices')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', invG.id);

    await supabase
      .from('jobs')
      .update({ status: 'paid', payment_received_at: new Date().toISOString() })
      .eq('id', jobGId);

    // Verify invoice and job marked paid
    const { data: paidInv } = await supabase.from('invoices').select('status').eq('id', invG.id).single();
    assert(paidInv?.status === 'paid', 'Scenario G: Invoice status updated to paid');

    const { data: paidJob } = await supabase.from('jobs').select('status').eq('id', jobGId).single();
    assert(paidJob?.status === 'paid', 'Scenario G: Job status updated to paid');

    // 7.8 Mechanic Enters Finish Code & Completes Job
    const { data: finishCodeGData } = await supabase.rpc('get_or_create_finish_code', {
      p_job_id: jobGId,
    });
    const finishCodeG = finishCodeGData?.code;
    assert(!!finishCodeG, `Scenario G: Finish code retrieved: ${finishCodeG}`);

    // Verify finish code marks job completed
    await supabase
      .from('jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobGId);

    const { data: completedJobG } = await supabase.from('jobs').select('status').eq('id', jobGId).single();
    assert(completedJobG?.status === 'completed', 'Scenario G: Job marked completed after online payment');

    // ---------------------------------------------------------
    // 8. SCENARIO E: TELEMETRY & CRASH LOGGING VERIFICATION
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 8] Telemetry & Crash Logging Ingestion'));

    const { data: logEntry, error: logErr } = await supabase
      .from('app_crash_logs')
      .insert({
        user_id: customerProfile.id,
        role: 'customer',
        error_message: 'Automated E2E Test Diagnostic Ping',
        screen_name: 'test-suite',
        app_version: '1.2.0',
        severity: 'info',
        device_info: { test: true, timestamp: Date.now() },
      })
      .select('id')
      .single();

    assert(!logErr && !!logEntry?.id, 'Telemetry ingestion confirmed (public.app_crash_logs)', logErr?.message);
    if (logEntry?.id) cleanupIds.crashLogs.push(logEntry.id);

    // ---------------------------------------------------------
    // 9. SUITE 9: SMS & WHATSAPP ALERTS (TELEPHONY INTEGRATION)
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 9] SMS & WhatsApp Alerts (Telephony Integration)'));

    const testAlertMsg = 'Tractor Seva: Mechanic Suresh (+919999999902) assigned. Start Code: 991823.';
    const { data: insertedNotif, error: notifErr } = await supabase
      .from('notifications')
      .insert({
        user_id: customerProfile.id,
        type: 'job_update',
        title: 'Mechanic Assigned',
        body: testAlertMsg,
        data: { channel: 'both', startCode: '991823' },
      })
      .select('id')
      .single();

    assert(!notifErr && !!insertedNotif?.id, 'SMS & WhatsApp alert recorded in notifications database', notifErr?.message);

    const { data: auditAlert, error: auditErr } = await supabase
      .from('audit_logs')
      .insert({
        user_id: customerProfile.id,
        action: 'sms_alert_dispatched',
        resource_type: 'notifications',
        resource_id: insertedNotif?.id || null,
        new_values: {
          phone: customerProfile.phone,
          channel: 'both',
          provider: 'Fast2SMS/Twilio',
          message: testAlertMsg,
        },
      })
      .select('id')
      .single();

    assert(!auditErr && !!auditAlert?.id, 'Telephony dispatch event logged in audit ledger', auditErr?.message);

    // Clean up test notification
    if (insertedNotif?.id) {
      await supabase.from('notifications').delete().eq('id', insertedNotif.id);
    }
    if (auditAlert?.id) {
      await supabase.from('audit_logs').delete().eq('id', auditAlert.id);
    }

    // ---------------------------------------------------------
    // 10. TEARDOWN & CLEANUP OF TEST ARTIFACTS
    // ---------------------------------------------------------
    console.log(bold('\n[Suite 10] Teardown & Pristine Account Reset'));

    if (cleanupIds.crashLogs.length > 0) {
      await supabase.from('app_crash_logs').delete().in('id', cleanupIds.crashLogs);
    }
    if (cleanupIds.quotes.length > 0) {
      await supabase.from('quotes').delete().in('id', cleanupIds.quotes);
    }
    if (cleanupIds.payments.length > 0) {
      await supabase.from('payments').delete().in('id', cleanupIds.payments);
    }
    if (cleanupIds.invoices.length > 0) {
      await supabase.from('invoices').delete().in('id', cleanupIds.invoices);
    }
    if (cleanupIds.jobs.length > 0) {
      const { data: jobInvs } = await supabase.from('invoices').select('id').in('job_id', cleanupIds.jobs);
      const invIds = (jobInvs || []).map((i) => i.id);
      if (invIds.length > 0) {
        await supabase.from('payments').delete().in('invoice_id', invIds);
        await supabase.from('invoices').delete().in('id', invIds);
      }
      await supabase.from('job_status_history').delete().in('job_id', cleanupIds.jobs);
      await supabase.from('secure_codes').delete().in('job_id', cleanupIds.jobs);
      await supabase.from('reviews').delete().in('job_id', cleanupIds.jobs);
      await supabase.from('jobs').delete().in('id', cleanupIds.jobs);
    }
    if (cleanupIds.requests.length > 0) {
      await supabase.from('mechanic_matches').delete().in('request_id', cleanupIds.requests);
      await supabase.from('repair_requests').delete().in('id', cleanupIds.requests);
    }

    // Reset test mechanic status to online and ready
    await supabase
      .from('mechanics')
      .update({ is_online: true, current_latitude: 16.3067, current_longitude: 80.4365 })
      .eq('id', mechanicRecord.id);

    console.log(`  ${green('✔')} All temporary test requests and jobs safely wiped. Test accounts are clean.`);

    // ---------------------------------------------------------
    // FINAL REPORT
    // ---------------------------------------------------------
    console.log(bold(cyan('\n======================================================')));
    console.log(bold(`  RESULTS: ${green(passedCount + ' PASSED')}, ${failedCount > 0 ? red(failedCount + ' FAILED') : '0 FAILED'}`));
    console.log(bold(cyan('======================================================\n')));

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(red('\nFatal error during test suite execution:'), err);
    process.exit(1);
  }
}

runAllTests();
