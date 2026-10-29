import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useJobStore } from '../../../store/jobStore';
import { formatCurrency, formatPhone } from '@tractor-repair/shared';

export default function ActiveJobScreen() {
  const {
    activeJob,
    setActiveJob,
    updateJobStatus,
    verifyStartCode,
    submitQuote,
    startRepair,
  } = useJobStore();

  const [enteredStartCode, setEnteredStartCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Quote form state
  const [visitFee, setVisitFee] = useState(activeJob?.quote?.visitFee ? activeJob.quote.visitFee.toString() : '200');
  const [laborCost, setLaborCost] = useState(activeJob?.quote?.laborCost ? activeJob.quote.laborCost.toString() : '');
  const [partsEstimate, setPartsEstimate] = useState(activeJob?.quote?.partsEstimate ? activeJob.quote.partsEstimate.toString() : '');
  const [mechanicNotes, setMechanicNotes] = useState(activeJob?.quote?.mechanicNotes || '');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [isCollectingVisitFee, setIsCollectingVisitFee] = useState(false);

  // Mechanic Cancellation modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto-hydrate active job if missing
  useEffect(() => {
    if (!activeJob) {
      (async () => {
        try {
          const { data: job } = await supabase
            .from('jobs')
            .select('id, request_id, status, customer_id, mechanic_id')
            .not('status', 'in', '("completed","cancelled")')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (job) {
            const { data: req } = await supabase
              .from('repair_requests')
              .select(`
                *,
                tractors ( make, model, year, registration_number ),
                problem_categories ( name_en )
              `)
              .eq('id', job.request_id)
              .maybeSingle();

            let custName = 'Farmer (Customer)';
            let custPhone = '';
            if (job.customer_id) {
              const { data: c } = await supabase
                .from('customers')
                .select('profile_id')
                .eq('id', job.customer_id)
                .maybeSingle();
              if (c?.profile_id) {
                const { data: p } = await supabase
                  .from('profiles')
                  .select('full_name, phone')
                  .eq('id', c.profile_id)
                  .maybeSingle();
                if (p) {
                  custName = p.full_name || custName;
                  custPhone = p.phone || '';
                }
              }
            }

            const { data: q } = await supabase
              .from('quotes')
              .select('*')
              .eq('job_id', job.id)
              .maybeSingle();

            const quoteObj = q ? {
              id: q.id,
              visitFee: Number(q.visit_fee),
              laborCost: Number(q.labor_cost),
              partsEstimate: Number(q.parts_estimate),
              total: Number(q.total),
              mechanicNotes: q.mechanic_notes || '',
              status: q.status,
            } : {
              visitFee: 200,
              laborCost: 0,
              partsEstimate: 0,
              total: 200,
              mechanicNotes: '',
              status: 'pending',
            };

            const { data: sc } = await supabase
              .from('secure_codes')
              .select('code, is_used')
              .eq('job_id', job.id)
              .eq('code_type', 'start')
              .maybeSingle();

            const { data: fc } = await supabase
              .from('secure_codes')
              .select('code, is_used')
              .eq('job_id', job.id)
              .eq('code_type', 'finish')
              .maybeSingle();

            setActiveJob({
              id: job.id,
              requestId: job.request_id,
              status: job.status as any,
              customer: {
                id: job.customer_id || '',
                name: custName,
                phone: custPhone,
                avatarUrl: null,
                address: req?.address_text || '',
                village: req?.village || '',
                mandal: req?.mandal || '',
                district: req?.district || '',
                landmark: req?.landmark || '',
                latitude: Number(req?.latitude || 0),
                longitude: Number(req?.longitude || 0),
              },
              tractor: {
                make: (req?.tractors as any)?.make || 'Tractor',
                model: (req?.tractors as any)?.model || '',
                year: (req?.tractors as any)?.year ? Number((req.tractors as any).year) : undefined,
                registrationNumber: (req?.tractors as any)?.registration_number || undefined,
              },
              problem: {
                categoryId: req?.category_id || '',
                categoryName: (req?.problem_categories as any)?.name_en || 'Tractor Issue',
                description: req?.description || '',
                photoUrls: [],
                voiceNoteUrl: req?.voice_note_url || null,
              },
              startCode: sc?.code || '',
              startCodeVerified: sc?.is_used || false,
              quote: quoteObj as any,
              spareParts: [],
              paymentMethod: 'cash',
              platformFeeLiability: Math.round(quoteObj.total * 0.1),
              cashReceivedConfirmed: false,
              finishCode: fc?.code || '',
              finishCodeVerified: fc?.is_used || false,
            });
          }
        } catch (e) {
          console.warn('Error hydrating mechanic active job:', e);
        }
      })();
    }
  }, [activeJob]);

  // Sync customer quote approval / decline in real-time
  useEffect(() => {
    if (!activeJob?.id) return;

    const interval = setInterval(async () => {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', activeJob.id)
        .maybeSingle();

      const { data: q } = await supabase
        .from('quotes')
        .select('status')
        .eq('job_id', activeJob.id)
        .maybeSingle();

      if (jobData?.status === 'quote_declined' || q?.status === 'rejected') {
        setActiveJob({
          ...activeJob,
          status: 'quote_declined',
          quote: {
            ...activeJob.quote,
            status: 'rejected',
          },
        });
      } else if (jobData?.status === 'quote_approved' || q?.status === 'approved') {
        setActiveJob({
          ...activeJob,
          status: 'quote_approved',
          quote: {
            ...activeJob.quote,
            status: 'approved',
          },
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.quote?.status]);

  if (!activeJob) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF9800" />
        <Text style={styles.emptyTitle}>No Active Job Found</Text>
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={() => router.replace('/mechanic/(tabs)/home')}
        >
          <Text style={styles.backHomeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCallCustomer = () => {
    if (activeJob.customer.phone) {
      Linking.openURL(`tel:${activeJob.customer.phone}`);
    } else {
      Alert.alert('Phone', 'Customer phone number not available.');
    }
  };

  const handleNavigateGoogleMaps = () => {
    const lat = activeJob.customer.latitude || 18.7845;
    const lng = activeJob.customer.longitude || 78.2914;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps Error', 'Could not open Google Maps navigation.');
    });
  };

  const handleVerifyStartCode = async () => {
    if (!enteredStartCode || enteredStartCode.length < 4) {
      Alert.alert('Start Code', 'Please enter the 6-digit Start Code from the farmer.');
      return;
    }

    setIsVerifyingCode(true);
    const result = await verifyStartCode(enteredStartCode);
    setIsVerifyingCode(false);

    if (result.success) {
      Alert.alert('Start Code Verified ✓', 'You are now authorized to inspect the tractor and prepare a quote.');
    } else {
      Alert.alert('Verification Failed', result.message);
    }
  };

  const handleSendQuote = async () => {
    const vFee = parseFloat(visitFee) || 200;
    const lCost = parseFloat(laborCost) || 0;
    const pEst = parseFloat(partsEstimate) || 0;

    if (lCost <= 0) {
      Alert.alert('Labor Charge Required', 'Please enter estimated repair labor charge.');
      return;
    }

    setIsSubmittingQuote(true);
    await submitQuote(vFee, lCost, pEst, mechanicNotes);
    setIsSubmittingQuote(false);

    Alert.alert(
      'Quote Sent to Customer',
      `Quote of ${formatCurrency(vFee + lCost + pEst)} has been sent to ${
        activeJob.customer.name
      }'s phone for approval.`
    );
  };

  const handleCollectVisitChargeCash = async () => {
    setIsCollectingVisitFee(true);
    try {
      // Call server RPC record_visit_charge_collected
      const { data, error } = await supabase.rpc('record_visit_charge_collected', {
        p_job_id: activeJob.id,
      });

      if (error) throw error;

      Alert.alert(
        'Visit Charge Collected',
        `Visit charge of ${formatCurrency(data?.visit_charge || 200)} recorded. Platform fee of ${formatCurrency(data?.platform_fee || 20)} added to your ledger.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/mechanic/(tabs)/home'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not record visit charge.');
    } finally {
      setIsCollectingVisitFee(false);
    }
  };

  const handleMechanicCancelJob = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a brief reason for cancelling.');
      return;
    }

    setIsCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_job_by_mechanic', {
        p_job_id: activeJob.id,
        p_reason: cancelReason.trim(),
      });

      if (error) throw error;

      setIsCancelModalOpen(false);
      Alert.alert(
        'Job Cancelled',
        'Job has been cancelled. Your cancellation count has been recorded.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/mechanic/(tabs)/home'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not cancel job.');
    } finally {
      setIsCancelling(false);
    }
  };

  const calculatedQuoteTotal =
    (parseFloat(visitFee) || 200) + (parseFloat(laborCost) || 0) + (parseFloat(partsEstimate) || 0);

  const isQuoteDeclined =
    activeJob.status === 'quote_declined' || activeJob.quote?.status === 'rejected';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Progress Tracker Status Bar */}
        <View style={styles.stepperCard}>
          <Text style={styles.stepperTitle}>REPAIR WORKFLOW</Text>
          <View style={styles.stepperRow}>
            <View style={[styles.stepChip, styles.stepChipDone]}>
              <Text style={styles.stepChipText}>1. En-Route</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="#CBD5E0" />
            <View style={[styles.stepChip, activeJob.startCodeVerified && styles.stepChipDone]}>
              <Text style={styles.stepChipText}>2. Start Code</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="#CBD5E0" />
            <View
              style={[
                styles.stepChip,
                activeJob.quote.status === 'approved' && styles.stepChipDone,
              ]}
            >
              <Text style={styles.stepChipText}>3. Quote</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="#CBD5E0" />
            <View
              style={[
                styles.stepChip,
                activeJob.status === 'repair_in_progress' && styles.stepChipDone,
              ]}
            >
              <Text style={styles.stepChipText}>4. Repair</Text>
            </View>
          </View>
        </View>

        {/* 1. Customer Contact & Location Card (Revealed upon Accept) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle" size={20} color="#1E3A5F" />
            <Text style={styles.cardTitle}>CUSTOMER & LOCATION</Text>
          </View>

          <View style={styles.customerRow}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={28} color="#1E3A5F" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{activeJob.customer.name}</Text>
              <Text style={styles.customerPhone}>
                📞 {formatPhone(activeJob.customer.phone)}
              </Text>
              <Text style={styles.customerAddress}>📍 {activeJob.customer.address}</Text>
              {activeJob.customer.landmark && (
                <Text style={styles.landmarkText}>Landmark: {activeJob.customer.landmark}</Text>
              )}
            </View>
          </View>

          {/* Action Buttons: Call & Navigate (Page 13 of Prototype) */}
          <View style={styles.actionBtnRow}>
            <TouchableOpacity style={styles.callBtn} onPress={handleCallCustomer}>
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={styles.callBtnText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={handleNavigateGoogleMaps}>
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.navBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Tractor & Reported Fault */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="construct" size={20} color="#1E3A5F" />
            <Text style={styles.cardTitle}>TRACTOR & REPORTED FAULT</Text>
          </View>

          <Text style={styles.tractorName}>
            🚜 {activeJob.tractor.make} {activeJob.tractor.model} {activeJob.tractor.year ? `(${activeJob.tractor.year})` : ''}
          </Text>

          <View style={styles.faultBox}>
            <Text style={styles.faultCategory}>
              System: {activeJob.problem.categoryName}
            </Text>
            <Text style={styles.faultDesc}>"{activeJob.problem.description || 'Diagnosis required'}"</Text>
          </View>
        </View>

        {/* 3. Secure Start Code Verification (Page 13) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="key" size={20} color="#E65100" />
            <Text style={styles.cardTitle}>START CODE ENTRY</Text>
          </View>

          {activeJob.startCodeVerified ? (
            <View style={styles.codeVerifiedCard}>
              <Ionicons name="shield-checkmark" size={28} color="#00C853" />
              <View style={{ flex: 1 }}>
                <Text style={styles.codeVerifiedTitle}>Start Code Verified ✓</Text>
                <Text style={styles.codeVerifiedSub}>
                  On-site presence validated. Authorized to inspect and repair.
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.codeInstruction}>
                Ask customer for the 6-digit Start Code shown on their screen upon arrival:
              </Text>

              <View style={styles.codeInputRow}>
                <TextInput
                  style={styles.codeInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="------"
                  placeholderTextColor="#A0AEC0"
                  value={enteredStartCode}
                  onChangeText={setEnteredStartCode}
                />

                <TouchableOpacity
                  style={[styles.verifyBtn, isVerifyingCode && styles.btnDisabled]}
                  onPress={handleVerifyStartCode}
                  disabled={isVerifyingCode}
                >
                  {isVerifyingCode ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 4. Quote Declined Banner (Rule 6) */}
        {isQuoteDeclined && (
          <View style={styles.quoteDeclinedBanner}>
            <Ionicons name="alert-circle" size={28} color="#D32F2F" />
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteDeclinedTitle}>Quote Declined by Customer</Text>
              <Text style={styles.quoteDeclinedSub}>
                Customer declined the repair estimate. As you arrived on-site, collect the visit charge of {formatCurrency(parseFloat(visitFee) || 200)} in cash.
              </Text>
              <TouchableOpacity
                style={styles.collectVisitFeeBtn}
                onPress={handleCollectVisitChargeCash}
                disabled={isCollectingVisitFee}
              >
                {isCollectingVisitFee ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.collectVisitFeeBtnText}>
                    Visit Charge Collected (Cash) · Close Job
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. Repair Quote Composer (Page 13) */}
        {!isQuoteDeclined && (
          <View style={[styles.card, !activeJob.startCodeVerified && styles.cardDimmed]}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt" size={20} color="#1E3A5F" />
              <Text style={styles.cardTitle}>DIAGNOSIS & REPAIR QUOTE</Text>
            </View>

            {!activeJob.startCodeVerified ? (
              <Text style={styles.lockNotice}>
                🔒 Please verify the Start Code above before preparing repair quote.
              </Text>
            ) : (
              <View>
                <View style={styles.quoteInputGroup}>
                  <Text style={styles.quoteInputLabel}>Visit Charge (₹)</Text>
                  <TextInput
                    style={styles.quoteInput}
                    keyboardType="number-pad"
                    value={visitFee}
                    onChangeText={setVisitFee}
                    editable={activeJob.quote.status !== 'approved'}
                  />
                </View>

                <View style={styles.quoteInputGroup}>
                  <Text style={styles.quoteInputLabel}>Labor & Repair Charges (₹)</Text>
                  <TextInput
                    style={styles.quoteInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 600"
                    value={laborCost}
                    onChangeText={setLaborCost}
                    editable={activeJob.quote.status !== 'approved'}
                  />
                </View>

                <View style={styles.quoteInputGroup}>
                  <Text style={styles.quoteInputLabel}>Estimated Spare Parts Cost (₹)</Text>
                  <TextInput
                    style={styles.quoteInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 400"
                    value={partsEstimate}
                    onChangeText={setPartsEstimate}
                    editable={activeJob.quote.status !== 'approved'}
                  />
                </View>

                <View style={styles.quoteInputGroup}>
                  <Text style={styles.quoteInputLabel}>Mechanic Notes & Observations</Text>
                  <TextInput
                    style={[styles.quoteInput, { height: 60, textAlignVertical: 'top' }]}
                    multiline
                    placeholder="What was diagnosed and needs fixing..."
                    value={mechanicNotes}
                    onChangeText={setMechanicNotes}
                    editable={activeJob.quote.status !== 'approved'}
                  />
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Estimated Total Quote:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(calculatedQuoteTotal)}</Text>
                </View>

                {activeJob.quote.status === 'submitted' && (
                  <View style={styles.quoteWaitingCard}>
                    <ActivityIndicator color="#E65100" size="small" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quoteWaitingTitle}>Waiting for Customer Approval</Text>
                      <Text style={styles.quoteWaitingSub}>
                        Quote sent to customer app. Once approved, start repair work.
                      </Text>
                    </View>
                  </View>
                )}

                {activeJob.quote.status === 'approved' && (
                  <View style={styles.quoteApprovedCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#00C853" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quoteApprovedTitle}>Quote Approved by Farmer ✓</Text>
                      <Text style={styles.quoteApprovedSub}>
                        Approved Amount: {formatCurrency(activeJob.quote.total)}
                      </Text>
                    </View>
                  </View>
                )}

                {activeJob.quote.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.sendQuoteBtn, isSubmittingQuote && styles.btnDisabled]}
                    onPress={handleSendQuote}
                    disabled={isSubmittingQuote}
                  >
                    {isSubmittingQuote ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#FFFFFF" />
                        <Text style={styles.sendQuoteBtnText}>Send Quote</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* 6. Start Repair & Proceed to Finish Job */}
        {activeJob.quote.status === 'approved' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hammer" size={20} color="#1E3A5F" />
              <Text style={styles.cardTitle}>EXECUTE REPAIR WORK</Text>
            </View>

            {activeJob.status !== 'repair_in_progress' ? (
              <TouchableOpacity style={styles.startRepairBtn} onPress={startRepair}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text style={styles.startRepairBtnText}>Start Repair</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.inProgressBadge}>
                  <View style={styles.livePulse} />
                  <Text style={styles.inProgressText}>Repair in Progress</Text>
                </View>
                <Text style={styles.inProgressSub}>
                  Perform repairs and install spare parts.
                </Text>

                <TouchableOpacity
                  style={styles.finishRepairBtn}
                  onPress={() => router.push('/mechanic/job/finish-job')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.finishRepairBtnText}>
                    Finish Job & Collect Payment
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Cancel Job by Mechanic */}
        <TouchableOpacity
          style={styles.mechanicCancelBtn}
          onPress={() => setIsCancelModalOpen(true)}
        >
          <Text style={styles.mechanicCancelBtnText}>Cancel Job</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Cancel Job Modal */}
      <Modal
        visible={isCancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCancelModalOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Job Assignment?</Text>
              <TouchableOpacity onPress={() => setIsCancelModalOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              If you cancel, the customer pays nothing. Your mechanic cancellation count will increase.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Reason for cancellation (e.g. vehicle breakdown, emergency)..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setIsCancelModalOpen(false)}
              >
                <Text style={styles.modalBackBtnText}>Keep Job</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleMechanicCancelJob}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F4F6F9',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 12,
  },
  backHomeBtn: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
  },
  backHomeBtnText: {
    color: '#FFB300',
    fontWeight: '700',
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepChip: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepChipDone: {
    backgroundColor: '#E8F5E9',
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D3748',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardDimmed: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A5568',
    letterSpacing: 1.2,
  },
  customerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
  },
  customerPhone: {
    fontSize: 13,
    color: '#2B6CB0',
    fontWeight: '700',
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 2,
  },
  landmarkText: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 6,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 10,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    borderRadius: 10,
  },
  navBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tractorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 8,
  },
  faultBox: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 12,
  },
  faultCategory: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E65100',
    marginBottom: 4,
  },
  faultDesc: {
    fontSize: 13,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  codeVerifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  codeVerifiedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D32',
  },
  codeVerifiedSub: {
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  codeInstruction: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 8,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  verifyBtn: {
    backgroundColor: '#E65100',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  quoteDeclinedBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  quoteDeclinedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D32F2F',
  },
  quoteDeclinedSub: {
    fontSize: 12,
    color: '#555',
    marginVertical: 6,
    lineHeight: 16,
  },
  collectVisitFeeBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  collectVisitFeeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  lockNotice: {
    fontSize: 13,
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  quoteInputGroup: {
    marginBottom: 10,
  },
  quoteInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 4,
  },
  quoteInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1A202C',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFB300',
  },
  quoteWaitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  quoteWaitingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E65100',
  },
  quoteWaitingSub: {
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  quoteApprovedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  quoteApprovedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
  quoteApprovedSub: {
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  sendQuoteBtn: {
    backgroundColor: '#1E3A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
  },
  sendQuoteBtnText: {
    color: '#FFB300',
    fontSize: 15,
    fontWeight: '800',
  },
  startRepairBtn: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  startRepairBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  inProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C853',
  },
  inProgressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00C853',
  },
  inProgressSub: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 12,
  },
  finishRepairBtn: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  finishRepairBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  mechanicCancelBtn: {
    borderWidth: 1,
    borderColor: '#D32F2F',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  mechanicCancelBtnText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
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
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
  },
  modalDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBackBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  modalBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
