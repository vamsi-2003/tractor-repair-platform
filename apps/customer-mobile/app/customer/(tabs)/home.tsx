import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useRepairStore } from '../../../store/repairStore';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { OfflineBanner } from '../../../components/OfflineBanner';
import { TractorSelectorModal } from '../../../components/TractorSelectorModal';
import { APP_NAME } from '@tractor-repair/shared';

interface TractorItem {
  id: string;
  make: string;
  model: string;
  year?: number;
  registrationNumber?: string;
}

interface RequestItem {
  id: string;
  status: string;
  created_at: string;
  description: string | null;
  tractors?: { make: string; model: string };
  problem_categories?: { name_en: string };
}

export default function CustomerHomeScreen() {
  const { user, profile } = useAuthStore();
  const { setCurrentRequest } = useRepairStore();

  const [tractors, setTractors] = useState<TractorItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTractorModalOpen, setIsTractorModalOpen] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, [user?.id]);

  const loadHomeData = async () => {
    setIsLoading(true);
    try {
      const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', currentUserId)
        .maybeSingle();

      if (!customer) {
        setIsLoading(false);
        return;
      }

      // 2. Fetch saved tractors
      const { data: tractorList } = await supabase
        .from('tractors')
        .select('id, make, model, year, registration_number')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (tractorList) {
        setTractors(
          tractorList.map((t) => ({
            id: t.id,
            make: t.make,
            model: t.model,
            year: t.year ? Number(t.year) : undefined,
            registrationNumber: t.registration_number || undefined,
          }))
        );
      }

      // 3. Fetch repair requests history
      const { data: requestList } = await supabase
        .from('repair_requests')
        .select(`
          id,
          status,
          created_at,
          description,
          tractors ( make, model ),
          problem_categories ( name_en )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (requestList) {
        setRequests(requestList as any);
        const active = requestList.find((r) =>
          ['requested', 'matching', 'assigned', 'started', 'quote_sent', 'quote_approved', 'in_progress', 'repair_in_progress', 'bill_ready'].includes(r.status)
        );
        setActiveRequest(active as any || null);
      }
    } catch (e) {
      console.warn('Error loading customer home data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenActiveRequest = (req: RequestItem) => {
    setCurrentRequest({
      id: req.id,
      tractorMake: req.tractors?.make || 'Tractor',
      tractorModel: req.tractors?.model || '',
      categoryId: '',
      categoryName: req.problem_categories?.name_en || 'Repair',
      description: req.description || '',
      voiceNoteUri: null,
      mediaUris: [],
      latitude: 0,
      longitude: 0,
      status: req.status as any,
    });

    if (req.status === 'requested' || req.status === 'matching') {
      router.push('/customer/request/finding-mechanic');
    } else if (req.status === 'assigned' || req.status === 'started' || req.status === 'repair_in_progress') {
      router.push('/customer/request/mechanic-assigned');
    } else if (req.status === 'quote_sent' || req.status === 'quote_submitted') {
      router.push('/customer/request/quote-approval');
    } else if (req.status === 'bill_ready' || req.status === 'payment_pending') {
      router.push('/customer/request/bill');
    } else {
      router.push('/customer/request/mechanic-assigned');
    }
  };

  const speechText = `Welcome to ${APP_NAME}. You can request a repair, view your saved tractors, or check your repair history.`;

  return (
    <View style={styles.screenWrapper}>
      <OfflineBanner />
      {/* Top Header Bar with Language Toggle & Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
          <Text style={styles.welcomeText}>Welcome, {profile?.full_name || 'Farmer'}</Text>
        </View>
        <View style={styles.headerActions}>
          <LanguageToggle />
          <SpeechSpeaker text={speechText} label="Read screen" />
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Active Job in Progress Alert Card (if any) */}
        {activeRequest && (
          <TouchableOpacity
            style={styles.activeRequestCard}
            onPress={() => handleOpenActiveRequest(activeRequest)}
            activeOpacity={0.88}
          >
            <View style={styles.activeIconWrap}>
              <Ionicons name="construct" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.activeStatusRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.activeStatusBadge}>
                  {activeRequest.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.activeTractorTitle}>
                {activeRequest.tractors?.make} {activeRequest.tractors?.model}
              </Text>
              <Text style={styles.activeCategorySub}>
                {activeRequest.problem_categories?.name_en || 'Tractor Issue'} • Tap to view tracking
              </Text>
            </View>
            <Ionicons name="chevron-forward-circle" size={26} color="#C63C14" />
          </TouchableOpacity>
        )}

        {/* Big New Repair Request Button (Terracotta #C63C14 matching prototype) */}
        <TouchableOpacity
          style={styles.newRequestHero}
          onPress={() => router.push('/customer/request/new')}
          accessibilityRole="button"
          accessibilityLabel="Request nearest mechanic"
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="search" size={28} color="#C63C14" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Request a Mechanic</Text>
              <Text style={styles.heroSubtitle}>
                GPS dispatch connects you to the nearest verified tractor mechanic in minutes
              </Text>
            </View>
          </View>
          <View style={styles.heroActionBtn}>
            <Text style={styles.heroActionBtnText}>START REQUEST</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Saved Tractors Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>SAVED TRACTORS</Text>
          <TouchableOpacity
            style={styles.addTractorBtn}
            onPress={() => setIsTractorModalOpen(true)}
          >
            <Ionicons name="add" size={16} color="#C63C14" />
            <Text style={styles.addTractorBtnText}>Add Tractor</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#C63C14" style={{ marginVertical: 16 }} />
        ) : tractors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={32} color="#AAA" />
            <Text style={styles.emptyTitle}>No saved tractors yet</Text>
            <Text style={styles.emptySub}>
              Save your tractor make & model for instant 1-tap repair requests.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setIsTractorModalOpen(true)}
            >
              <Text style={styles.emptyActionBtnText}>+ Add My Tractor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tractorGrid}>
            {tractors.map((t) => (
              <View key={t.id} style={styles.tractorCard}>
                <View style={styles.tractorCardIcon}>
                  <Ionicons name="construct" size={20} color="#C63C14" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tractorCardTitle}>{t.make} {t.model}</Text>
                  {t.year && <Text style={styles.tractorCardSub}>Year: {t.year}</Text>}
                  {t.registrationNumber && (
                    <Text style={styles.tractorCardReg}>Reg: {t.registrationNumber}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Repair Request History Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>REQUEST HISTORY</Text>
          <TouchableOpacity onPress={() => router.push('/customer/(tabs)/history')}>
            <Text style={styles.viewAllLink}>View all</Text>
          </TouchableOpacity>
        </View>

        {requests.length === 0 && !isLoading ? (
          <View style={styles.emptyCard}>
            <Ionicons name="time-outline" size={32} color="#AAA" />
            <Text style={styles.emptyTitle}>No past repairs</Text>
            <Text style={styles.emptySub}>
              When you submit a request, its live status and receipts will show here.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {requests.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyCard}
                onPress={() => handleOpenActiveRequest(item)}
              >
                <View style={styles.historyTopRow}>
                  <Text style={styles.historyTractorName}>
                    {item.tractors?.make || 'Tractor'} {item.tractors?.model || ''}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === 'completed'
                        ? styles.statusPillGreen
                        : item.status === 'cancelled' || item.status === 'quote_declined'
                        ? styles.statusPillRed
                        : styles.statusPillOrange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.status === 'completed'
                          ? styles.statusTextGreen
                          : item.status === 'cancelled' || item.status === 'quote_declined'
                          ? styles.statusTextRed
                          : styles.statusTextOrange,
                      ]}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.historyCategory}>
                  Issue: {item.problem_categories?.name_en || 'General Issue'}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Tractor Modal */}
      <TractorSelectorModal
        visible={isTractorModalOpen}
        onClose={() => {
          setIsTractorModalOpen(false);
          loadHomeData();
        }}
        onSelectTractor={() => {
          setIsTractorModalOpen(false);
          loadHomeData();
        }}
      />
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6DF',
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C63C14',
    letterSpacing: 1.5,
  },
  welcomeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  activeRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C63C14',
    gap: 12,
    elevation: 2,
  },
  activeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C63C14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C63C14',
  },
  activeStatusBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C63C14',
    letterSpacing: 0.8,
  },
  activeTractorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1816',
    marginTop: 2,
  },
  activeCategorySub: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  newRequestHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    elevation: 3,
    shadowColor: '#C63C14',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  heroLeft: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1A1816',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  heroActionBtn: {
    backgroundColor: '#C63C14', // Terracotta primary action
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  heroActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A857B',
    letterSpacing: 1.2,
  },
  addTractorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTractorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C63C14',
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C63C14',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E6DF',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#444',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#FDEEE9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#C63C14',
    fontSize: 13,
    fontWeight: '700',
  },
  tractorGrid: {
    gap: 10,
    marginBottom: 18,
  },
  tractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    gap: 12,
  },
  tractorCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tractorCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1816',
  },
  tractorCardSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  tractorCardReg: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTractorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1816',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillGreen: {
    backgroundColor: '#E8F5E9',
  },
  statusPillRed: {
    backgroundColor: '#FFEBEE',
  },
  statusPillOrange: {
    backgroundColor: '#FFF3E0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextGreen: {
    color: '#2E7D32',
  },
  statusTextRed: {
    color: '#D32F2F',
  },
  statusTextOrange: {
    color: '#E65100',
  },
  historyCategory: {
    fontSize: 13,
    color: '#555',
  },
  historyDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
});
