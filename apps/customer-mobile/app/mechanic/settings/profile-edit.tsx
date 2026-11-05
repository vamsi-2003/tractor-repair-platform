import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

const BRAND_COLOR = '#006376';
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';

export default function MechanicProfileEditScreen() {
  const { profile, mechanic, user, setProfile, setMechanic } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(mechanic?.workshop_address || '');
  const [experienceYears, setExperienceYears] = useState(
    String(mechanic?.experience_years ?? 5)
  );
  const [notes, setNotes] = useState(mechanic?.admin_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || user?.phone || '');
      setEmail(user?.email || '');
    }
    if (mechanic) {
      setAddress(mechanic.workshop_address || '');
      setExperienceYears(String(mechanic.experience_years ?? 5));
    }
  }, [profile, mechanic, user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    const userId = user?.id || profile?.id;
    if (!userId) {
      Alert.alert('Error', 'User session not found.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update profiles table
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || profile?.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profErr) throw profErr;

      // 2. Update mechanics table
      const expNum = parseInt(experienceYears, 10) || 5;
      if (mechanic?.id) {
        const { error: mechErr } = await supabase
          .from('mechanics')
          .update({
            workshop_address: address.trim(),
            experience_years: expNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mechanic.id);

        if (mechErr) throw mechErr;

        setMechanic({
          ...mechanic,
          workshop_address: address.trim(),
          experience_years: expNum,
        });
      }

      if (profile) {
        setProfile({
          ...profile,
          full_name: fullName.trim(),
          phone: phone.trim() || profile.phone,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Mechanic profile updated successfully!');
      } else {
        Alert.alert('Success', 'Mechanic profile updated successfully!');
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
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
        <Text style={styles.headerTitle}>Mechanic Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>PERSONAL & WORKSHOP DETAILS</Text>
          <Text style={styles.cardHeaderSub}>
            This information is visible to farmers and displayed on service workorders.
          </Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Suresh Kumar"
              placeholderTextColor="#90A4AE"
            />
          </View>

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#90A4AE"
              keyboardType="phone-pad"
            />
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              placeholder="mechanic@tractorapp.com"
              placeholderTextColor="#90A4AE"
            />
            <Text style={styles.helperText}>Used for account security & official notifications.</Text>
          </View>

          {/* Workshop Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Workshop Address *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. NH16 Highway Bypass, Beside Indian Oil Bunk, Guntur Rural, AP"
              placeholderTextColor="#90A4AE"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Experience in Years */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Experience (Years) *</Text>
            <TextInput
              style={styles.input}
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder="5"
              placeholderTextColor="#90A4AE"
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.helperText}>Number of years servicing tractors & agricultural machinery.</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Profile Changes</Text>
              </>
            )}
          </TouchableOpacity>
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_DARK,
    letterSpacing: 0.5,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: '#607D8B',
    marginTop: -8,
    marginBottom: 4,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
  },
  input: {
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#263238',
  },
  disabledInput: {
    backgroundColor: '#ECEFF1',
    color: '#78909C',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND_COLOR,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 10,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
