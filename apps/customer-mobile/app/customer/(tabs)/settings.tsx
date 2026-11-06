import React from 'react';
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

// ─── Theme Constants (Casal Primary Theme) ───────────────────────────
const BRAND_COLOR = '#006376'; // Casal Teal
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';

const LANGUAGES: { code: Language; name: string; native: string; flag: string }[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
];

const SETTINGS_TRANSLATIONS: Record<
  string,
  {
    defaultName: string;
    profileNavTitle: string;
    profileNavSub: string;
    langNavTitle: string;
    langNavSub: string;
    aboutNavTitle: string;
    aboutNavSub: string;
    supportNavTitle: string;
    supportNavSub: string;
    signOut: string;
    signOutConfirmTitle: string;
    signOutConfirmMsg: string;
    cancel: string;
  }
> = {
  en: {
    defaultName: 'Farmer Account',
    profileNavTitle: 'Farmer Profile & Machinery',
    profileNavSub: 'Name, phone, address & tractor details',
    langNavTitle: 'App Language',
    langNavSub: 'Change dialect (Telugu, Hindi, English...)',
    aboutNavTitle: 'About Tractor Seva',
    aboutNavSub: 'Our mission, how it works, safety standards',
    supportNavTitle: 'Support & Assistance',
    supportNavSub: 'Report a breakdown issue or dispute',
    signOut: 'Sign Out from Customer App',
    signOutConfirmTitle: 'Sign Out',
    signOutConfirmMsg: 'Are you sure you want to sign out?',
    cancel: 'Cancel',
  },
  te: {
    defaultName: 'రైతు ఖాతా',
    profileNavTitle: 'రైతు ప్రొఫైల్ & ట్రాక్టర్ వివరాలు',
    profileNavSub: 'పేరు, మొబైల్, చిరునామా మరియు ట్రాక్టర్',
    langNavTitle: 'యాప్ భాష (App Language)',
    langNavSub: 'భాషను మార్చండి (తెలుగు, हिन्दी, English...)',
    aboutNavTitle: 'ట్రాక్టర్ సేవా గురించి',
    aboutNavSub: 'మా లక్ష్యం, ఎలా పనిచేస్తుంది, భద్రత',
    supportNavTitle: 'మద్దతు & సహాయం',
    supportNavSub: 'సమస్య లేదా వివాదాన్ని నివేదించండి',
    signOut: 'ఖాతా నుండి లాగ్ అవుట్',
    signOutConfirmTitle: 'లాగ్ అవుట్',
    signOutConfirmMsg: 'మీరు ఖచ్చితంగా లాగ్ అవుట్ చేయాలనుకుంటున్నారా?',
    cancel: 'రద్దు చేయి',
  },
  hi: {
    defaultName: 'किसान खाता',
    profileNavTitle: 'किसान प्रोफ़ाइल और ट्रैक्टर विवरण',
    profileNavSub: 'नाम, मोबाइल, पता और मशीनरी विवरण',
    langNavTitle: 'ऐप की भाषा (App Language)',
    langNavSub: 'भाषा बदलें (हिन्दी, తెలుగు, English...)',
    aboutNavTitle: 'ट्रैक्टर सेवा के बारे में',
    aboutNavSub: 'हमारा मिशन, कार्यप्रणाली, सुरक्षा गारंटी',
    supportNavTitle: 'सहायता और समर्थन',
    supportNavSub: 'समस्या या विवाद की रिपोर्ट करें',
    signOut: 'ऐप से साइन आउट करें',
    signOutConfirmTitle: 'साइन आउट',
    signOutConfirmMsg: 'क्या आप निश्चित रूप से साइन आउट करना चाहते हैं?',
    cancel: 'रद्द करें',
  },
  kn: {
    defaultName: 'ರೈತ ಖಾತೆ',
    profileNavTitle: 'ರೈತ ಪ್ರೊಫೈಲ್ ಮತ್ತು ವಿವರಗಳು',
    profileNavSub: 'ಹೆಸರು, ಮೊಬೈಲ್, ವಿಳಾಸ ಮತ್ತು ಟ್ರ್ಯಾಕ್ಟರ್',
    langNavTitle: 'ಆ್ಯಪ್ ಭಾಷೆ (App Language)',
    langNavSub: 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ',
    aboutNavTitle: 'ಟ್ರ್ಯಾಕ್ಟರ್ ಸೇವಾ ಬಗ್ಗೆ',
    aboutNavSub: 'ನಮ್ಮ ಗುರಿ, ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    supportNavTitle: 'ಬೆಂಬಲ ಮತ್ತು ನೆರವು',
    supportNavSub: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    signOut: 'ಸೈನ್ ಔಟ್',
    signOutConfirmTitle: 'ಸೈನ್ ಔಟ್',
    signOutConfirmMsg: 'ನೀವು ಖಚಿತವಾಗಿ ಸೈನ್ ಔಟ್ ಮಾಡಲು ಬಯಸುವಿರಾ?',
    cancel: 'ರದ್ದುಮಾಡಿ',
  },
  ta: {
    defaultName: 'விவசாயி கணக்கு',
    profileNavTitle: 'சுயவிவரம் & டிராக்டர் விவரங்கள்',
    profileNavSub: 'பெயர், தொலைபேசி, முகவரி மற்றும் டிராக்டர்',
    langNavTitle: 'பயன்பாட்டு மொழி (Language)',
    langNavSub: 'மொழியை மாற்றவும்',
    aboutNavTitle: 'டிராக்டர் சேவா பற்றி',
    aboutNavSub: 'எங்கள் நோக்கம், எவ்வாறு செயல்படுகிறது',
    supportNavTitle: 'ஆதரவு & உதவி',
    supportNavSub: 'சிக்கலைப் புகாரளிக்கவும்',
    signOut: 'வெளியேறு',
    signOutConfirmTitle: 'வெளியேறு',
    signOutConfirmMsg: 'நீங்கள் நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    cancel: 'ரத்து செய்',
  },
};

export default function CustomerSettingsScreen() {
  const { profile, user, language, reset } = useAuthStore();
  const t = SETTINGS_TRANSLATIONS[language] || SETTINGS_TRANSLATIONS.en;

  const activeLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

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
      {/* ─── Profile Header Summary Card ─── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={BRAND_COLOR} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || t.defaultName}</Text>
          <Text style={styles.profilePhone}>{profile?.phone || user?.phone || '+91'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => router.push('/customer/settings/profile-edit')}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={14} color="#FFFFFF" />
          <Text style={styles.editProfileBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Settings Navigation List ─── */}
      <Text style={styles.sectionTitle}>ACCOUNT & SETTINGS</Text>
      <View style={styles.card}>
        {/* Profile Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/customer/settings/profile-edit')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="person-circle-outline" size={22} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>{t.profileNavTitle}</Text>
              <Text style={styles.navSub}>{t.profileNavSub}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* App Language Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/language')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="globe-outline" size={22} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.navTitle}>{t.langNavTitle}</Text>
                <Text style={{ fontSize: 16 }}>{activeLangObj.flag}</Text>
              </View>
              <Text style={styles.navSub}>
                {activeLangObj.native} ({activeLangObj.name})
              </Text>
            </View>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{activeLangObj.name.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* About App Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="information-circle-outline" size={22} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>{t.aboutNavTitle}</Text>
              <Text style={styles.navSub}>{t.aboutNavSub}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Support & Dispute Button */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/customer/dispute/new')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={styles.navIconCircle}>
              <Ionicons name="help-circle-outline" size={22} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>{t.supportNavTitle}</Text>
              <Text style={styles.navSub}>{t.supportNavSub}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Delete Account Row (Google Play Policy §4.8) */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/account-delete')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={[styles.navIconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navTitle, { color: '#D32F2F' }]}>Delete Account</Text>
              <Text style={styles.navSub}>Erase personal profile & machinery data</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      {/* ─── Sign Out Button ─── */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
        <Text style={styles.signOutText}>{t.signOut}</Text>
      </TouchableOpacity>

      {/* ─── App Version Footer ─── */}
      <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 16 }}>
        <Text style={styles.footerVersion}>Tractor Seva • v1.2.0</Text>
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
  profileEmail: {
    fontSize: 12,
    color: '#90A4AE',
    marginTop: 1,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 1,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#546E7A',
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5,
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 12,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#D32F2F',
  },
  footerVersion: {
    fontSize: 12,
    color: '#90A4AE',
    fontWeight: '700',
  },
});
