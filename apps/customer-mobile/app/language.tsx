import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { APP_NAME, type Language } from '@tractor-repair/shared';

// ─── Theme Constants (Casal Primary Theme) ───────────────────────────
const BRAND_COLOR = '#006376'; // Casal Teal
const BRAND_DARK = '#004957';
const BRAND_BG = '#0F282D';
const BRAND_LIGHT = '#EDF8F9';

const languages: { code: Language; name: string; nativeName: string; region: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'All Regions' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'ఆంధ్రప్రదేశ్ & తెలంగాణ' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'उत्तर भारत' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'ಕರ್ನಾಟಕ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'தமிழ்நாடு' },
];

export default function LanguageScreen() {
  const { language: currentLanguage, setLanguage, isAuthenticated, profile, selectedRole, user } =
    useAuthStore();

  const handleSelectLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (isAuthenticated) {
      const isMechanic =
        profile?.role === 'mechanic' ||
        selectedRole === 'mechanic' ||
        Boolean(user?.phone && user.phone.endsWith('9902')) ||
        Boolean(user?.email && user.email.includes('mechanic'));

      if (isMechanic) {
        router.replace('/mechanic/(tabs)/home');
      } else {
        router.replace('/customer/(tabs)/home');
      }
    } else {
      router.push('/role-select');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {(router.canGoBack() || isAuthenticated) && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else if (isAuthenticated) {
                    router.replace('/customer/(tabs)/settings');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={styles.brandRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>{APP_NAME.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>CHOOSE YOUR{'\n'}LANGUAGE</Text>
          <Text style={styles.subtitle}>భాషను ఎంచుకోండి · अपनी भाषा चुनें</Text>
          <Text style={styles.subtitle}>ಭಾಷೆಯನ್ನು ಆರಿಸಿ · மொழியைத் தேர்வுசெய்</Text>

          <View style={styles.languageList}>
            {languages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageButton, isSelected && styles.languageButtonSelected]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  accessibilityLabel={`Select ${lang.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.85}
                >
                  <View style={styles.languageContent}>
                    <Text style={[styles.languageNative, isSelected && styles.languageNativeSelected]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.languageEnglish, isSelected && styles.languageEnglishSelected]}>
                      {lang.name} • {lang.region}
                    </Text>
                  </View>
                  <View style={styles.arrowBox}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={BRAND_COLOR} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#78909C" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.comingSoonBox}>
              <Ionicons name="sparkles-outline" size={16} color="#78909C" />
              <Text style={styles.comingSoonText}>
                More languages coming soon (Marathi, Gujarati, Punjabi, Odia, Bengali…)
              </Text>
            </View>
          </View>

          <Text style={styles.hint}>
            💡 You can change your language anytime from app header or Settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_BG,
  },
  scrollContent: {
    flexGrow: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E0F2F5',
    letterSpacing: 2,
  },
  divider: {
    height: 3,
    backgroundColor: BRAND_COLOR,
    marginTop: 8,
    width: 36,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0BCC2',
    marginTop: 6,
    fontWeight: '500',
  },
  languageList: {
    gap: 12,
    marginTop: 22,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    minHeight: 62,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  languageButtonSelected: {
    borderColor: BRAND_COLOR,
    backgroundColor: BRAND_LIGHT,
  },
  languageContent: {
    flex: 1,
  },
  languageNative: {
    fontSize: 18,
    fontWeight: '800',
    color: '#212121',
  },
  languageNativeSelected: {
    color: BRAND_COLOR,
  },
  languageEnglish: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 2,
    fontWeight: '500',
  },
  languageEnglishSelected: {
    color: BRAND_DARK,
    fontWeight: '600',
  },
  arrowBox: {
    marginLeft: 12,
  },
  comingSoonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#90A4AE',
    flex: 1,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#A0BCC2',
    marginTop: 24,
  },
});
