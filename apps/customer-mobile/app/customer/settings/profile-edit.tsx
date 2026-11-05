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

export default function CustomerProfileEditScreen() {
  const { profile, user, setProfile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');

  // Tractor details
  const [tractorId, setTractorId] = useState<string | null>(null);
  const [tractorMake, setTractorMake] = useState('Mahindra');
  const [tractorModel, setTractorModel] = useState('575 DI');
  const [tractorYear, setTractorYear] = useState('2021');
  const [tractorReg, setTractorReg] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || user?.phone || '');
      setEmail(user?.email || '');
    }

    async function loadCustomerAndTractor() {
      const userId = user?.id || profile?.id;
      if (!userId) return;

      setIsLoading(true);
      try {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', userId)
          .maybeSingle();

        if (customerData?.id) {
          const { data: tractorData } = await supabase
            .from('tractors')
            .select('*')
            .eq('customer_id', customerData.id)
            .limit(1)
            .maybeSingle();

          if (tractorData) {
            setTractorId(tractorData.id);
            setTractorMake(tractorData.make || 'Mahindra');
            setTractorModel(tractorData.model || '575 DI');
            setTractorYear(tractorData.year ? String(tractorData.year) : '2021');
            setTractorReg(tractorData.registration_number || '');
          }
        }
      } catch (e) {
        console.warn('Error loading customer tractor:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomerAndTractor();
  }, [profile, user]);

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

      // 2. Ensure customer record exists
      let custId = '';
      const { data: custData } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle();

      if (custData) {
        custId = custData.id;
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({ profile_id: userId })
          .select('id')
          .single();
        if (newCust) custId = newCust.id;
      }

      // 3. Update or insert tractor
      if (custId) {
        const yr = parseInt(tractorYear, 10) || 2021;
        if (tractorId) {
          await supabase
            .from('tractors')
            .update({
              make: tractorMake.trim() || 'Mahindra',
              model: tractorModel.trim() || '575 DI',
              year: yr,
              registration_number: tractorReg.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tractorId);
        } else {
          await supabase.from('tractors').insert({
            customer_id: custId,
            make: tractorMake.trim() || 'Mahindra',
            model: tractorModel.trim() || '575 DI',
            year: yr,
            registration_number: tractorReg.trim() || null,
          });
        }
      }

      // Update Zustand state
      if (profile) {
        setProfile({
          ...profile,
          full_name: fullName.trim(),
          phone: phone.trim() || profile.phone,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Farmer profile updated successfully!');
      } else {
        Alert.alert('Saved', 'Farmer profile & machinery details saved successfully!');
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save changes.');
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
        <Text style={styles.headerTitle}>Farmer Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={BRAND_COLOR} style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* Personal Details */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>FARMER ACCOUNT DETAILS</Text>
              <Text style={styles.cardHeaderSub}>
                Your details are shared with assigned mechanics so they can reach your farm.
              </Text>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Ramesh Kumar"
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
                  placeholder="farmer@gmail.com"
                  placeholderTextColor="#90A4AE"
                />
                <Text style={styles.helperText}>Used for login and workorder receipts.</Text>
              </View>

              {/* Village / Mandal */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Village / Farm Location</Text>
                <TextInput
                  style={styles.input}
                  value={village}
                  onChangeText={setVillage}
                  placeholder="e.g. Narakodur Village, Chebrolu Mandal"
                  placeholderTextColor="#90A4AE"
                />
              </View>

              {/* District */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>District & State</Text>
                <TextInput
                  style={styles.input}
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="e.g. Guntur District, Andhra Pradesh"
                  placeholderTextColor="#90A4AE"
                />
              </View>
            </View>

            {/* Primary Machinery / Tractor */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>PRIMARY TRACTOR DETAILS</Text>
              <Text style={styles.cardHeaderSub}>
                Pre-populates your breakdown requests so mechanics bring the correct tools.
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Tractor Brand *</Text>
                  <TextInput
                    style={styles.input}
                    value={tractorMake}
                    onChangeText={setTractorMake}
                    placeholder="e.g. Mahindra"
                    placeholderTextColor="#90A4AE"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Model *</Text>
                  <TextInput
                    style={styles.input}
                    value={tractorModel}
                    onChangeText={setTractorModel}
                    placeholder="e.g. 575 DI"
                    placeholderTextColor="#90A4AE"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Model Year</Text>
                  <TextInput
                    style={styles.input}
                    value={tractorYear}
                    onChangeText={setTractorYear}
                    placeholder="2021"
                    placeholderTextColor="#90A4AE"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Registration Number</Text>
                  <TextInput
                    style={styles.input}
                    value={tractorReg}
                    onChangeText={setTractorReg}
                    placeholder="AP 16 BK 1234"
                    placeholderTextColor="#90A4AE"
                    autoCapitalize="characters"
                  />
                </View>
              </View>
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
          </>
        )}
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
    gap: 16,
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
    gap: 14,
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
    marginTop: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
