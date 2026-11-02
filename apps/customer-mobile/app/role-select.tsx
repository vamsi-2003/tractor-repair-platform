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
import { useAuthStore, UserRole } from '../store/authStore';
import { APP_NAME } from '@tractor-repair/shared';
import { LanguageToggle } from '../components/LanguageToggle';

// ─── Theme Constants (Casal Primary Theme) ───────────────────────────
const BRAND_COLOR = '#006376'; // Casal Teal
const BRAND_DARK = '#004957';
const BRAND_BG = '#0F282D';

// ─── 5-Language Dictionary ───────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: 'WHO ARE YOU?',
    subtitle: 'Select how you would like to use the app',
    farmerTitle: 'I need a mechanic',
    farmerSubtitle: 'Farmer / Tractor Owner',
    farmerDesc: 'Book verified doorstep repair for your tractor',
    mechanicTitle: "I'm a mechanic",
    mechanicSubtitle: 'Tractor Repair Specialist',
    mechanicDesc: 'Accept nearby repair jobs and grow earnings',
    changeLang: 'Change Language',
  },
  te: {
    title: 'మీరు ఎవరు?',
    subtitle: 'యాప్‌ను ఎలా ఉపయోగించాలనుకుంటున్నారో ఎంచుకోండి',
    farmerTitle: 'నాకు మెకానిక్ కావాలి',
    farmerSubtitle: 'రైతు / ట్రాక్టర్ యజమాని',
    farmerDesc: 'సమీపంలోని నైపుణ్యం కలిగిన మెకానిక్‌ని బుక్ చేయండి',
    mechanicTitle: 'నేను మెకానిక్',
    mechanicSubtitle: 'ట్రాక్టర్ మరమ్మతు నిపుణుడు',
    mechanicDesc: 'సమీప రిపేర్ ఆర్డర్లు పొందండి మరియు సంపాదించండి',
    changeLang: 'భాషను మార్చండి',
  },
  hi: {
    title: 'आप कौन हैं?',
    subtitle: 'कृपया ऐप का उपयोग करने के लिए अपनी भूमिका चुनें',
    farmerTitle: 'मुझे मैकेनिक चाहिए',
    farmerSubtitle: 'किसान / ट्रैक्टर मालिक',
    farmerDesc: 'अपने खेत पर ट्रैक्टर रिपेयर बुक करें',
    mechanicTitle: 'मैं मैकेनिक हूँ',
    mechanicSubtitle: 'ट्रैक्टर मरम्मत विशेषज्ञ',
    mechanicDesc: 'आस-पास के ऑर्डर प्राप्त करें और कमाई बढ़ाएं',
    changeLang: 'भाषा बदलें',
  },
  kn: {
    title: 'ನೀವು ಯಾರು?',
    subtitle: 'ಆ್ಯಪ್ ಬಳಸಲು ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    farmerTitle: 'ನನಗೆ ಮೆಕ್ಯಾನಿಕ್ ಬೇಕು',
    farmerSubtitle: 'ರೈತ / ಟ್ರ್ಯಾಕ್ಟರ್ ಮಾಲೀಕ',
    farmerDesc: 'ನಿಮ್ಮ ಟ್ರ್ಯಾಕ್ಟರ್‌ಗೆ ಪರಿಶೀಲಿಸಿದ ದುರಸ್ತಿ ಬುಕ್ ಮಾಡಿ',
    mechanicTitle: 'ನಾನು ಮೆಕ್ಯಾನಿಕ್',
    mechanicSubtitle: 'ಟ್ರ್ಯಾಕ್ಟರ್ ದುರಸ್ತಿ ತಜ್ಞ',
    mechanicDesc: 'ಹತ್ತಿರದ ದುರಸ್ತಿ ಕೆಲಸಗಳನ್ನು ಸ್ವೀಕರಿಸಿ ಮತ್ತು ಗಳಿಸಿ',
    changeLang: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ',
  },
  ta: {
    title: 'நீங்கள் யார்?',
    subtitle: 'பயன்பாட்டைப் பயன்படுத்த உங்கள் பாத்திரத்தைத் தேர்வுசெய்க',
    farmerTitle: 'எனக்கு மெக்கானிக் வேண்டும்',
    farmerSubtitle: 'விவசாயி / டிராக்டர் உரிமையாளர்',
    farmerDesc: 'உங்கள் டிராக்டருக்கு பழுதுபார்ப்பை முன்பதிவு செய்க',
    mechanicTitle: 'நான் ஒரு மெக்கானிக்',
    mechanicSubtitle: 'டிராக்டர் பழுதுபார்ப்பு நிபுணர்',
    mechanicDesc: 'அருகிலுள்ள பழுது வேலைகளை ஏற்று வருவாயைப் பெறுங்கள்',
    changeLang: 'மொழியை மாற்றவும்',
  },
};

export default function RoleSelectScreen() {
  const { setSelectedRole, language } = useAuthStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    router.push('/auth/sign-in');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header Row with Language Switcher */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>{APP_NAME.toUpperCase()}</Text>
            <View style={styles.divider} />
          </View>
          <LanguageToggle />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          <View style={styles.rolesContainer}>
            {/* Customer Option */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleSelectRole('customer')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t.farmerTitle}
            >
              <View style={[styles.iconCircle, { backgroundColor: BRAND_COLOR }]}>
                <Ionicons name="car-sport" size={30} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>{t.farmerTitle}</Text>
                <Text style={styles.roleSubtitle}>{t.farmerSubtitle}</Text>
                <Text style={styles.roleDesc}>{t.farmerDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={BRAND_COLOR} />
            </TouchableOpacity>

            {/* Mechanic Option */}
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleSelectRole('mechanic')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t.mechanicTitle}
            >
              <View style={[styles.iconCircle, { backgroundColor: BRAND_DARK }]}>
                <Ionicons name="construct" size={30} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>{t.mechanicTitle}</Text>
                <Text style={styles.roleSubtitle}>{t.mechanicSubtitle}</Text>
                <Text style={styles.roleDesc}>{t.mechanicDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={BRAND_DARK} />
            </TouchableOpacity>
          </View>

          {/* Change Language Footer Link */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/language')}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={16} color="#A0BCC2" />
            <Text style={styles.backButtonText}>{t.changeLang}</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 6,
    width: 36,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0BCC2',
    marginTop: 6,
    marginBottom: 24,
  },
  rolesContainer: {
    gap: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#212121',
  },
  roleSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLOR,
    marginTop: 2,
  },
  roleDesc: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 4,
    lineHeight: 17,
  },
  backButton: {
    marginTop: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    color: '#E0F2F5',
    fontSize: 13,
    fontWeight: '600',
  },
});
