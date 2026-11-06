import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import type { Language } from '@tractor-repair/shared';

// Casal Mechanic Brand Palette
const BRAND_COLOR = '#006376';
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';
const CARD_BG = '#FFFFFF';

const LANGUAGES = [
  { code: 'en' as Language, label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'te' as Language, label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi' as Language, label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn' as Language, label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta' as Language, label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
];

export default function MechanicSettingsConsoleScreen() {
  const {
    profile,
    mechanic,
    user,
    isOnline,
    language,
    logout,
  } = useAuthStore();

  const activeLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Pressing back on Settings console returns to Partner Home
  useEffect(() => {
    const onBackPress = () => {
      router.replace('/mechanic/(tabs)/home');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out from Mechanic Partner Console?')) {
        await logout();
        router.replace('/auth/sign-in');
      }
      return;
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from Mechanic Partner Console?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/sign-in');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ─── Profile Header Summary Card ─── */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="construct" size={32} color="#FFFFFF" />
              </View>
            )}
            <View style={[styles.badgeOnlineDot, { backgroundColor: isOnline ? '#00E676' : '#90A4AE' }]} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.mechanicName}>{profile?.full_name || 'Certified Mechanic'}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#00E676" />
            </View>
            <Text style={styles.mechanicPhone}>{profile?.phone || user?.phone || '+91 9999999902'}</Text>
            <Text style={styles.mechanicEmail}>{user?.email || ''}</Text>

            <View style={styles.statsPillRow}>
              <View style={styles.statMiniPill}>
                <Ionicons name="star" size={13} color="#FFA000" />
                <Text style={styles.statMiniText}>
                  {Number(mechanic?.rating_avg || 5.0).toFixed(1)} Rating
                </Text>
              </View>
              <View style={styles.statMiniPill}>
                <Ionicons name="ribbon" size={13} color="#3AAEEB" />
                <Text style={styles.statMiniText}>
                  {mechanic?.experience_years ?? 5} Yrs Exp
                </Text>
              </View>
              <View style={styles.statMiniPill}>
                <Ionicons name="checkmark-done" size={13} color="#00E676" />
                <Text style={styles.statMiniText}>
                  {mechanic?.total_jobs ?? 0} Jobs Done
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workshop Address snippet */}
        <View style={styles.addressBox}>
          <Ionicons name="business-outline" size={15} color="rgba(255,255,255,0.7)" />
          <Text style={styles.addressText} numberOfLines={1}>
            {mechanic?.workshop_address || 'Workshop premises, Rural Area'}
          </Text>
        </View>
      </View>

      {/* ─── Settings Navigation Rows ─── */}
      <Text style={styles.sectionHeading}>PARTNER SETTINGS & CONTROLS</Text>

      <View style={styles.card}>
        {/* 1. Profile Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/mechanic/settings/profile-edit')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="person-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Profile & Workshop Details</Text>
              <Text style={styles.navSub}>Name, phone, address, experience & email</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 2. Verification Documents Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/mechanic/settings/documents')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="document-text-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Verification Documents</Text>
              <Text style={styles.navSub}>Aadhaar ID, trade certificates & workshop photos</Text>
            </View>
          </View>
          <View style={styles.badgeSuccess}>
            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
            <Text style={styles.badgeSuccessText}>VERIFIED</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 3. Repair Skills & Add Skills Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/mechanic/settings/skills')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="construct-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Active Repair Skills</Text>
              <Text style={styles.navSub}>Engine, hydraulics, clutch, tyres + add custom skills</Text>
            </View>
          </View>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeNeutralText}>ALL SKILLS</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 4. Service Radius & Coverage Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/mechanic/settings/radius')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="navigate-circle-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Service Radius & Coverage</Text>
              <Text style={styles.navSub}>Emergency breakdown distance from workshop</Text>
            </View>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{mechanic?.service_radius_km ?? 35} km</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 5. Service Availability Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/mechanic/settings/availability')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="radio-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Service Availability</Text>
              <Text style={styles.navSub}>Online receiving status & emergency dispatch</Text>
            </View>
          </View>
          <View
            style={[
              styles.badgeStatus,
              { backgroundColor: isOnline ? '#E8F5E9' : '#ECEFF1' },
            ]}
          >
            <Text
              style={[
                styles.badgeStatusText,
                { color: isOnline ? '#2E7D32' : '#546E7A' },
              ]}
            >
              {isOnline ? 'ONLINE' : 'PAUSED'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 6. App Language Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/language')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="globe-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.navTitle}>App Language</Text>
                <Text style={{ fontSize: 16 }}>{activeLangObj.flag}</Text>
              </View>
              <Text style={styles.navSub}>
                {activeLangObj.native} ({activeLangObj.label})
              </Text>
            </View>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{activeLangObj.label.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 7. About Tractor Seva Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="information-circle-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>About Tractor Seva</Text>
              <Text style={styles.navSub}>Partner mission, safety guarantee & rural mobility</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 8. Delete Account (Google Play Policy §4.8) */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/account-delete')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={[styles.navIconCircle, { backgroundColor: '#3B181E' }]}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navTitle, { color: '#FF6B6B' }]}>Delete Account</Text>
              <Text style={styles.navSub}>Deactivate partner profile & erase personal data</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* ─── Sign Out Button ─── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
        <Text style={styles.logoutBtnText}>Sign Out from Partner Console</Text>
      </TouchableOpacity>

      {/* ─── Explicit Footer ─── */}
      <Text style={styles.footerInfo}>Tractor Seva Partner Console • v1.2.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F282D',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  profileCard: {
    backgroundColor: '#004957',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#006376',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#3AAEEB',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#006376',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3AAEEB',
  },
  badgeOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#004957',
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mechanicPhone: {
    fontSize: 13,
    color: '#E0F2F5',
    marginTop: 2,
    fontWeight: '500',
  },
  mechanicEmail: {
    fontSize: 11,
    color: '#B2D8DE',
    marginTop: 1,
  },
  statsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  statMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statMiniText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  addressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B2D8DE',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#263238',
  },
  navSub: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginRight: 6,
  },
  badgeSuccessText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  badgeNeutral: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeNeutralText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#546E7A',
  },
  badgePill: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    marginRight: 6,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND_COLOR,
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  logoutBtnText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '800',
  },
  footerInfo: {
    textAlign: 'center',
    fontSize: 12,
    color: '#78909C',
    marginTop: 12,
    fontWeight: '600',
  },
});
