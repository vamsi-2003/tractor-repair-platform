import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { APP_NAME } from '@tractor-repair/shared';

export default function ProfileScreen() {
  const {
    profile,
    mechanic,
    skills,
    documents,
    verification,
    serviceRadiusKm,
    setServiceRadiusKm,
    isOnline,
    setIsOnline,
    language,
    logout,
  } = useAuthStore();

  const [radiusInput, setRadiusInput] = useState(serviceRadiusKm.toString());
  const [isEditingRadius, setIsEditingRadius] = useState(false);

  const handleSaveRadius = () => {
    const val = parseInt(radiusInput, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      Alert.alert('Invalid Radius', 'Please enter a valid radius between 1 and 100 km.');
      return;
    }
    setServiceRadiusKm(val);
    setIsEditingRadius(false);
    Alert.alert('Updated', `Your dispatch service radius is now set to ${val} km.`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of your Mechanic Partner account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/auth/sign-in');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={36} color="#FFB300" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.mechanicName}>{profile?.full_name || 'Mechanic Partner'}</Text>
              {profile?.full_name && <Ionicons name="checkmark-circle" size={18} color="#00C853" />}
            </View>
            <Text style={styles.mechanicPhone}>{profile?.phone || 'Phone not set'}</Text>
            <Text style={styles.mechanicExp}>
              {mechanic?.experience_years ? `${mechanic.experience_years} Years Experience` : 'Experience not set'} • {mechanic?.rating_avg ? `${mechanic.rating_avg} ★ Rating` : 'No ratings yet'}
            </Text>
          </View>
        </View>

        <View style={styles.addressBox}>
          <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.addressText}>
            {mechanic?.workshop_address || 'Workshop address not set'}
          </Text>
        </View>
      </View>

      {/* Verification Checklist Badges */}
      <Text style={styles.sectionTitle}>VERIFICATION & APPROVAL STATUS</Text>
      <View style={styles.verificationCard}>
        <View style={styles.badgeItem}>
          <Ionicons
            name={verification.mobileVerified ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={verification.mobileVerified ? '#00C853' : '#FF9800'}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeName}>Mobile OTP Verification</Text>
            <Text style={styles.badgeSub}>
              {verification.mobileVerified ? 'Verified & Active' : 'Pending verification'}
            </Text>
          </View>
          <View style={styles.statusPillGreen}>
            <Text style={styles.statusPillText}>VERIFIED</Text>
          </View>
        </View>

        <View style={styles.badgeItem}>
          <Ionicons
            name={verification.idUploaded ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={verification.idUploaded ? '#00C853' : '#FF9800'}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeName}>Government ID & Certificate</Text>
            <Text style={styles.badgeSub}>
              {documents[0]?.document_type
                ? `${documents[0].document_type.toUpperCase()} (${documents[0].document_number || 'Uploaded'})`
                : 'Aadhaar / Driving License'}
            </Text>
          </View>
          <View style={styles.statusPillGreen}>
            <Text style={styles.statusPillText}>UPLOADED</Text>
          </View>
        </View>

        <View style={[styles.badgeItem, { borderBottomWidth: 0 }]}>
          <Ionicons
            name={verification.approvalStatus === 'approved' ? 'shield-checkmark' : 'time'}
            size={22}
            color={verification.approvalStatus === 'approved' ? '#00C853' : '#FFB300'}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeName}>Admin Marketplace Approval</Text>
            <Text style={styles.badgeSub}>Verified service partner status</Text>
          </View>
          <View
            style={
              verification.approvalStatus === 'approved'
                ? styles.statusPillGreen
                : styles.statusPillAmber
            }
          >
            <Text style={styles.statusPillText}>
              {verification.approvalStatus.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Dispatch Service Radius Setting */}
      <Text style={styles.sectionTitle}>SERVICE RADIUS & COVERAGE</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Dispatch Search Radius</Text>
            <Text style={styles.settingSub}>
              You will receive emergency breakdown assignments within this distance from your workshop.
            </Text>
          </View>

          <View style={styles.radiusPill}>
            <Text style={styles.radiusPillText}>{serviceRadiusKm} km</Text>
          </View>
        </View>

        {isEditingRadius ? (
          <View style={styles.radiusEditRow}>
            <TextInput
              style={styles.radiusInput}
              keyboardType="number-pad"
              maxLength={3}
              value={radiusInput}
              onChangeText={setRadiusInput}
              placeholder="e.g. 25"
            />
            <Text style={styles.radiusUnitText}>km</Text>
            <TouchableOpacity style={styles.saveRadiusBtn} onPress={handleSaveRadius}>
              <Text style={styles.saveRadiusBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelRadiusBtn}
              onPress={() => setIsEditingRadius(false)}
            >
              <Text style={styles.cancelRadiusBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editRadiusBtn}
            onPress={() => {
              setRadiusInput(serviceRadiusKm.toString());
              setIsEditingRadius(true);
            }}
          >
            <Ionicons name="pencil" size={14} color="#1E3A5F" />
            <Text style={styles.editRadiusBtnText}>Adjust Service Radius</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Repair Skills & Categories */}
      <Text style={styles.sectionTitle}>ACTIVE REPAIR SKILLS</Text>
      <View style={styles.settingCard}>
        <View style={styles.skillsTagRow}>
          {skills.map((skill) => (
            <View key={skill} style={styles.skillTag}>
              <Ionicons name="checkmark" size={14} color="#1E3A5F" />
              <Text style={styles.skillTagText}>
                {skill.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* App Preferences */}
      <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
      <View style={styles.settingCard}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Current App Language</Text>
            <Text style={styles.prefSub}>
              {language === 'te'
                ? 'Telugu (తెలుగు)'
                : language === 'hi'
                ? 'Hindi (हिन्दी)'
                : 'English'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.langChangeBtn}
            onPress={() => router.push('/language')}
          >
            <Text style={styles.langChangeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.prefRow, { borderBottomWidth: 0, marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Online Receiving Status</Text>
            <Text style={styles.prefSub}>Receive customer repair calls</Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#CBD5E0', true: '#00E676' }}
            thumbColor={isOnline ? '#FFFFFF' : '#A0AEC0'}
          />
        </View>
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF5252" />
        <Text style={styles.logoutBtnText}>Sign Out of Partner Account</Text>
      </TouchableOpacity>

      <Text style={styles.versionInfo}>
        {APP_NAME} • v1.0.0 (Build 1)
      </Text>
    </ScrollView>
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
  profileCard: {
    backgroundColor: '#1E3A5F',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFB300',
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mechanicPhone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  mechanicExp: {
    fontSize: 12,
    color: '#FFB300',
    fontWeight: '600',
    marginTop: 3,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  addressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    gap: 12,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  badgeSub: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  statusPillGreen: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillAmber: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  settingSub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    paddingRight: 10,
  },
  radiusPill: {
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  radiusPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E65100',
  },
  editRadiusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  editRadiusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  radiusEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  radiusInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    width: 60,
    textAlign: 'center',
  },
  radiusUnitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  saveRadiusBtn: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveRadiusBtnText: {
    color: '#FFB300',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelRadiusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelRadiusBtnText: {
    color: '#718096',
    fontSize: 12,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.4)',
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  prefSub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 1,
  },
  langChangeBtn: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  logoutBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
  versionInfo: {
    textAlign: 'center',
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 20,
  },
});
