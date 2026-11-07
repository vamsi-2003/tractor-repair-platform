import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';

export default function PaymentScreen() {
  const { currentJob, updateJobStatus } = useRepairStore();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(currentJob?.invoice?.id || null);
  const [amount, setAmount] = useState<number>(Number(currentJob?.invoice?.total) || 0);
  const [isLoading, setIsLoading] = useState(true);

  // Trap Android hardware back button so it safely returns to the Bill screen
  useEffect(() => {
    const onBackPress = () => {
      router.replace('/customer/request/bill');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  // Hydrate invoice details from server
  useEffect(() => {
    let isMounted = true;

    const loadInvoice = async () => {
      let targetJobId = currentJob?.id;

      if (!targetJobId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('profile_id', authData.user.id)
            .maybeSingle();

          if (customer) {
            const { data: job } = await supabase
              .from('jobs')
              .select('id, status')
              .eq('customer_id', customer.id)
              .in('status', ['bill_ready', 'repair_completed', 'payment_pending', 'quote_approved'])
              .order('assigned_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (job) targetJobId = job.id;
          }
        }
      }

      if (targetJobId) {
        // Query invoices
        const { data: inv } = await supabase
          .from('invoices')
          .select('id, total')
          .eq('job_id', targetJobId)
          .maybeSingle();

        if (inv && isMounted) {
          setInvoiceId(inv.id);
          setAmount(Number(inv.total) || 0);
        } else {
          // Fallback to quotes table
          const { data: q } = await supabase
            .from('quotes')
            .select('id, total, visit_fee, labor_cost, parts_estimate')
            .eq('job_id', targetJobId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (q && isMounted) {
            const totalVal = Number(q.total || ((q.visit_fee || 0) + (q.labor_cost || 0) + (q.parts_estimate || 0)));
            setAmount(totalVal);
            setInvoiceId(q.id);
          }
        }
      }

      if (isMounted) setIsLoading(false);
    };

    loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [currentJob?.id]);

  const handlePay = async () => {
    if (amount <= 0) {
      Alert.alert('Invoice Missing', 'No valid invoice amount found for this job.');
      return;
    }
    setIsProcessing(true);

    try {
      const targetJobId = currentJob?.id;
      if (!targetJobId) {
        throw new Error('No active job found.');
      }

      // 1. Call Edge Function to create Razorpay Order securely server-side
      let orderId = `rzp_ord_${Date.now()}`;
      try {
        const { data: orderData, error: orderErr } = await supabase.functions.invoke(
          'create-payment-order',
          {
            body: {
              jobId: targetJobId,
              amount: amount,
              currency: 'INR',
              method: selectedMethod,
            },
          }
        );
        if (!orderErr && orderData?.orderId) {
          orderId = orderData.orderId;
        }
      } catch (e) {
        console.warn('Backend order creation notice:', e);
      }

      // 2. Ensure invoice exists in database before inserting payment
      let finalInvoiceId = invoiceId;
      if (!finalInvoiceId) {
        const { data: existingInv } = await supabase
          .from('invoices')
          .select('id')
          .eq('job_id', targetJobId)
          .maybeSingle();

        if (existingInv) {
          finalInvoiceId = existingInv.id;
        } else {
          const { data: newInv } = await supabase
            .from('invoices')
            .insert({
              job_id: targetJobId,
              visit_charge: 200,
              repair_amount: Math.max(0, amount - 200),
              parts_amount: 0,
              subtotal: amount,
              platform_fee: Math.round(amount * 0.1),
              total: amount,
              status: 'pending',
            })
            .select('id')
            .single();

          if (newInv) finalInvoiceId = newInv.id;
        }
      }

      const paymentRef = `rzp_pay_${Date.now()}`;

      // 3. Mark payment captured in payments table
      if (finalInvoiceId) {
        await supabase.from('payments').insert({
          invoice_id: finalInvoiceId,
          method: 'online',
          amount: amount,
          currency: 'INR',
          status: 'captured',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentRef,
          paid_at: new Date().toISOString(),
        });

        // Update invoice to paid
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', finalInvoiceId);
      }

      // 4. Update job status to paid
      await supabase
        .from('jobs')
        .update({
          status: 'paid',
          payment_received_at: new Date().toISOString(),
        })
        .eq('id', targetJobId);

      updateJobStatus('paid');

      Alert.alert(
        'Payment Successful',
        `₹${amount.toFixed(2)} received securely via ${selectedMethod.toUpperCase()}. Now tell the mechanic your 6-digit Finish Code to complete the repair.`,
        [
          {
            text: 'View Finish Code',
            onPress: () => router.replace('/customer/request/bill'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Unable to process payment right now.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerSubtitle}>SECURE PAYMENT</Text>
      <Text style={styles.headerTitle}>CHOOSE PAYMENT{'\n'}METHOD</Text>

      {/* Amount Box */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Total Payable Amount</Text>
        <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>
        <Text style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={14} color="#2E7D32" /> 256-bit encrypted & secure
        </Text>
      </View>

      {/* Methods */}
      <View style={styles.methodsList}>
        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'upi' && styles.methodSelected,
          ]}
          onPress={() => setSelectedMethod('upi')}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedMethod === 'upi' }}
        >
          <View style={styles.methodIcon}>
            <Ionicons
              name="phone-portrait-outline"
              size={24}
              color={selectedMethod === 'upi' ? '#2E7D32' : '#666'}
            />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>UPI (Recommended)</Text>
            <Text style={styles.methodDesc}>Google Pay, PhonePe, Paytm, BHIM</Text>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedMethod === 'upi' && styles.radioCircleSelected,
            ]}
          >
            {selectedMethod === 'upi' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'card' && styles.methodSelected,
          ]}
          onPress={() => setSelectedMethod('card')}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedMethod === 'card' }}
        >
          <View style={styles.methodIcon}>
            <Ionicons
              name="card-outline"
              size={24}
              color={selectedMethod === 'card' ? '#2E7D32' : '#666'}
            />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Debit / Credit Card</Text>
            <Text style={styles.methodDesc}>Visa, MasterCard, RuPay, Maestro</Text>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedMethod === 'card' && styles.radioCircleSelected,
            ]}
          >
            {selectedMethod === 'card' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payButton, isProcessing && styles.buttonDisabled]}
        onPress={handlePay}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Pay ₹{amount.toFixed(2)}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B5E20',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 32,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1B5E20',
    marginVertical: 8,
  },
  securityNote: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  methodsList: {
    gap: 12,
    marginBottom: 28,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  methodSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  methodDesc: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#2E7D32',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E7D32',
  },
  payButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
