import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { Language } from '@tractor-repair/shared';
import { APP_NAME } from '@tractor-repair/shared';

// ─── Theme Constants (Casal Primary Theme) ───────────────────────────
const BRAND_COLOR = '#006376'; // Casal Teal
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';

const LANGUAGES: { code: Language; name: string; native: string; region: string }[] = [
  { code: 'en', name: 'English', native: 'English', region: 'All Regions' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', region: 'ఆంధ్రప్రదేశ్ & తెలంగాణ' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'उत्तर भारत' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', region: 'ಕರ್ನಾಟಕ' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', region: 'தமிழ்நாடு' },
];

const SETTINGS_TRANSLATIONS: Record<
  string,
  {
    defaultName: string;
    langSectionTitle: string;
    supportSectionTitle: string;
    reportProblem: string;
    aboutApp: string;
    aboutTitle: string;
    aboutDesc: string;
    signOut: string;
    signOutConfirmTitle: string;
    signOutConfirmMsg: string;
    cancel: string;
  }
> = {
  en: {
    defaultName: 'Farmer Account',
    langSectionTitle: 'App Language / భాష / भाषा',
    supportSectionTitle: 'Support & Assistance',
    reportProblem: 'Report a Problem or Dispute',
    aboutApp: 'About the App',
    aboutTitle: 'About Tractor Repair',
    aboutDesc:
      'Tractor Repair Marketplace v0.1.0\nConnecting rural farmers with certified mechanics nationwide via live GPS dispatch.',
    signOut: 'Sign Out',
    signOutConfirmTitle: 'Sign Out',
    signOutConfirmMsg: 'Are you sure you want to sign out?',
    cancel: 'Cancel',
  },
  te: {
    defaultName: 'రైతు ఖాతా',
    langSectionTitle: 'యాప్ భాష (App Language)',
    supportSectionTitle: 'మద్దతు & సహాయం',
    reportProblem: 'సమస్య లేదా వివాదాన్ని నివేదించండి',
    aboutApp: 'యాప్ గురించి',
    aboutTitle: 'ట్రాక్టర్ రిపేర్ గురించి',
    aboutDesc:
      'ట్రాక్టర్ మరమ్మతు వేదిక v0.1.0\nరైతులను ధృవీకరించబడిన మెకానిక్లతో లైవ్ GPS ద్వారా అనుసంధానిస్తుంది.',
    signOut: 'లాగ్ అవుట్',
    signOutConfirmTitle: 'లాగ్ అవుట్',
    signOutConfirmMsg: 'మీరు ఖచ్చితంగా లాగ్ అవుట్ చేయాలనుకుంటున్నారా?',
    cancel: 'రద్దు చేయి',
  },
  hi: {
    defaultName: 'किसान खाता',
    langSectionTitle: 'ऐप की भाषा (App Language)',
    supportSectionTitle: 'सहायता और समर्थन',
    reportProblem: 'समस्या या विवाद की रिपोर्ट करें',
    aboutApp: 'ऐप के बारे में',
    aboutTitle: 'ट्रैक्टर रिपेयर के बारे में',
    aboutDesc:
      'ट्रैक्टर रिपेयर प्लेटफॉर्म v0.1.0\nग्रामीण किसानों को प्रमाणित मैकेनिकों से जोड़ता है।',
    signOut: 'साइन आउट',
    signOutConfirmTitle: 'साइन आउट',
    signOutConfirmMsg: 'क्या आप निश्चित रूप से साइन आउट करना चाहते हैं?',
    cancel: 'रद्द करें',
  },
  kn: {
    defaultName: 'ರೈತ ಖಾತೆ',
    langSectionTitle: 'ಆ್ಯಪ್ ಭಾಷೆ (App Language)',
    supportSectionTitle: 'ಬೆಂಬಲ ಮತ್ತು ನೆರವು',
    reportProblem: 'ಸಮಸ್ಯೆ ಅಥವಾ ವಿವಾದ ವರದಿ ಮಾಡಿ',
    aboutApp: 'ಆ್ಯಪ್ ಬಗ್ಗೆ',
    aboutTitle: 'ಟ್ರ್ಯಾಕ್ಟರ್ ದುರಸ್ತಿ ಬಗ್ಗೆ',
    aboutDesc:
      'ಟ್ರ್ಯಾಕ್ಟರ್ ದುರಸ್ತಿ ವೇದಿಕೆ v0.1.0\nರೈತರನ್ನು ಪ್ರಮಾಣೀಕೃತ ಮೆಕ್ಯಾನಿಕ್‌ಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    signOut: 'ಸೈನ್ ಔಟ್',
    signOutConfirmTitle: 'ಸೈನ್ ಔಟ್',
    signOutConfirmMsg: 'ನೀವು ಖಚಿತವಾಗಿ ಸೈನ್ ಔಟ್ ಮಾಡಲು ಬಯಸುವಿರಾ?',
    cancel: 'ರದ್ದುಮಾಡಿ',
  },
  ta: {
    defaultName: 'விவசாயி கணக்கு',
    langSectionTitle: 'பயன்பாட்டு மொழி (App Language)',
    supportSectionTitle: 'ஆதரவு & உதவி',
    reportProblem: 'சிக்கல் அல்லது தகராறைப் புகாரளிக்கவும்',
    aboutApp: 'பயன்பாடு பற்றி',
    aboutTitle: 'டிராக்டர் பழுது பற்றி',
    aboutDesc:
      'டிராக்டர் பழுதுபார்ப்பு தளம் v0.1.0\nவிவசாயிகளை சான்றளிக்கப்பட்ட மெக்கானிக்களுடன் இணைக்கிறது.',
    signOut: 'வெளியேறு',
    signOutConfirmTitle: 'வெளியேறு',
    signOutConfirmMsg: 'நீங்கள் நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    cancel: 'ரத்து செய்',
  },
};

export default function SettingsScreen() {
  const { profile, user, language, setLanguage, reset } = useAuthStore();
  const [selectedLang, setSelectedLang] = useState<Language>(language || 'en');

  const t = SETTINGS_TRANSLATIONS[language] || SETTINGS_TRANSLATIONS.en;

  useEffect(() => {
    if (language) {
      setSelectedLang(language);
    }
  }, [language]);

  const handleUpdateLanguage = (newLang: Language) => {
    setSelectedLang(newLang);
    setLanguage(newLang);
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      await supabase.auth.signOut();
      reset();
      router.replace('/language');
      return;
    }
    Alert.alert(t.signOutConfirmTitle, t.signOutConfirmMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.signOut,
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
          <Ionicons name="person" size={32} color={BRAND_COLOR} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || t.defaultName}</Text>
          <Text style={styles.profilePhone}>{profile?.phone || user?.phone || '+91'}</Text>
        </View>
      </View>

      {/* Language Section */}
      <Text style={styles.sectionTitle}>{t.langSectionTitle}</Text>
      <View style={styles.card}>
        {LANGUAGES.map((lang, idx) => {
          const isSelected = selectedLang === lang.code;
          return (
            <React.Fragment key={lang.code}>
              <TouchableOpacity
                style={[styles.languageRow, isSelected && styles.languageRowSelected]}
                onPress={() => handleUpdateLanguage(lang.code)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={[styles.langNative, isSelected && styles.selectedText]}>
                    {lang.native}
                  </Text>
                  <Text style={styles.langEnglish}>
                    {lang.name} • {lang.region}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={BRAND_COLOR} />
                )}
              </TouchableOpacity>
              {idx < LANGUAGES.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* Support & Legal */}
      <Text style={styles.sectionTitle}>{t.supportSectionTitle}</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/customer/dispute/new')}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle-outline" size={20} color={BRAND_COLOR} />
            <Text style={styles.menuText}>{t.reportProblem}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            if (Platform.OS === 'web') {
              window.alert(`${t.aboutTitle}\n\n${t.aboutDesc}`);
            } else {
              Alert.alert(t.aboutTitle, t.aboutDesc);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="information-circle-outline" size={20} color={BRAND_COLOR} />
            <Text style={styles.menuText}>{t.aboutApp}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
        <Text style={styles.signOutText}>{t.signOut}</Text>
      </TouchableOpacity>

      {/* App Version */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#90A4AE', fontWeight: '600' }}>
          {APP_NAME} • v1.0.0 (Casal Edition)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
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
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BRAND_BORDER,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#263238',
  },
  profilePhone: {
    fontSize: 14,
    color: '#607D8B',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#455A64',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 0.3,
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
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  languageRowSelected: {
    backgroundColor: 'rgba(0, 99, 118, 0.03)',
  },
  langNative: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
  },
  langEnglish: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  selectedText: {
    color: BRAND_COLOR,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
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
    color: '#263238',
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D32F2F',
  },
});
