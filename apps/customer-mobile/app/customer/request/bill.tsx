import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { APP_NAME } from '@tractor-repair/shared';

// Feature flag for Online Payment (Razorpay test mode)
const FEATURE_FLAG_ONLINE_PAYMENT = false;

export default function BillScreen() {
  const { currentJob, setFinishCode, updateJobStatus } = useRepairStore();
  const [invoice, setInvoice] = useState<{
    id: string;
    visitCharge: number;
    repairAmount: number;
    partsAmount: number;
    total: number;
  } | null>(null);
  const [finishCode, setCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-hydrate job and invoice if refreshed
  useEffect(() => {
    let isMounted = true;

    const fetchBillAndCode = async () => {
      let targetJobId = currentJob?.id;

      if (!targetJobId) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', authData.user.id)
          .maybeSingle();
        if (!customer) return;

        const { data: job } = await supabase
          .from('jobs')
          .select('id, request_id, status')
          .eq('customer_id', customer.id)
          .in('status', ['bill_ready', 'repair_completed', 'work_completed', 'payment_pending', 'completed'])
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (job) {
          targetJobId = job.id;
        }
      }

      if (!targetJobId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch invoice
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('job_id', targetJobId)
          .maybeSingle();

        if (invData && isMounted) {
          setInvoice({
            id: invData.id,
            visitCharge: Number(invData.visit_charge),
            repairAmount: Number(invData.repair_amount),
            partsAmount: Number(invData.parts_amount),
            total: Number(invData.total),
          });
        } else {
          // Fallback to quotes row so ₹2,700 bill displays before invoice creation
          const { data: quoteData } = await supabase
            .from('quotes')
            .select('*')
            .eq('job_id', targetJobId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (quoteData && isMounted) {
            const vFee = Number(quoteData.visit_fee || 200);
            const lCost = Number(quoteData.labor_cost || 0);
            const pCost = Number(quoteData.parts_estimate || 0);
            const tot = Number(quoteData.total || (vFee + lCost + pCost));
            setInvoice({
              id: quoteData.id,
              visitCharge: vFee,
              repairAmount: lCost,
              partsAmount: pCost,
              total: tot,
            });
          }
        }

        // Fetch secure finish code
        const { data: codeData } = await supabase
          .from('secure_codes')
          .select('code')
          .eq('job_id', targetJobId)
          .eq('code_type', 'finish')
          .maybeSingle();

        if (codeData?.code && isMounted) {
          setCode(codeData.code);
          setFinishCode(codeData.code);
        } else {
          // Call atomic RPC get_or_create_finish_code
          try {
            const { data: rpcResp } = await supabase.rpc('get_or_create_finish_code', {
              p_job_id: targetJobId,
            });
            if (rpcResp?.code && isMounted) {
              setCode(rpcResp.code);
              setFinishCode(rpcResp.code);
            }
          } catch (e) {
            console.warn('Finish code RPC notice:', e);
          }
        }
      } catch (err: any) {
        console.warn('Error fetching bill/code:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBillAndCode();

    // Listen / poll for job completion (when finish code is verified by mechanic)
    const interval = setInterval(async () => {
      const jobId = currentJob?.id;
      if (!jobId) return;

      const { data: j } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', jobId)
        .maybeSingle();

      if (j?.status === 'completed' || j?.status === 'paid') {
        updateJobStatus('completed');
        router.replace('/customer/request/rating');
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentJob?.id]);

  const handlePayOnline = () => {
    if (!FEATURE_FLAG_ONLINE_PAYMENT) {
      Alert.alert(
        'Online Payment (Coming Soon)',
        'Online UPI / card payment is currently in testing mode. Please choose "Pay cash to mechanic".'
      );
      return;
    }
    router.push('/customer/request/payment');
  };

  const handlePayCash = async () => {
    const totalDue = invoice?.total ?? 0;
    Alert.alert(
      'Pay Cash to Mechanic',
      `Please hand over ₹${totalDue.toFixed(2)} in cash to the mechanic. After paying, tell the mechanic the 6-digit Finish Code shown on this screen to close the job.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Understood',
          onPress: async () => {
            if (currentJob?.id && invoice?.id) {
              // Record cash payment intent in payments table
              await supabase.from('payments').insert({
                invoice_id: invoice.id,
                method: 'cash',
                amount: totalDue,
                status: 'pending',
              });

              await supabase
                .from('jobs')
                .update({ status: 'payment_pending' })
                .eq('id', currentJob.id);

              updateJobStatus('payment_pending');
            }
          },
        },
      ]
    );
  };

  const handleReportProblem = () => {
    router.push('/customer/dispute/new');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C63C14" />
        <Text style={styles.loadingText}>Generating itemized bill from server...</Text>
      </View>
    );
  }

  const visitCharge = invoice?.visitCharge ?? 200;
  const repairAmount = invoice?.repairAmount ?? 0;
  const partsAmount = invoice?.partsAmount ?? 0;
  const total = invoice?.total ?? (visitCharge + repairAmount + partsAmount);

  const speechText = `Your repair is done. Here is your bill: Visit charge: ₹${visitCharge}. Repair: ₹${repairAmount}. Spare parts: ₹${partsAmount}. Total: ₹${total}. Your finish code is ${finishCode || 'available'}. Share this finish code only after handing cash to the mechanic.`;

  return (
    <View style={styles.screenWrapper}>
      {/* Top Header Bar with Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
        <SpeechSpeaker text={speechText} label="Read screen" />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerSubtitle}>REPAIR DONE</Text>
        <Text style={styles.headerTitle}>YOUR FINAL BILL</Text>

        {/* Itemized Bill Card (Page 7 of Prototype) */}
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Visit charge</Text>
            <Text style={styles.billValue}>₹{visitCharge.toFixed(2)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Repair (quote you approved)</Text>
            <Text style={styles.billValue}>₹{repairAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Spare parts used</Text>
            <Text style={styles.billValue}>₹{partsAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Finish Code Card (Green Card from Design Page 7) */}
        <View style={styles.finishCodeCard}>
          <Text style={styles.finishCodeLabel}>FINISH CODE</Text>
          <View style={styles.finishCodeBox}>
            <Text style={styles.finishCodeText}>{finishCode || '------'}</Text>
          </View>
          <Text style={styles.finishCodeInstruction}>
            Tell the mechanic this finish code only after you have paid.
          </Text>
        </View>

        {/* Payment Options */}
        <Text style={styles.sectionTitle}>How would you like to pay?</Text>

        {/* Pay Cash to Mechanic Option */}
        <TouchableOpacity
          style={styles.paymentOptionCard}
          onPress={handlePayCash}
          accessibilityRole="button"
          accessibilityLabel="Pay cash to mechanic"
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons name="cash" size={24} color="#C63C14" />
          </View>
          <View style={styles.paymentTextContainer}>
            <Text style={styles.paymentTitle}>Pay cash to mechanic</Text>
            <Text style={styles.paymentSubtitle}>Hand over ₹{total.toFixed(2)} directly in cash</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C63C14" />
        </TouchableOpacity>

        {/* Pay Online Option (with feature flag badge) */}
        <TouchableOpacity
          style={styles.paymentOptionCard}
          onPress={handlePayOnline}
          accessibilityRole="button"
          accessibilityLabel="Pay online via UPI or card"
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons name="card" size={24} color="#C63C14" />
          </View>
          <View style={styles.paymentTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.paymentTitle}>Pay online</Text>
              {!FEATURE_FLAG_ONLINE_PAYMENT && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>COMING SOON</Text>
                </View>
              )}
            </View>
            <Text style={styles.paymentSubtitle}>UPI (Google Pay, PhonePe, Paytm) or card</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Support / Dispute Link */}
        <TouchableOpacity style={styles.disputeButton} onPress={handleReportProblem}>
          <Ionicons name="help-circle-outline" size={18} color="#666" />
          <Text style={styles.disputeText}>Problem with this bill? Contact support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6DF',
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C63C14',
    letterSpacing: 1.5,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C63C14',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1816',
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  billLabel: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1816',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1816',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#C63C14',
  },
  finishCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2E7D32', // Green card from prototype Page 7
  },
  finishCodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 1.5,
  },
  finishCodeBox: {
    backgroundColor: '#F1F8E9',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#AED581',
    marginVertical: 8,
  },
  finishCodeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1B5E20',
    letterSpacing: 6,
  },
  finishCodeInstruction: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1816',
    marginBottom: 12,
  },
  paymentOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E8E6DF',
    gap: 12,
  },
  paymentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1816',
  },
  paymentSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#777',
  },
  disputeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
    paddingVertical: 10,
  },
  disputeText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
  },
});
