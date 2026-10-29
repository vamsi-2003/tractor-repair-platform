import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { APP_NAME } from '@tractor-repair/shared';

export default function QuoteApprovalScreen() {
  const { currentJob, setCurrentJob, setQuote, updateJobStatus } = useRepairStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trap Android hardware back button so it safely returns to mechanic-assigned
  useEffect(() => {
    const onBackPress = () => {
      router.replace('/customer/request/mechanic-assigned');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  // If quote is already approved or job moved past quote_submitted, exit immediately
  useEffect(() => {
    if (
      currentJob?.quote?.status === 'approved' ||
      currentJob?.status === 'quote_approved' ||
      currentJob?.status === 'repair_in_progress' ||
      currentJob?.status === 'bill_ready' ||
      currentJob?.status === 'completed'
    ) {
      router.replace('/customer/request/mechanic-assigned');
    }
  }, [currentJob?.quote?.status, currentJob?.status]);

  // Realtime subscription: if job advances (e.g. mechanic begins repair), update customer state
  useRealtimeSync({
    jobId: currentJob?.id,
    role: 'customer',
    onJobChange: (updatedJob) => {
      if (
        updatedJob?.status === 'quote_approved' ||
        updatedJob?.status === 'repair_in_progress' ||
        updatedJob?.status === 'bill_ready' ||
        updatedJob?.status === 'completed'
      ) {
        updateJobStatus(updatedJob.status);
        router.replace('/customer/request/mechanic-assigned');
      }
    },
  });

  // Auto-hydrate job and quote if refreshed
  useEffect(() => {
    if (!currentJob?.id || !currentJob?.quote?.id) {
      (async () => {
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
          .select('id, request_id, status, mechanic_id')
          .eq('customer_id', customer.id)
          .in('status', ['assigned', 'quote_submitted', 'quote_approved', 'repair_in_progress'])
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (job) {
          let mechanicName = 'Assigned Mechanic';
          let mechanicPhone = '';
          let mechanicAvatar: string | null = null;
          let rating = 0;
          let totalJobs = 0;
          let workshopAddress = '';

          if (job.mechanic_id) {
            const { data: mech } = await supabase
              .from('mechanics')
              .select('id, profile_id, rating_avg, total_jobs, workshop_address')
              .eq('id', job.mechanic_id)
              .maybeSingle();

            if (mech) {
              rating = Number(mech.rating_avg || 0);
              totalJobs = mech.total_jobs || 0;
              workshopAddress = mech.workshop_address || '';

              const { data: prof } = await supabase
                .from('profiles')
                .select('full_name, phone, avatar_url')
                .eq('id', mech.profile_id)
                .maybeSingle();

              if (prof) {
                mechanicName = prof.full_name || mechanicName;
                mechanicPhone = prof.phone || mechanicPhone;
                mechanicAvatar = prof.avatar_url || null;
              }
            }
          }

          const { data: quoteData } = await supabase
            .from('quotes')
            .select('*')
            .eq('job_id', job.id)
            .maybeSingle();

          const loadedQuote = quoteData ? {
            id: quoteData.id,
            visitFee: Number(quoteData.visit_fee),
            laborCost: Number(quoteData.labor_cost),
            partsEstimate: Number(quoteData.parts_estimate),
            total: Number(quoteData.total),
            mechanicNotes: quoteData.mechanic_notes || '',
            status: quoteData.status,
          } : null;

          const { data: codeData } = await supabase
            .from('secure_codes')
            .select('code')
            .eq('job_id', job.id)
            .eq('code_type', 'start')
            .maybeSingle();

          setCurrentJob({
            id: job.id,
            requestId: job.request_id,
            status: job.status as any,
            mechanic: {
              id: job.mechanic_id || '',
              name: mechanicName,
              phone: mechanicPhone,
              avatarUrl: mechanicAvatar,
              rating,
              totalJobs,
              workshopAddress,
              latitude: null,
              longitude: null,
            },
            startCode: codeData?.code || '',
            finishCode: null,
            quote: loadedQuote,
            invoice: null,
          });

          if (loadedQuote) {
            setQuote(loadedQuote);
          }

          if (loadedQuote?.status === 'approved' || job.status !== 'quote_submitted') {
            router.replace('/customer/request/mechanic-assigned');
            return;
          }
        }
      })();
    }
  }, [currentJob?.id, currentJob?.quote?.id]);

  const quote = currentJob?.quote;
  const mechanic = currentJob?.mechanic;

  const handleApproveQuote = async () => {
    if (!currentJob?.id) return;

    setIsSubmitting(true);
    try {
      // 1. Invoke atomic RPC respond_to_quote
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('respond_to_quote', {
        p_job_id: currentJob.id,
        p_quote_id: quote?.id || null,
        p_approved: true,
      });

      if (rpcErr) {
        console.warn('RPC respond_to_quote notice, attempting direct update:', rpcErr);
        if (quote?.id) {
          await supabase
            .from('quotes')
            .update({
              status: 'approved',
              customer_response_at: new Date().toISOString(),
            })
            .eq('id', quote.id);
        }

        await supabase
          .from('jobs')
          .update({
            status: 'quote_approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentJob.id);
      }

      // Record in job_status_history
      try {
        await supabase.from('job_status_history').insert({
          job_id: currentJob.id,
          old_status: 'quote_submitted',
          new_status: 'quote_approved',
          notes: `Customer approved repair quote of ₹${quote?.total || 0}`,
        });
      } catch (histErr) {
        // Non-blocking
      }

      if (quote) {
        setQuote({
          ...quote,
          status: 'approved',
        });
      }
      updateJobStatus('quote_approved');

      if (Platform.OS === 'web') {
        window.alert('Quote Approved! The mechanic can now proceed with the repair.');
        router.replace('/customer/request/mechanic-assigned');
      } else {
        Alert.alert(
          'Quote Approved',
          'You approved the quote. The mechanic can now proceed with repairing your tractor.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/customer/request/mechanic-assigned'),
            },
          ]
        );
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(err.message || 'Failed to approve quote.');
      } else {
        Alert.alert('Error', err.message || 'Failed to approve quote.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineQuote = () => {
    const isArrived = currentJob?.status === 'started' || currentJob?.status === 'repair_in_progress' || !!currentJob?.startCode;
    const visitCharge = quote?.visitFee || 200;

    Alert.alert(
      'Decline Quote',
      isArrived
        ? `Since the mechanic has already inspected your tractor on-site, you owe only the visit charge of ₹${visitCharge}. The repair will not proceed.`
        : 'Are you sure you want to decline this quote? The repair will not proceed.',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Decline Quote',
          style: 'destructive',
          onPress: async () => {
            if (!currentJob?.id) return;
            setIsSubmitting(true);
            try {
              // 1. Invoke atomic RPC respond_to_quote with false
              const { error: rpcErr } = await supabase.rpc('respond_to_quote', {
                p_job_id: currentJob.id,
                p_quote_id: quote?.id || null,
                p_approved: false,
              });

              if (rpcErr) {
                console.warn('RPC respond_to_quote decline notice, attempting direct update:', rpcErr);
                if (quote?.id) {
                  await supabase
                    .from('quotes')
                    .update({
                      status: 'rejected',
                      customer_response_at: new Date().toISOString(),
                    })
                    .eq('id', quote.id);
                }

                await supabase
                  .from('jobs')
                  .update({
                    status: 'quote_declined',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', currentJob.id);
              }

              // Also record visit charge collection if arrived
              try {
                await supabase.rpc('record_visit_charge_collected', { p_job_id: currentJob.id });
              } catch (vcErr) {
                // Non-blocking
              }

              updateJobStatus('quote_declined');
              router.replace('/customer/request/mechanic-assigned');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to decline quote.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (mechanic?.phone) {
      Linking.openURL(`tel:${mechanic.phone}`);
    }
  };

  const visitFee = quote?.visitFee ?? 200;
  const laborCost = quote?.laborCost ?? 0;
  const partsEstimate = quote?.partsEstimate ?? 0;
  const totalEstimate = quote?.total ?? (visitFee + laborCost + partsEstimate);

  const speechText = `Quote from your mechanic ${mechanic?.name || ''}. Visit charge: ₹${visitFee}. Labor and repair: ₹${laborCost}. Spare parts estimate: ₹${partsEstimate}. Estimated total: ₹${totalEstimate}. Tap approve to start repair, or decline quote.`;

  return (
    <View style={styles.screenWrapper}>
      {/* Top Header Bar with Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
        <SpeechSpeaker text={speechText} label="Read screen" />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerSubtitle}>QUOTE FROM YOUR MECHANIC</Text>
        <Text style={styles.headerTitle}>APPROVE THE REPAIR{'\n'}QUOTE</Text>

        {/* Mechanic Info Card */}
        <View style={styles.mechanicBadge}>
          <View style={styles.mechanicIcon}>
            <Ionicons name="construct" size={24} color="#C63C14" />
          </View>
          <View style={styles.mechanicTextContainer}>
            <Text style={styles.mechanicName}>{mechanic?.name || 'Assigned Mechanic'}</Text>
            <Text style={styles.verifiedText}>Verified Professional • {mechanic?.totalJobs || 0} repairs</Text>
          </View>
        </View>

        {/* What the Mechanic Found */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>WHAT THE MECHANIC FOUND</Text>
          <Text style={styles.notesText}>
            {quote?.mechanicNotes || 'Inspection completed on tractor. Parts and labor estimate prepared below.'}
          </Text>
        </View>

        {/* Cost Breakdown Card (Page 6 of Prototype) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>COST BREAKDOWN</Text>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Visit charge</Text>
            <Text style={styles.costValue}>₹{visitFee.toFixed(2)}</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Labor & Repair</Text>
            <Text style={styles.costValue}>₹{laborCost.toFixed(2)}</Text>
          </View>

          {partsEstimate > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Spare parts (estimate)</Text>
              <Text style={styles.costValue}>₹{partsEstimate.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>₹{totalEstimate.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.disclaimerText}>
          You will see the final itemized bill, including exact spare parts used with receipts, after the repair is completed.
        </Text>

        {/* Action Buttons: Approve (Terracotta #C63C14), Call, Decline */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.approveButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleApproveQuote}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>Approve and start repair</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <Ionicons name="call-outline" size={18} color="#C63C14" />
              <Text style={styles.callButtonText}>Call mechanic</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.declineButton} onPress={handleDeclineQuote}>
              <Ionicons name="close-circle-outline" size={18} color="#D32F2F" />
              <Text style={styles.declineButtonText}>Decline quote</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    lineHeight: 30,
  },
  mechanicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    gap: 12,
  },
  mechanicIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicTextContainer: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1816',
  },
  verifiedText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A857B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#555',
  },
  costValue: {
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
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1816',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#C63C14',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  actionContainer: {
    gap: 10,
  },
  approveButton: {
    backgroundColor: '#C63C14', // Terracotta primary button matching prototype
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C63C14',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C63C14',
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
  },
});
