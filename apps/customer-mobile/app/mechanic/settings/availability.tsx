import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

const BRAND_COLOR = '#006376';
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';

export default function MechanicAvailabilityScreen() {
  const { isOnline, setIsOnline, mechanic, setMechanic } = useAuthStore();

  const handleToggleOnline = async (val: boolean) => {
    setIsOnline(val);

    if (mechanic?.id) {
      setMechanic({ ...mechanic, is_online: val });
      try {
        await supabase
          .from('mechanics')
          .update({ is_online: val, updated_at: new Date().toISOString() })
          .eq('id', mechanic.id);
      } catch (e) {
        console.warn('Error saving online status:', e);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Availability</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Live Status Card */}
        <View style={[styles.statusHero, isOnline ? styles.statusHeroOnline : styles.statusHeroOffline]}>
          <View style={styles.statusDotRow}>
            <View style={[styles.pulseDot, isOnline ? styles.pulseDotOnline : styles.pulseDotOffline]} />
            <Text style={styles.statusHeroLabel}>
              {isOnline ? 'ONLINE & RECEIVING CALLS' : 'OFFLINE (PAUSED)'}
            </Text>
          </View>
          <Text style={styles.statusHeroDesc}>
            {isOnline
              ? 'Your workshop radar is broadcasting. You will receive real-time audio alerts when farmers within your coverage radius need repairs.'
              : 'You are currently hidden from farmer searches and will not receive breakdown alerts until you toggle Online.'}
          </Text>
        </View>

        {/* Toggle Switch Card */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Accept Breakdown Assignments</Text>
              <Text style={styles.toggleSub}>
                Toggle ON when you are in your workshop or field-ready with your service kit.
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#CFD8DC', true: BRAND_COLOR }}
              thumbColor={isOnline ? '#FFFFFF' : '#ECEFF1'}
            />
          </View>
        </View>

        {/* Dispatch Rules & Best Practices */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>HOW DISPATCH TIMERS WORK</Text>

          <View style={styles.tipRow}>
            <Ionicons name="timer-outline" size={20} color={BRAND_COLOR} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>30-Second Response Window</Text>
              <Text style={styles.tipDesc}>
                When an emergency call matches your skills and radius, you have 30 seconds to tap Accept before the system routes it to the next nearest technician.
              </Text>
            </View>
          </View>

          <View style={styles.tipRow}>
            <Ionicons name="shield-outline" size={20} color={BRAND_COLOR} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Standardized ₹200 Visit Charge</Text>
              <Text style={styles.tipDesc}>
                Guaranteed minimum fee covers your travel to the farmer’s field even if the repair requires offsite parts.
              </Text>
            </View>
          </View>

          <View style={styles.tipRow}>
            <Ionicons name="pause-circle-outline" size={20} color={BRAND_COLOR} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Taking a Break?</Text>
              <Text style={styles.tipDesc}>
                Always toggle Offline when busy or after workshop hours to protect your acceptance rating.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_DARK,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    backgroundColor: BRAND_COLOR,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F4F7F8',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  statusHero: {
    borderRadius: 18,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statusHeroOnline: {
    backgroundColor: '#006376',
  },
  statusHeroOffline: {
    backgroundColor: '#455A64',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pulseDotOnline: {
    backgroundColor: '#00E676',
  },
  pulseDotOffline: {
    backgroundColor: '#B0BEC5',
  },
  statusHeroLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  statusHeroDesc: {
    fontSize: 13,
    color: '#E0F2F5',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#263238',
  },
  toggleSub: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 2,
    lineHeight: 16,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND_DARK,
    letterSpacing: 0.5,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 2,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#263238',
  },
  tipDesc: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 2,
    lineHeight: 16,
  },
});
