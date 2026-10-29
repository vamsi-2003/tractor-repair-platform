import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useJobStore } from '../../../store/jobStore';
import { formatCurrency } from '@tractor-repair/shared';

export default function HomeScreen() {
  const { profile, mechanic, isOnline, setIsOnline, serviceRadiusKm, setMechanic } = useAuthStore();
  const {
    todayEarnings,
    todayJobsCount,
    ratingAverage,
    platformFeeBalance,
    activeJob,
    setActiveJob,
    incomingRequest,
    payPlatformFee,
    loadMechanicData,
  } = useJobStore();

  const [isPayModalVisible, setPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState(platformFeeBalance.toString());
  const [isPaying, setIsPaying] = useState(false);

  // Resolve authenticated mechanic record
  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (!mechanic && user?.id) {
      (async () => {
        try {
          const { data: myMech } = await supabase
            .from('mechanics')
            .select('*')
            .eq('profile_id', user.id)
            .maybeSingle();
          if (myMech) {
            setMechanic(myMech);
            setIsOnline(myMech.is_online ?? false);
          }
        } catch (e) {
          console.warn('Notice loading mechanic record:', e);
        }
      })();
    }
  }, [mechanic]);

  // Auto-load mechanic data (earnings, completed jobs, rating, balances)
  useEffect(() => {
    if (mechanic?.id) {
      loadMechanicData(mechanic.id);
    }
  }, [mechanic?.id]);

  // Auto-hydrate active job from Supabase continuously
  useEffect(() => {
    let isMounted = true;

    const syncActiveJob = async () => {
      try {
        let query = supabase
          .from('jobs')
          .select('id, request_id, status, customer_id, mechanic_id')
          .not('status', 'in', '("completed","cancelled")');

        if (mechanic?.id) {
          query = query.eq('mechanic_id', mechanic.id);
        }

        const { data: job } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        if (job) {
          // If already set to this job and status, skip duplicate hydration
          const currentActive = useJobStore.getState().activeJob;
          if (currentActive?.id === job.id && currentActive?.status === job.status) {
            return;
          }

          const { data: req } = await supabase
            .from('repair_requests')
            .select(`
              *,
              tractors ( make, model, year, registration_number ),
              problem_categories ( name_en )
            `)
            .eq('id', job.request_id)
            .maybeSingle();

          let custName = 'Customer';
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
                custPhone = p.phone || custPhone;
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
            visitFee: 0,
            laborCost: 0,
            partsEstimate: 0,
            total: 0,
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
        } else {
          const currentActive = useJobStore.getState().activeJob;
          if (currentActive && currentActive.status !== 'completed' && currentActive.status !== 'cancelled') {
            setActiveJob(null);
          }
        }
      } catch (e) {
        console.warn('Error hydrating mechanic active job:', e);
      }
    };

    syncActiveJob();
    const jobInterval = setInterval(syncActiveJob, 2500);

    const jobChannel = supabase
      .channel('public:jobs:active')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => syncActiveJob()
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(jobInterval);
      supabase.removeChannel(jobChannel);
    };
  }, [mechanic?.id]);

  // Radar pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.45,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.7,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.7);
    }
  }, [isOnline]);

  // If incoming request arrives, immediately route to incoming request screen
  useEffect(() => {
    if (incomingRequest) {
      router.push('/mechanic/job/incoming-request');
    }
  }, [incomingRequest]);

  // Listen / poll for incoming repair requests when online & available
  useEffect(() => {
    if ((activeJob && activeJob.status !== 'completed' && activeJob.status !== 'cancelled') || incomingRequest) return;

    let isMounted = true;

    const checkIncoming = async () => {
      try {
        const { data: requests, error } = await supabase
          .from('repair_requests')
          .select(`
            id,
            customer_id,
            category_id,
            description,
            voice_note_url,
            latitude,
            longitude,
            address_text,
            status,
            created_at,
            tractors ( make, model, year, registration_number ),
            problem_categories ( id, name_en ),
            customers (
              id,
              profile:profiles ( full_name, phone, avatar_url )
            )
          `)
          .in('status', ['requested', 'matching'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !requests || requests.length === 0 || !isMounted) return;

        const req = requests[0];

        // Calculate approximate distance
        let distKm = 2.0;
        if (req.latitude && req.longitude) {
          const mechLat = 16.9885;
          const mechLon = 79.9689;
          const dLat = ((Number(req.latitude) - mechLat) * Math.PI) / 180;
          const dLon = ((Number(req.longitude) - mechLon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((mechLat * Math.PI) / 180) *
              Math.cos((Number(req.latitude) * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distKm = Math.round(6371 * c * 10) / 10;
        }

        // Fetch attached photos if available
        const { data: media } = await supabase
          .from('request_media')
          .select('file_path, media_type')
          .eq('request_id', req.id);

        const photoUrls = (media || [])
          .filter((m: any) => m.media_type === 'photo')
          .map((m: any) => supabase.storage.from('request-media').getPublicUrl(m.file_path).data.publicUrl);

        const cust = req.customers as any;
        const profileData = cust?.profile;
        const tractor = req.tractors as any;
        const category = req.problem_categories as any;

        const incoming = {
          id: req.id,
          requestId: req.id,
          distanceKm: distKm,
          etaMinutes: Math.max(5, Math.round(distKm * 2.5)),
          customerName: profileData?.full_name || 'Farmer (Customer)',
          customerPhone: profileData?.phone || '',
          customerArea: req.address_text || 'Nearby Village',
          village: '',
          mandal: '',
          district: '',
          latitude: Number(req.latitude || 0),
          longitude: Number(req.longitude || 0),
          tractorMake: tractor?.make || 'Tractor',
          tractorModel: tractor?.model || '',
          tractorYear: tractor?.year ? Number(tractor.year) : undefined,
          problemCategoryId: req.category_id,
          problemCategoryName: category?.name_en || 'Tractor Repair',
          reportedProblem: req.description || 'Tractor inspection & repair required',
          photoUrls,
          voiceNoteUrl: req.voice_note_url || null,
          expiresAt: new Date(Date.now() + 30000).toISOString(),
          secondsRemaining: 30,
        };

        if (isMounted) {
          useJobStore.getState().setIncomingRequest(incoming);
        }
      } catch (err) {
        console.warn('Error checking incoming requests:', err);
      }
    };

    // Check immediately
    checkIncoming();

    // Poll every 3 seconds while online & idle
    const interval = setInterval(checkIncoming, 3000);

    // Listen to real-time changes
    const channel = supabase
      .channel('mechanic-incoming-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_requests' },
        () => {
          checkIncoming();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isOnline, activeJob, incomingRequest, serviceRadiusKm]);

  const handleToggleOnline = async (value: boolean) => {
    if (mechanic?.status === 'pending_approval' || mechanic?.status === 'pending') {
      Alert.alert(
        'Account Pending Approval',
        'Your mechanic partner profile is currently under review by our admin team. You will be able to go online and receive repair jobs once approved.'
      );
      return;
    }

    if (platformFeeBalance >= 1000 && value) {
      Alert.alert(
        'Platform Fee Due',
        `Your outstanding cash fee balance is ${formatCurrency(platformFeeBalance)}. Please pay your balance down below ₹1,000 to accept new requests.`,
        [
          { text: 'Pay Now', onPress: () => setPayModalVisible(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (value) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (mechanic?.id) {
            await supabase.rpc('update_mechanic_location', {
              p_mechanic_id: mechanic.id,
              p_latitude: loc.coords.latitude,
              p_longitude: loc.coords.longitude,
              p_is_online: true,
            });
          }
        } else {
          Alert.alert('Permission Denied', 'Location permission is required for live GPS dispatch.');
          return;
        }
      } catch (err) {
        console.warn('GPS location fetch error:', err);
      }
    } else {
      if (mechanic?.id) {
        try {
          await supabase
            .from('mechanics')
            .update({
              is_online: false,
            })
            .eq('id', mechanic.id);
        } catch (err) {
          console.warn('Error setting offline:', err);
        }
      }
    }

    setIsOnline(value);
  };

  const handleConfirmPay = async () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    setIsPaying(true);
    await payPlatformFee(amt);
    setIsPaying(false);
    setPayModalVisible(false);

    Alert.alert('Payment Successful', `${formatCurrency(amt)} settled towards your platform commission balance.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Pending Approval Checklist Banner (Page 10 of Prototype) */}
      {(mechanic?.status === 'pending_approval' || mechanic?.status === 'pending') && (
        <View style={styles.pendingApprovalCard}>
          <View style={styles.pendingHeader}>
            <Ionicons name="time" size={22} color="#E65100" />
            <Text style={styles.pendingTitle}>APPLICATION PENDING APPROVAL</Text>
          </View>
          <Text style={styles.pendingSubtitle}>
            Our operations team is currently verifying your workshop address and ID documents.
          </Text>
          <View style={styles.checklistRow}>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#00C853" />
              <Text style={styles.checkItemText}>Mobile Verified</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={16} color="#00C853" />
              <Text style={styles.checkItemText}>ID Uploaded</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="hourglass" size={16} color="#E65100" />
              <Text style={[styles.checkItemText, { color: '#E65100', fontWeight: '800' }]}>Team Approval: Pending</Text>
            </View>
          </View>
        </View>
      )}

      {/* Top Status & Online/Offline Bar */}
      <View style={[styles.statusCard, isOnline ? styles.statusOnline : styles.statusOffline]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#00E676' : '#FF5252' }]} />
          <View>
            <Text style={styles.statusTitle}>
              {isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isOnline
                ? `Receiving calls within ${serviceRadiusKm} km`
                : 'Turn ON to receive repair requests'}
            </Text>
          </View>
        </View>

        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#00E676' }}
          thumbColor={isOnline ? '#FFFFFF' : '#B0BEC5'}
        />
      </View>

      {/* Ongoing Active Job Banner (if exists) */}
      {activeJob && (
        <TouchableOpacity
          style={styles.activeJobBanner}
          onPress={() => router.push(activeJob.status === 'work_completed' || activeJob.status === 'repair_completed' ? '/mechanic/job/finish-job' : '/mechanic/job/active-job')}
          activeOpacity={0.85}
        >
          <View style={styles.activeJobIcon}>
            <Ionicons name="construct" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeJobBadge}>ACTIVE JOB IN PROGRESS</Text>
            <Text style={styles.activeJobCustomer}>
              {activeJob.customer.name} • {activeJob.tractor.make} {activeJob.tractor.model}
            </Text>
            <Text style={styles.activeJobStatus}>
              Status: {activeJob.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={28} color="#FFB300" />
        </TouchableOpacity>
      )}

      {/* Today's KPI Metrics */}
      <Text style={styles.sectionHeader}>TODAY'S OVERVIEW</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiIconWrap}>
            <Ionicons name="cash" size={20} color="#00C853" />
          </View>
          <Text style={styles.kpiLabel}>Today's Earnings</Text>
          <Text style={styles.kpiValue}>{formatCurrency(todayEarnings)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
            <Ionicons name="build" size={20} color="#2196F3" />
          </View>
          <Text style={styles.kpiLabel}>Jobs Completed</Text>
          <Text style={styles.kpiValue}>{todayJobsCount}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(255, 179, 0, 0.15)' }]}>
            <Ionicons name="star" size={20} color="#FFA000" />
          </View>
          <Text style={styles.kpiLabel}>Rating</Text>
          <Text style={styles.kpiValue}>★ {ratingAverage.toFixed(1)}</Text>
        </View>
      </View>

      {/* Platform Fee Liability Card */}
      <View style={styles.feeCard}>
        <View style={styles.feeHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="receipt-outline" size={20} color="#1E3A5F" />
            <Text style={styles.feeTitle}>Platform Fee Balance (Cash Jobs)</Text>
          </View>
          <View style={[styles.feeStatusBadge, platformFeeBalance >= 1000 && styles.feeLimitAlert]}>
            <Text style={styles.feeStatusText}>
              {platformFeeBalance >= 1000 ? 'Limit Exceeded' : 'Active'}
            </Text>
          </View>
        </View>

        <View style={styles.feeBody}>
          <View>
            <Text style={styles.feeAmount}>{formatCurrency(platformFeeBalance)}</Text>
            <Text style={styles.feeSubtext}>10% commission due on completed cash repairs</Text>
          </View>

          <TouchableOpacity
            style={styles.payNowButton}
            onPress={() => {
              setPayAmount(platformFeeBalance.toString());
              setPayModalVisible(true);
            }}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.payNowText}>Pay Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.feeNote}>
          Notice: Keep balance under {formatCurrency(1000)} to keep receiving high-priority requests.
        </Text>
      </View>

      {/* If Active Job exists, show prominent Dispatch Mission Card. Otherwise show Radar Scanning */}
      {activeJob ? (
        <View style={styles.activeMissionCard}>
          <View style={styles.missionHeader}>
            <View style={styles.missionLivePill}>
              <View style={styles.missionLiveDot} />
              <Text style={styles.missionLiveText}>ACTIVE REPAIR ASSIGNED</Text>
            </View>
            <Text style={styles.missionStatus}>
              {activeJob.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>

          <View style={styles.missionBody}>
            <View style={styles.missionTractorRow}>
              <View style={styles.missionTractorIcon}>
                <Ionicons name="construct" size={26} color="#FFB300" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.missionTractorTitle}>
                  {activeJob.tractor.make} {activeJob.tractor.model}
                </Text>
                <Text style={styles.missionCategory}>
                  Issue: {activeJob.problem.categoryName}
                </Text>
              </View>
            </View>

            <View style={styles.missionDivider} />

            <View style={styles.missionInfoRow}>
              <Ionicons name="person-circle" size={20} color="#1E3A5F" />
              <Text style={styles.missionFarmerName}>
                Farmer: {activeJob.customer.name}
              </Text>
              {activeJob.customer.phone ? (
                <Text style={styles.missionFarmerPhone}>• {activeJob.customer.phone}</Text>
              ) : null}
            </View>

            <View style={styles.missionInfoRow}>
              <Ionicons name="location" size={20} color="#D32F2F" />
              <Text style={styles.missionAddress} numberOfLines={2}>
                {activeJob.customer.address || 'Field Location'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.missionActionBtn}
            onPress={() => router.push(activeJob.status === 'work_completed' || activeJob.status === 'repair_completed' ? '/mechanic/job/finish-job' : '/mechanic/job/active-job')}
            activeOpacity={0.88}
          >
            <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" />
            <Text style={styles.missionActionBtnText}>
              OPEN ACTIVE JOB & ENTER START CODE
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Live Radar / Searching Section */
        <View style={styles.radarCard}>
          <View style={styles.radarCircleContainer}>
            {isOnline && (
              <Animated.View
                style={[
                  styles.radarPulseCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.radarCenterCircle,
                { backgroundColor: isOnline ? '#1E3A5F' : '#9E9E9E' },
              ]}
            >
              <Ionicons
                name={isOnline ? 'radio' : 'radio-outline'}
                size={36}
                color={isOnline ? '#00E676' : '#FFFFFF'}
              />
            </View>
          </View>

          <Text style={styles.radarTitle}>
            {isOnline ? 'Waiting for Requests Near You' : 'You are currently Offline'}
          </Text>
          <Text style={styles.radarSubtitle}>
            {isOnline
              ? `Scanning for farmers within ${serviceRadiusKm} km of your workshop in ${mechanic?.workshop_address || 'your area'}. You will receive a loud 30-second notification.`
              : 'Switch to Online to appear on the farmers’ map and start receiving tractor repair assignments.'}
          </Text>
        </View>
      )}

      {/* Quick Action Navigation */}
      <Text style={styles.sectionHeader}>QUICK SHORTCUTS</Text>
      <View style={styles.shortcutsRow}>
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => router.push('/mechanic/(tabs)/history')}
        >
          <Ionicons name="list" size={24} color="#1E3A5F" />
          <Text style={styles.shortcutTitle}>Job History</Text>
          <Text style={styles.shortcutSub}>View past repairs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => router.push('/mechanic/(tabs)/earnings')}
        >
          <Ionicons name="trending-up" size={24} color="#1E3A5F" />
          <Text style={styles.shortcutTitle}>Settlements</Text>
          <Text style={styles.shortcutSub}>Payouts & UPI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => router.push('/mechanic/(tabs)/profile')}
        >
          <Ionicons name="options" size={24} color="#1E3A5F" />
          <Text style={styles.shortcutTitle}>Radius & Skills</Text>
          <Text style={styles.shortcutSub}>Edit coverage</Text>
        </TouchableOpacity>
      </View>

      {/* Pay Platform Fee Modal */}
      <Modal
        visible={isPayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settle Platform Fee</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Outstanding Balance:</Text>
            <Text style={styles.modalBalance}>{formatCurrency(platformFeeBalance)}</Text>

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>Amount to Pay (₹):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <View style={styles.upiBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#2E7D32" />
              <Text style={styles.upiBadgeText}>Pay securely via UPI (GPay / PhonePe / Paytm)</Text>
            </View>

            <TouchableOpacity
              style={styles.modalPayBtn}
              onPress={handleConfirmPay}
              disabled={isPaying}
            >
              {isPaying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPayBtnText}>Pay {formatCurrency(parseFloat(payAmount) || 0)}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  pendingApprovalCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFE0B2',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E65100',
    letterSpacing: 0.5,
  },
  pendingSubtitle: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
    marginBottom: 10,
  },
  checklistRow: {
    gap: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkItemText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#1E3A5F',
  },
  statusOffline: {
    backgroundColor: '#455A64',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  statusSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  activeJobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D47A1',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#FFB300',
  },
  activeJobIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeJobBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB300',
    letterSpacing: 1,
  },
  activeJobCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeJobStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#546E7A',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 4,
  },
  feeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
  },
  feeStatusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  feeLimitAlert: {
    backgroundColor: '#FFEBEE',
  },
  feeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  feeBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#E65100',
  },
  feeSubtext: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E65100',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  payNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feeNote: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    paddingTop: 8,
  },
  radarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
  },
  radarCircleContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  radarPulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 230, 118, 0.25)',
  },
  radarCenterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  radarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 6,
  },
  radarSubtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 18,
  },
  simulateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB300',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 8,
  },
  shortcutSub: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  modalLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  modalBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E65100',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    color: '#1A202C',
  },
  upiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginVertical: 16,
  },
  upiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  modalPayBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPayBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFB300',
  },
  activeMissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#00C853',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  missionLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  missionLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C853',
  },
  missionLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: 0.5,
  },
  missionStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  missionBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  missionTractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missionTractorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionTractorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  missionCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 2,
  },
  missionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  missionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  missionFarmerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  missionFarmerPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  missionAddress: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  missionActionBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  missionActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
