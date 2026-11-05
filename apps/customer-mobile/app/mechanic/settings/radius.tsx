import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
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

const RADIUS_OPTIONS = [15, 25, 35, 50, 75];

export default function MechanicRadiusScreen() {
  const { mechanic, setMechanic } = useAuthStore();

  const [selectedRadius, setSelectedRadius] = useState<number>(
    mechanic?.service_radius_km ? Number(mechanic.service_radius_km) : 35
  );
  const [customInput, setCustomInput] = useState<string>(
    String(mechanic?.service_radius_km ?? 35)
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectPreset = (r: number) => {
    setSelectedRadius(r);
    setCustomInput(String(r));
  };

  const handleCustomChange = (text: string) => {
    setCustomInput(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 150) {
      setSelectedRadius(parsed);
    }
  };

  const handleSave = async () => {
    const radiusNum = parseInt(customInput, 10);
    if (isNaN(radiusNum) || radiusNum < 5 || radiusNum > 150) {
      Alert.alert('Invalid Radius', 'Please enter a distance between 5 km and 150 km.');
      return;
    }

    if (!mechanic?.id) {
      Alert.alert('Notice', 'Mechanic record not loaded.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mechanics')
        .update({
          service_radius_km: radiusNum,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mechanic.id);

      if (error) throw error;

      setMechanic({
        ...mechanic,
        service_radius_km: radiusNum,
      });

      if (Platform.OS === 'web') {
        window.alert(`Service radius set to ${radiusNum} km!`);
      } else {
        Alert.alert('Saved', `Service coverage radius updated to ${radiusNum} km!`);
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update service radius.');
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
        <Text style={styles.headerTitle}>Service Radius</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Radius Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Ionicons name="navigate-circle" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.heroNumber}>{selectedRadius} km</Text>
          <Text style={styles.heroSub}>Active Travel Radius from Workshop</Text>
        </View>

        {/* Preset Selector */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>QUICK SELECT PRESET DISTANCE</Text>
          <Text style={styles.cardSub}>
            Choose how far you are willing to travel for tractor breakdown repairs in fields:
          </Text>

          <View style={styles.presetsGrid}>
            {RADIUS_OPTIONS.map((r) => {
              const isSelected = selectedRadius === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                  onPress={() => handleSelectPreset(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                    {r} km
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Input */}
          <View style={styles.customWrap}>
            <Text style={styles.customLabel}>Or enter custom radius (km):</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.customInput}
                value={customInput}
                onChangeText={handleCustomChange}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="35"
              />
              <Text style={styles.unitText}>Kilometers</Text>
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
                <Text style={styles.saveBtnText}>Save Service Radius</Text>
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
    gap: 16,
  },
  heroCard: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroSub: {
    fontSize: 13,
    color: '#E0F2F5',
    marginTop: 4,
    fontWeight: '600',
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
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND_DARK,
    letterSpacing: 0.5,
  },
  cardSub: {
    fontSize: 13,
    color: '#607D8B',
    marginTop: -8,
    lineHeight: 18,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F4F5',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
  },
  presetBtnActive: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  presetBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#37474F',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
  },
  customWrap: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    gap: 8,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#455A64',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInput: {
    width: 90,
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#263238',
    textAlign: 'center',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
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
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
