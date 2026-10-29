import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { APP_NAME } from '@tractor-repair/shared';

export default function MechanicAssignedScreen() {
  const { currentJob, currentRequest, setCurrentJob, setQuote, setFinishCode, updateJobStatus } = useRepairStore();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Trap Android hardware back button so it safely returns to Customer Home
  useEffect(() => {
    const onBackPress = () => {
      router.replace('/customer/(tabs)/home');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  // Realtime subscription for live job & quote updates
  useRealtimeSync({
    jobId: currentJob?.id,
    requestId: currentJob?.requestId || currentRequest?.id,
    role: 'customer',
    onJobChange: async (updatedJob) => {
      if (updatedJob?.status === 'quote_submitted') {
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('job_id', updatedJob.id)
          .maybeSingle();

        // ONLY navigate if quote is still pending approval!
        if (quote && quote.status === 'pending') {
          setQuote({
            id: quote.id,
            visitFee: Number(quote.visit_fee),
            laborCost: Number(quote.labor_cost),
            partsEstimate: Number(quote.parts_estimate),
            total: Number(quote.total),
            mechanicNotes: quote.mechanic_notes || '',
            status: quote.status,
          });
          router.replace('/customer/request/quote-approval');
        }
      } else if (updatedJob?.status === 'quote_approved') {
        updateJobStatus('quote_approved');
      } else if (updatedJob?.status === 'repair_in_progress') {
        updateJobStatus('repair_in_progress');
      } else if (updatedJob?.status === 'bill_ready') {
        updateJobStatus('bill_ready');
        router.replace('/customer/request/bill');
      } else if (updatedJob?.status === 'completed') {
        updateJobStatus('completed');
        router.replace('/customer/request/rating');
      }
    },
    onQuoteChange: (quoteData) => {
      if (quoteData) {
        setQuote({
          id: quoteData.id,
          visitFee: Number(quoteData.visit_fee),
          laborCost: Number(quoteData.labor_cost),
          partsEstimate: Number(quoteData.parts_estimate),
          total: Number(quoteData.total),
          mechanicNotes: quoteData.mechanic_notes || '',
          status: quoteData.status,
        });

        // ONLY navigate if quote is pending AND job is quote_submitted!
        if (
          quoteData.status === 'pending' &&
          (currentJob?.status === 'quote_submitted' || !currentJob?.status)
        ) {
          router.replace('/customer/request/quote-approval');
        }
      }
    },
  });

  // Auto-hydrate active job if refreshed
  useEffect(() => {
    if (!currentJob?.id) {
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
              .select('id, profile_id, rating_avg, total_jobs, workshop_address, is_online, current_latitude, current_longitude')
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

          // Fetch start code
          const { data: codeData } = await supabase
            .from('secure_codes')
            .select('code')
            .eq('job_id', job.id)
            .eq('code_type', 'start')
            .maybeSingle();

          const startCode = codeData?.code || '';

          // Fetch finish code
          let finishCode: string | null = null;
          const { data: fcData } = await supabase
            .from('secure_codes')
            .select('code')
            .eq('job_id', job.id)
            .eq('code_type', 'finish')
            .maybeSingle();

          if (fcData?.code) {
            finishCode = fcData.code;
          } else {
            try {
              const { data: rpcFinish } = await supabase.rpc('get_or_create_finish_code', {
                p_job_id: job.id,
              });
              if (rpcFinish?.code) {
                finishCode = rpcFinish.code;
              }
            } catch (err) {
              // Non-blocking
            }
          }

          // Query genuine match distance if recorded
          let calculatedDist: number | null = null;
          if (job.request_id && job.mechanic_id) {
            const { data: matchData } = await supabase
              .from('mechanic_matches')
              .select('distance_km')
              .eq('request_id', job.request_id)
              .eq('mechanic_id', job.mechanic_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (matchData?.distance_km != null) {
              calculatedDist = Number(matchData.distance_km);
            }
          }

          if (calculatedDist !== null && !isNaN(calculatedDist) && calculatedDist > 0) {
            setDistanceKm(calculatedDist);
            setEtaMinutes(Math.max(5, Math.round(calculatedDist * 3)));
          } else {
            setDistanceKm(null);
            setEtaMinutes(null);
          }

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
            startCode,
            finishCode,
            quote: null,
            invoice: null,
          });

          // If quote already submitted and STILL pending, navigate immediately
          if (job.status === 'quote_submitted') {
            const { data: quote } = await supabase
              .from('quotes')
              .select('*')
              .eq('job_id', job.id)
              .maybeSingle();

            if (quote && quote.status === 'pending') {
              setQuote({
                id: quote.id,
                visitFee: Number(quote.visit_fee),
                laborCost: Number(quote.labor_cost),
                partsEstimate: Number(quote.parts_estimate),
                total: Number(quote.total),
                mechanicNotes: quote.mechanic_notes || '',
                status: quote.status,
              });
              router.replace('/customer/request/quote-approval');
              return;
            }
          }
        }
      })();
    }
  }, [currentJob?.id]);

  useEffect(() => {
    if (!currentJob?.id) return;

    const checkJobStatus = async () => {
      const { data: j } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', currentJob.id)
        .maybeSingle();

      if (j?.status === 'quote_submitted') {
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('job_id', currentJob.id)
          .maybeSingle();

        if (quote && quote.status === 'pending') {
          setQuote({
            id: quote.id,
            visitFee: Number(quote.visit_fee),
            laborCost: Number(quote.labor_cost),
            partsEstimate: Number(quote.parts_estimate),
            total: Number(quote.total),
            mechanicNotes: quote.mechanic_notes || '',
            status: quote.status,
          });
          router.replace('/customer/request/quote-approval');
        }
      } else if (j?.status === 'quote_approved') {
        updateJobStatus('quote_approved');
      } else if (j?.status === 'repair_in_progress') {
        updateJobStatus('repair_in_progress');
      } else if (j?.status === 'bill_ready') {
        updateJobStatus('bill_ready');
        router.replace('/customer/request/bill');
      } else if (j?.status === 'completed') {
        updateJobStatus('completed');
        router.replace('/customer/request/rating');
      }

      // Check for finish code if missing
      if (!currentJob.finishCode) {
        const { data: fcData } = await supabase
          .from('secure_codes')
          .select('code')
          .eq('job_id', currentJob.id)
          .eq('code_type', 'finish')
          .maybeSingle();

        if (fcData?.code) {
          setFinishCode(fcData.code);
        }
      }
    };

    checkJobStatus();
    const interval = setInterval(checkJobStatus, 2500);

    return () => clearInterval(interval);
  }, [currentJob?.id]);

  const handleCall = () => {
    if (currentJob?.mechanic?.phone) {
      Linking.openURL(`tel:${currentJob.mechanic.phone}`);
    } else {
      Alert.alert('Notice', 'Mechanic phone number not available.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!currentJob?.id) return;
    setIsCancelling(true);
    try {
      const reason = cancelReason.trim() || 'Customer cancelled before arrival';

      // 1. Attempt atomic RPC cancellation
      const { error: rpcError } = await supabase.rpc('cancel_job_by_customer', {
        p_job_id: currentJob.id,
        p_reason: reason,
      });

      if (rpcError) {
        // Fallback to direct table updates if RPC is unavailable
        await supabase
          .from('jobs')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
          })
          .eq('id', currentJob.id);

        if (currentJob.requestId) {
          await supabase
            .from('repair_requests')
            .update({ status: 'cancelled' })
            .eq('id', currentJob.requestId);
        }

        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: cust } = await supabase
            .from('customers')
            .select('id, cancellation_count')
            .eq('profile_id', authData.user.id)
            .single();

          if (cust) {
            await supabase
              .from('customers')
              .update({ cancellation_count: (cust.cancellation_count || 0) + 1 })
              .eq('id', cust.id);
          }
        }
      }

      setIsCancelModalOpen(false);
      Alert.alert(
        'Request Cancelled',
        'Your repair request has been cancelled. As the mechanic had not yet arrived, no fee was charged.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/customer/(tabs)/home'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not cancel request.');
    } finally {
      setIsCancelling(false);
    }
  };

  const mechanic = currentJob?.mechanic;

  const isRepairing =
    currentJob?.status === 'quote_approved' || currentJob?.status === 'repair_in_progress';
  const isBillReady = currentJob?.status === 'bill_ready';

  const speechText = isBillReady
    ? `Repair completed. Your finish code is ${currentJob?.finishCode || 'available'}. Share this finish code only after verifying repair and paying the mechanic.`
    : isRepairing
    ? `Mechanic is currently repairing your tractor. Your finish code is ${currentJob?.finishCode || 'available'}. Keep it ready for when the repair finishes.`
    : `Mechanic assigned for your repair. ${
        etaMinutes ? `Arrives in approximately ${etaMinutes} minutes.` : 'Heading to your location.'
      } Your secure start code is ${currentJob?.startCode || 'not ready'}. Tell the mechanic this code only when they arrive.`;

  return (
    <View style={styles.screenWrapper}>
      {/* Top Header Bar with Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
        <SpeechSpeaker text={speechText} label="Read screen" />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Dynamic Status / ETA Banner */}
        <View
          style={[
            styles.etaCard,
            isRepairing && styles.etaCardInProgress,
            isBillReady && styles.etaCardBillReady,
          ]}
        >
          <View style={styles.etaHeader}>
            <Ionicons
              name={isBillReady ? 'receipt' : isRepairing ? 'construct' : 'time'}
              size={24}
              color={isBillReady ? '#C63C14' : isRepairing ? '#1565C0' : '#2E7D32'}
            />
            <Text
              style={[
                styles.etaTitle,
                isRepairing && styles.etaTitleInProgress,
                isBillReady && styles.etaTitleBillReady,
              ]}
            >
              {isBillReady
                ? 'REPAIR COMPLETED · BILL READY'
                : currentJob?.status === 'repair_in_progress'
                ? 'REPAIR IN PROGRESS'
                : currentJob?.status === 'quote_approved'
                ? 'QUOTE APPROVED · WORK COMMENCING'
                : etaMinutes
                ? `ARRIVES IN ~${etaMinutes} MIN`
                : 'MECHANIC ASSIGNED'}
            </Text>
          </View>
          <Text
            style={[
              styles.etaDistance,
              isRepairing && styles.etaDistanceInProgress,
              isBillReady && styles.etaDistanceBillReady,
            ]}
          >
            {isBillReady
              ? 'Mechanic finished the repair. View final bill and share finish code.'
              : currentJob?.status === 'repair_in_progress'
              ? 'Mechanic is on-site repairing your tractor.'
              : currentJob?.status === 'quote_approved'
              ? 'Quote approved. Mechanic is starting repair work.'
              : distanceKm
              ? `Mechanic is approx. ${distanceKm.toFixed(1)} km away`
              : 'Mechanic is heading to your breakdown location'}
          </Text>
        </View>

        {/* Start Code Card: Shown before repair starts */}
        {!isRepairing && !isBillReady && (
          <View style={styles.startCodeCard}>
            <Text style={styles.startCodeLabel}>YOUR SECURE START CODE</Text>
            <View style={styles.startCodeBox}>
              <Text style={styles.startCodeText}>{currentJob?.startCode || '------'}</Text>
            </View>
            <Text style={styles.startCodeInstruction}>
              Tell the mechanic this 6-digit code only when they arrive at your location. Work cannot begin without this code.
            </Text>
          </View>
        )}

        {/* Finish Code Card: Shown when repair is approved, in progress, or bill ready */}
        {(isRepairing || isBillReady || !!currentJob?.finishCode) && (
          <View style={styles.finishCodeCard}>
            <View style={styles.finishBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#1565C0" />
              <Text style={styles.finishBadgeText}>STEP 2: COMPLETION & PAYMENT</Text>
            </View>
            <Text style={styles.finishCodeLabel}>YOUR SECURE FINISH CODE</Text>
            <View style={styles.finishCodeBox}>
              <Text style={styles.finishCodeText}>{currentJob?.finishCode || '------'}</Text>
            </View>
            <Text style={styles.finishCodeInstruction}>
              Share this 6-digit finish code with the mechanic ONLY after they have completed the repair and you have inspected your tractor.
            </Text>

            <TouchableOpacity
              style={styles.viewBillCardBtn}
              onPress={() => router.push('/customer/request/bill')}
            >
              <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewBillCardBtnText}>View Final Itemized Bill</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mechanic Profile Card */}
        <View style={styles.mechanicCard}>
          <View style={styles.profileRow}>
            {mechanic?.avatarUrl ? (
              <Image source={{ uri: mechanic.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={32} color="#C63C14" />
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={styles.mechanicName}>{mechanic?.name || 'Assigned Mechanic'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFA000" />
                <Text style={styles.ratingText}>
                  {mechanic?.rating ? Number(mechanic.rating).toFixed(1) : '5.0'}
                </Text>
                <Text style={styles.jobsCount}>
                  · {mechanic?.totalJobs || 0} repairs completed
                </Text>
              </View>
              <Text style={styles.phoneText}>📞 {mechanic?.phone || 'Phone hidden'}</Text>
            </View>
          </View>

          {mechanic?.workshopAddress && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.addressText}>{mechanic.workshopAddress}</Text>
            </View>
          )}
        </View>

        {/* Reported Tractor & Problem */}
        {currentRequest && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>REPORTED FAULT</Text>
            <Text style={styles.detailsText}>
              {currentRequest.tractorMake} {currentRequest.tractorModel} · {currentRequest.categoryName}
            </Text>
            {currentRequest.description ? (
              <Text style={styles.descriptionText}>"{currentRequest.description}"</Text>
            ) : null}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {currentJob?.quote?.status === 'pending' && currentJob?.status === 'quote_submitted' && (
            <TouchableOpacity
              style={styles.reviewQuoteButton}
              onPress={() => router.push('/customer/request/quote-approval')}
            >
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
              <Text style={styles.reviewQuoteButtonText}>Review Repair Quote</Text>
            </TouchableOpacity>
          )}

          {(isRepairing || isBillReady) && (
            <TouchableOpacity
              style={styles.viewBillActionBtn}
              onPress={() => router.push('/customer/request/bill')}
            >
              <Ionicons name="receipt" size={20} color="#FFFFFF" />
              <Text style={styles.viewBillActionBtnText}>View Final Bill & Finish Code</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call Mechanic</Text>
          </TouchableOpacity>

          {!isRepairing && !isBillReady && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsCancelModalOpen(true)}>
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={isCancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCancelModalOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Repair Request?</Text>
              <TouchableOpacity onPress={() => setIsCancelModalOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInfo}>
              Since the mechanic has not yet arrived on-site, there is NO cancellation fee. Please tell us why you are cancelling:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Started working myself, Mechanic took too long..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalKeepBtn}
                onPress={() => setIsCancelModalOpen(false)}
              >
                <Text style={styles.modalKeepText}>Keep Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmCancelBtn}
                onPress={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmCancelText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  etaCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  etaCardInProgress: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  etaCardBillReady: {
    backgroundColor: '#FBE9E7',
    borderColor: '#FFCCBC',
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B5E20',
  },
  etaTitleInProgress: {
    color: '#0D47A1',
  },
  etaTitleBillReady: {
    color: '#BF360C',
  },
  etaDistance: {
    fontSize: 13,
    color: '#2E7D32',
    marginTop: 4,
    fontWeight: '600',
  },
  etaDistanceInProgress: {
    color: '#1565C0',
  },
  etaDistanceBillReady: {
    color: '#D84315',
  },
  startCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#2E7D32', // Green card from prototype
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  startCodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  startCodeBox: {
    backgroundColor: '#F1F8E9',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#AED581',
    marginVertical: 6,
  },
  startCodeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1B5E20',
    letterSpacing: 8,
  },
  startCodeInstruction: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  finishCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#1565C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  finishBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  finishBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 0.5,
  },
  finishCodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  finishCodeBox: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#90CAF9',
    marginVertical: 6,
  },
  finishCodeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0D47A1',
    letterSpacing: 8,
  },
  finishCodeInstruction: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 12,
  },
  viewBillCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
    width: '100%',
  },
  viewBillCardBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewBillActionBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewBillActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mechanicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1816',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  jobsCount: {
    fontSize: 12,
    color: '#666',
  },
  phoneText: {
    fontSize: 13,
    color: '#C63C14',
    marginTop: 3,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A857B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1816',
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButtons: {
    gap: 10,
  },
  reviewQuoteButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reviewQuoteButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  callButton: {
    backgroundColor: '#C63C14', // Terracotta Call button
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1816',
  },
  modalInfo: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F5F5F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0DDD5',
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalKeepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  modalKeepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
  },
  modalConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
  },
  modalConfirmCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
