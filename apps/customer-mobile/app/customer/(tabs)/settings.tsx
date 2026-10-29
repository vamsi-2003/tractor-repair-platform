import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { Language } from '@tractor-repair/shared';
import { APP_NAME } from '@tractor-repair/shared';

const LANGUAGES: { code: Language; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

export default function SettingsScreen() {
  const { profile, user, language, setLanguage, reset } = useAuthStore();
  const [selectedLang, setSelectedLang] = useState<Language>(language || 'en');

  const handleUpdateLanguage = async (newLang: Language) => {
    setSelectedLang(newLang);
    setLanguage(newLang);

    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ preferred_language: newLang })
        .eq('id', user.id);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          reset();
          router.replace('/language');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="#2E7D32" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || 'Farmer Account'}</Text>
          <Text style={styles.profilePhone}>{profile?.phone || user?.phone || '+91'}</Text>
        </View>
      </View>

      {/* Language Section */}
      <Text style={styles.sectionTitle}>App Language / భాష / भाषा</Text>
      <View style={styles.card}>
        {LANGUAGES.map((lang, idx) => {
          const isSelected = selectedLang === lang.code;
          return (
            <React.Fragment key={lang.code}>
              <TouchableOpacity
                style={styles.languageRow}
                onPress={() => handleUpdateLanguage(lang.code)}
              >
                <View>
                  <Text style={[styles.langNative, isSelected && styles.selectedText]}>
                    {lang.native}
                  </Text>
                  <Text style={styles.langEnglish}>{lang.name}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
                )}
              </TouchableOpacity>
              {idx < LANGUAGES.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* Support & Legal */}
      <Text style={styles.sectionTitle}>Support & Assistance</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/customer/dispute/new')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#333" />
            <Text style={styles.menuText}>Report a Problem or Dispute</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            Alert.alert(
              'About Tractor Repair',
              'Tractor Repair Marketplace v0.1.0\nConnecting rural farmers with certified mechanics nationwide via live GPS dispatch.'
            )
          }
        >
          <View style={styles.menuLeft}>
            <Ionicons name="information-circle-outline" size={20} color="#333" />
            <Text style={styles.menuText}>About the App</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#9E9E9E', fontWeight: '500' }}>
          {APP_NAME} • v1.0.0 (Build 1)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  profilePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  langNative: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  langEnglish: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  selectedText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
  },
});
