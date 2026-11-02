import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
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
    editProfileBtn: string;
    langSectionTitle: string;
    langButtonSubtitle: string;
    supportSectionTitle: string;
    reportProblem: string;
    aboutApp: string;
    aboutTitle: string;
    aboutDesc: string;
    signOut: string;
    signOutConfirmTitle: string;
    signOutConfirmMsg: string;
    cancel: string;
    editModalTitle: string;
    fullNameLabel: string;
    phoneLabel: string;
    saveBtn: string;
    saveSuccess: string;
  }
> = {
  en: {
    defaultName: 'Farmer Account',
    editProfileBtn: 'Edit Profile',
    langSectionTitle: 'App Language / భాష / भाषा',
    langButtonSubtitle: 'Tap to choose your dialect across the entire app',
    supportSectionTitle: 'Support & Assistance',
    reportProblem: 'Report a Problem or Dispute',
    aboutApp: 'About the App',
    aboutTitle: 'About Tractor Seva',
    aboutDesc:
      'Tractor Seva Marketplace v1.2.0\nConnecting rural farmers with certified mechanics nationwide via live GPS dispatch.',
    signOut: 'Sign Out',
    signOutConfirmTitle: 'Sign Out',
    signOutConfirmMsg: 'Are you sure you want to sign out?',
    cancel: 'Cancel',
    editModalTitle: 'Edit Farmer Profile',
    fullNameLabel: 'Full Name',
    phoneLabel: 'Mobile Number',
    saveBtn: 'Save Changes',
    saveSuccess: 'Profile updated successfully!',
  },
  te: {
    defaultName: 'రైతు ఖాతా',
    editProfileBtn: 'ప్రొఫైల్ సవరణ',
    langSectionTitle: 'యాప్ భాష (App Language)',
    langButtonSubtitle: 'యాప్ భాషను మార్చడానికి ఇక్కడ నొక్కండి',
    supportSectionTitle: 'మద్దతు & సహాయం',
    reportProblem: 'సమస్య లేదా వివాదాన్ని నివేదించండి',
    aboutApp: 'యాప్ గురించి',
    aboutTitle: 'ట్రాక్టర్ సేవా గురించి',
    aboutDesc:
      'ట్రాక్టర్ సేవా మరమ్మతు వేదిక v1.2.0\nరైతులను ధృవీకరించబడిన మెకానిక్లతో లైవ్ GPS ద్వారా అనుసంధానిస్తుంది.',
    signOut: 'లాగ్ అవుట్',
    signOutConfirmTitle: 'లాగ్ అవుట్',
    signOutConfirmMsg: 'మీరు ఖచ్చితంగా లాగ్ అవుట్ చేయాలనుకుంటున్నారా?',
    cancel: 'రద్దు చేయి',
    editModalTitle: 'రైతు ప్రొఫైల్ సవరణ',
    fullNameLabel: 'పూర్తి పేరు',
    phoneLabel: 'మొబైల్ సంఖ్య',
    saveBtn: 'భద్రపరచు',
    saveSuccess: 'ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది!',
  },
  hi: {
    defaultName: 'किसान खाता',
    editProfileBtn: 'प्रोफ़ाइल संपादित करें',
    langSectionTitle: 'ऐप की भाषा (App Language)',
    langButtonSubtitle: 'ऐप की भाषा बदलने के लिए यहां टैप करें',
    supportSectionTitle: 'सहायता और समर्थन',
    reportProblem: 'समस्या या विवाद की रिपोर्ट करें',
    aboutApp: 'ऐप के बारे में',
    aboutTitle: 'ट्रैक्टर सेवा के बारे में',
    aboutDesc:
      'ट्रैक्टर सेवा प्लेटफॉर्म v1.2.0\nग्रामीण किसानों को प्रमाणित मैकेनिकों से जोड़ता है।',
    signOut: 'साइन आउट',
    signOutConfirmTitle: 'साइन आउट',
    signOutConfirmMsg: 'क्या आप निश्चित रूप से साइन आउट करना चाहते हैं?',
    cancel: 'रद्द करें',
    editModalTitle: 'किसान प्रोफ़ाइल संपादित करें',
    fullNameLabel: 'पूरा नाम',
    phoneLabel: 'मोबाइल नंबर',
    saveBtn: 'सहेजें',
    saveSuccess: 'प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!',
  },
  kn: {
    defaultName: 'ರೈತ ಖಾತೆ',
    editProfileBtn: 'ಪ್ರೊಫೈಲ್ ತಿದ್ದುಪಡಿ',
    langSectionTitle: 'ಆ್ಯಪ್ ಭಾಷೆ (App Language)',
    langButtonSubtitle: 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಲು ಇಲ್ಲಿ ಟ್ಯಾಪ್ ಮಾಡಿ',
    supportSectionTitle: 'ಬೆಂಬಲ ಮತ್ತು ನೆರವು',
    reportProblem: 'ಸಮಸ್ಯೆ ಅಥವಾ ವಿವಾದ ವರದಿ ಮಾಡಿ',
    aboutApp: 'ಆ್ಯಪ್ ಬಗ್ಗೆ',
    aboutTitle: 'ಟ್ರ್ಯಾಕ್ಟರ್ ಸೇವಾ ಬಗ್ಗೆ',
    aboutDesc:
      'ಟ್ರ್ಯಾಕ್ಟರ್ ಸೇವಾ ವೇದಿಕೆ v1.2.0\nರೈತರನ್ನು ಪ್ರಮಾಣೀಕೃತ ಮೆಕ್ಯಾನಿಕ್‌ಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    signOut: 'ಸೈನ್ ಔಟ್',
    signOutConfirmTitle: 'ಸೈನ್ ಔಟ್',
    signOutConfirmMsg: 'ನೀವು ಖಚಿತವಾಗಿ ಸೈನ್ ಔಟ್ ಮಾಡಲು ಬಯಸುವಿರಾ?',
    cancel: 'ರದ್ದುಮಾಡಿ',
    editModalTitle: 'ರೈತರ ಪ್ರೊಫೈಲ್ ತಿದ್ದುಪಡಿ',
    fullNameLabel: 'ಪೂರ್ಣ ಹೆಸರು',
    phoneLabel: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    saveBtn: 'ಉಳಿಸಿ',
    saveSuccess: 'ಪ್ರೊಫೈಲ್ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ!',
  },
  ta: {
    defaultName: 'விவசாயி கணக்கு',
    editProfileBtn: 'சுயவிவரத்தைத் திருத்து',
    langSectionTitle: 'பயன்பாட்டு மொழி (App Language)',
    langButtonSubtitle: 'மொழியை மாற்ற இங்கே தட்டவும்',
    supportSectionTitle: 'ஆதரவு & உதவி',
    reportProblem: 'சிக்கல் அல்லது தகராறைப் புகாரளிக்கவும்',
    aboutApp: 'பயன்பாடு பற்றி',
    aboutTitle: 'டிராக்டர் சேவா பற்றி',
    aboutDesc:
      'டிராக்டர் சேவா தளம் v1.2.0\nவிவசாயிகளை சான்றளிக்கப்பட்ட மெக்கானிக்களுடன் இணைக்கிறது.',
    signOut: 'வெளியேறு',
    signOutConfirmTitle: 'வெளியேறு',
    signOutConfirmMsg: 'நீங்கள் நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    cancel: 'ரத்து செய்',
    editModalTitle: 'சுயவிவரத்தைத் திருத்து',
    fullNameLabel: 'முழு பெயர்',
    phoneLabel: 'கைபேசி எண்',
    saveBtn: 'சேமிக்க',
    saveSuccess: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
  },
};

export default function SettingsScreen() {
  const { profile, user, language, setProfile, reset } = useAuthStore();
  const t = SETTINGS_TRANSLATIONS[language] || SETTINGS_TRANSLATIONS.en;

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || '');
      setEditPhone(profile.phone || user?.phone || '');
    }
  }, [profile, user]);

  const activeLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    const userId = user?.id || profile?.id;
    if (!userId) {
      Alert.alert('Notice', 'User session not found.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          phone: editPhone.trim() || profile?.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      if (profile) {
        setProfile({
          ...profile,
          full_name: editFullName.trim(),
          phone: editPhone.trim() || profile.phone,
        });
      }

      setIsEditModalOpen(false);
      if (Platform.OS === 'web') {
        window.alert(t.saveSuccess);
      } else {
        Alert.alert('Success', t.saveSuccess);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
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
      {/* ─── Profile Card with Edit Button ─── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={BRAND_COLOR} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || t.defaultName}</Text>
          <Text style={styles.profilePhone}>{profile?.phone || user?.phone || '+91'}</Text>
        </View>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => setIsEditModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={14} color="#FFFFFF" />
          <Text style={styles.editProfileBtnText}>{t.editProfileBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Language Section: Clean Button Routing to Language Screen ─── */}
      <Text style={styles.sectionTitle}>{t.langSectionTitle}</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.languageNavRow}
          onPress={() => router.push('/language')}
          activeOpacity={0.7}
        >
          <View style={styles.languageNavLeft}>
            <View style={styles.langIconCircle}>
              <Ionicons name="globe-outline" size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.languageNavTitle}>
                  {activeLangObj.native} ({activeLangObj.name})
                </Text>
                <Text style={styles.languageNavFlag}>{activeLangObj.flag}</Text>
              </View>
              <Text style={styles.languageNavSub}>{t.langButtonSubtitle}</Text>
            </View>
          </View>
          <View style={styles.languageNavRight}>
            <View style={styles.activeLangBadge}>
              <Text style={styles.activeLangBadgeText}>{activeLangObj.name.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#90A4AE" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Support & Legal ─── */}
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

      {/* ─── Sign Out Button ─── */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
        <Text style={styles.signOutText}>{t.signOut}</Text>
      </TouchableOpacity>

      {/* ─── App Version Footer ─── */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#90A4AE', fontWeight: '600' }}>
          {APP_NAME} • v1.2.0 (Build 0659cd3c)
        </Text>
      </View>

      {/* ══════════ EDIT CUSTOMER PROFILE MODAL ══════════ */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person-circle" size={22} color={BRAND_COLOR} />
                <Text style={styles.modalTitle}>{t.editModalTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Full Name */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>{t.fullNameLabel}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="e.g. Ramesh Kumar"
                />
              </View>

              {/* Phone */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>{t.phoneLabel}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 9876543210"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Save & Cancel buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                >
                  <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>{t.saveBtn}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  languageNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  languageNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  langIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  languageNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
  },
  languageNavFlag: {
    fontSize: 16,
  },
  languageNavSub: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  languageNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeLangBadge: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  activeLangBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND_COLOR,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    backgroundColor: BRAND_LIGHT,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_DARK,
  },
  modalBody: {
    padding: 20,
    gap: 14,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#455A64',
  },
  modalInput: {
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#263238',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#546E7A',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
