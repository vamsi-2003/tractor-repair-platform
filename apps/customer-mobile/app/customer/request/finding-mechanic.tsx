import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { APP_NAME } from '@tractor-repair/shared';

export default function FindingMechanicScreen() {
  const { currentRequest, setCurrentRequest, setCurrentJob } = useRepairStore();
  const [dots, setDots] = useState('');
  const [isNoMechanicAvailable, setIsNoMechanicAvailable] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Realtime subscription for instant transition as soon as mechanic accepts
  useRealtimeSync({
    requestId: currentRequest?.id,
    role: 'customer',
    onRequestChange: (updatedReq) => {
      if (updatedReq?.status === 'assigned') {
        fetchJobDetails(updatedReq.id);
      } else if (
        updatedReq?.status === 'no_mechanic_available' ||
        updatedReq?.status === 'no_mechanic_found'
      ) {
        setIsNoMechanicAvailable(true);
      }
    },
    onJobChange: (newJob) => {
      if (newJob?.status === 'assigned') {
        fetchJobDetails(newJob.request_id || currentRequest?.id);
      }
    },
  });

  // Radar Animation
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.8)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 1.8,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity1, {
            toValue: 0,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity1, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Stagger second pulse
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.8,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity2, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity2, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const fetchJobDetails = async (requestId: string) => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, request_id, status, mechanic_id')
        .eq('request_id', requestId)
        .maybeSingle();

      if (!job) return;

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

      // Fetch start code generated server-side
      const { data: codeData } = await supabase
        .from('secure_codes')
        .select('code')
        .eq('job_id', job.id)
        .eq('code_type', 'start')
        .maybeSingle();

      const startCode = codeData?.code || '';

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
        finishCode: null,
        quote: null,
        invoice: null,
      });

      router.replace('/customer/request/mechanic-assigned');
    } catch (err) {
      console.error('Error fetching assigned job details:', err);
    }
  };

  const checkStatus = async (requestId: string) => {
    const { data: req } = await supabase
      .from('repair_requests')
      .select('status')
      .eq('id', requestId)
      .maybeSingle();

    if (req?.status === 'assigned') {
      await fetchJobDetails(requestId);
    } else if (req?.status === 'no_mechanic_available' || req?.status === 'no_mechanic_found') {
      setIsNoMechanicAvailable(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function recoverAndListen() {
      let targetRequestId = currentRequest?.id;

      if (!targetRequestId) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', authData.user.id)
          .maybeSingle();
        if (!customer) return;

        const { data: req } = await supabase
          .from('repair_requests')
          .select(`
            id,
            category_id,
            description,
            latitude,
            longitude,
            status,
            tractors ( make, model ),
            problem_categories ( name_en )
          `)
          .eq('customer_id', customer.id)
          .in('status', ['requested', 'matching', 'assigned', 'no_mechanic_available', 'no_mechanic_found'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted || !req) return;

        targetRequestId = req.id;
        setCurrentRequest({
          id: req.id,
          tractorMake: (req.tractors as any)?.make || 'Tractor',
          tractorModel: (req.tractors as any)?.model || '',
          categoryId: req.category_id,
          categoryName: (req.problem_categories as any)?.name_en || 'General Issue',
          description: req.description || '',
          voiceNoteUri: null,
          mediaUris: [],
          latitude: Number(req.latitude),
          longitude: Number(req.longitude),
          status: req.status as any,
        });
      }

      if (targetRequestId) {
        await checkStatus(targetRequestId);
      }
    }

    recoverAndListen();

    const interval = setInterval(async () => {
      let reqId = currentRequest?.id;
      if (!reqId) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', authData.user.id)
          .maybeSingle();
        if (!customer) return;
        const { data: req } = await supabase
          .from('repair_requests')
          .select('id')
          .eq('customer_id', customer.id)
          .in('status', ['requested', 'matching', 'assigned', 'no_mechanic_available', 'no_mechanic_found'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        reqId = req?.id;
      }
      if (reqId) {
        await checkStatus(reqId);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentRequest?.id]);

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this repair request?',
      [
        { text: 'Keep Searching', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            if (currentRequest?.id) {
              await supabase
                .from('repair_requests')
                .update({ status: 'cancelled' })
                .eq('id', currentRequest.id);
            }
            router.replace('/customer/(tabs)/home');
          },
        },
      ]
    );
  };

  useEffect(() => {
    const onBackPress = () => {
      handleCancel();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [currentRequest?.id]);

  const handleRetrySearch = async () => {
    if (!currentRequest?.id) return;
    setIsRetrying(true);
    setIsNoMechanicAvailable(false);
    try {
      await supabase
        .from('repair_requests')
        .update({ status: 'matching' })
        .eq('id', currentRequest.id);

      await supabase.functions.invoke('match-mechanic', {
        body: { requestId: currentRequest.id },
      });
    } catch (e) {
      console.warn('Retry match warning:', e);
    } finally {
      setIsRetrying(false);
    }
  };

  const speechText = isNoMechanicAvailable
    ? 'No mechanic is currently available in your area. You can retry the search or cancel the request.'
    : `Finding the nearest mechanic on ${APP_NAME}. If one cannot take the job, we will try the next nearest automatically.`;

  return (
    <View style={styles.container}>
      {/* Top Header with Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>{APP_NAME.toUpperCase()}</Text>
        <SpeechSpeaker text={speechText} label="Read screen" />
      </View>

      <View style={styles.content}>
        {isNoMechanicAvailable ? (
          /* No Mechanic Available Screen */
          <View style={styles.noMechanicBox}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="alert-circle" size={54} color="#D32F2F" />
            </View>
            <Text style={styles.noMechanicTitle}>NO MECHANIC AVAILABLE</Text>
            <Text style={styles.noMechanicSubtitle}>
              All nearby mechanics who handle this problem area are currently busy or offline.
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetrySearch}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>Retry Search</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancel}>
                <Text style={styles.cancelRequestBtnText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Radar Searching Animation (Page 4 of Prototype) */
          <>
            <View style={styles.radarContainer}>
              <Animated.View
                style={[
                  styles.radarPulse,
                  {
                    transform: [{ scale: pulseAnim1 }],
                    opacity: pulseOpacity1,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.radarPulse,
                  {
                    transform: [{ scale: pulseAnim2 }],
                    opacity: pulseOpacity2,
                  },
                ]}
              />
              <View style={styles.radarCore}>
                <Ionicons name="search" size={36} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.title}>FINDING THE NEAREST{'\n'}MECHANIC</Text>
            <Text style={styles.subtitle}>Searching{dots}</Text>
            <Text style={styles.hint}>
              If one can't take the job, we'll try the next nearest automatically.
            </Text>

            {/* Request Summary Card */}
            {currentRequest && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>YOUR REQUEST</Text>
                <Text style={styles.summaryTractorText}>
                  {currentRequest.tractorMake} {currentRequest.tractorModel} · {currentRequest.categoryName}
                </Text>
                <View style={styles.summaryLocationRow}>
                  <Ionicons name="location" size={16} color="#C63C14" />
                  <Text style={styles.summaryLocationText}>
                    GPS Pin: Current location
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {!isNoMechanicAvailable && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel request"
        >
          <Text style={styles.cancelButtonText}>Cancel request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C63C14',
    letterSpacing: 1.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  radarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  radarPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(198, 60, 20, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(198, 60, 20, 0.4)',
  },
  radarCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C63C14', // Terracotta core
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#C63C14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1816',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C63C14',
    textAlign: 'center',
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 28,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A857B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  summaryTractorText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1816',
    marginBottom: 6,
  },
  summaryLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLocationText: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    margin: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D32F2F',
  },
  noMechanicBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  alertIconWrap: {
    marginBottom: 12,
  },
  noMechanicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  noMechanicSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  actionRow: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#C63C14',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelRequestBtn: {
    borderWidth: 1.5,
    borderColor: '#999',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelRequestBtnText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
  },
});
