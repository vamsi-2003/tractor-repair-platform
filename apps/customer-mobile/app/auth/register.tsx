import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { LanguageToggle } from '../../components/LanguageToggle';

// ─── Theme Constants (Casal Primary Theme) ───────────────────────────
const BRAND_COLOR = '#006376'; // Casal Teal (Confirmed)
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_ACCENT = '#3AAEEB';

// ─── 5-Language Dictionary ───────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    backBtn: 'Back',
    title: 'CREATE ACCOUNT',
    subtitle: 'Join Tractor Seva to get reliable doorstep repair',
    roleLabel: 'I want to register as:',
    roleFarmer: '🌾 Farmer / Customer',
    roleMechanic: '🔧 Tractor Mechanic',
    usernameLabel: 'Full Name / Username',
    usernamePlaceholder: 'e.g. Ramesh Patel',
    emailLabel: 'Email / Gmail',
    emailPlaceholder: 'e.g. ramesh@gmail.com',
    phoneLabel: 'Mobile Number',
    phonePlaceholder: '10-digit mobile number',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Create a strong password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    rulesTitle: 'Password Must Contain:',
    ruleMinLength: 'At least 8 characters',
    ruleUpper: '1 uppercase letter (A-Z)',
    ruleLower: '1 lowercase letter (a-z)',
    ruleNumber: '1 number (0-9)',
    ruleSymbol: '1 special symbol (@, #, $, %, etc.)',
    passwordMatch: 'Passwords match',
    passwordMismatch: 'Passwords do not match',
    registerBtn: 'Create Account / Register',
    haveAccount: 'Already have an account?',
    signInLink: 'Sign In',
    errName: 'Please enter your full name.',
    errEmail: 'Please enter a valid email address.',
    errPhone: 'Please enter a valid 10-digit mobile number.',
    errPassword: 'Password does not meet all security conditions.',
    errConfirmPassword: 'Passwords do not match.',
    successReg: 'Account created successfully! Logging you in...',
  },
  te: {
    backBtn: 'వెనుకకు',
    title: 'కొత్త ఖాతా సృష్టించండి',
    subtitle: 'ట్రాక్టర్ మరమ్మతు సేవల కోసం నమోదు చేసుకోండి',
    roleLabel: 'మీ పాత్రను ఎంచుకోండి:',
    roleFarmer: '🌾 రైతు / కస్టమర్',
    roleMechanic: '🔧 ట్రాక్టర్ మెకానిక్',
    usernameLabel: 'పూర్తి పేరు / యూజర్‌నేమ్',
    usernamePlaceholder: 'ఉదా: రమేష్ పటేల్',
    emailLabel: 'ఇమెయిల్ / జీమెయిల్',
    emailPlaceholder: 'ఉదా: ramesh@gmail.com',
    phoneLabel: 'మొబైల్ సంఖ్య',
    phonePlaceholder: '10 అంకెల మొబైల్ సంఖ్య',
    passwordLabel: 'పాస్‌వర్డ్',
    passwordPlaceholder: 'బలమైన పాస్‌వర్డ్ సృష్టించండి',
    confirmPasswordLabel: 'పాస్‌వర్డ్ నిర్ధారించండి',
    confirmPasswordPlaceholder: 'పాస్‌వర్డ్ మళ్లీ నమోదు చేయండి',
    rulesTitle: 'పాస్‌వర్డ్ నిబంధనలు:',
    ruleMinLength: 'కనీసం 8 అక్షరాలు',
    ruleUpper: '1 పెద్ద అక్షరం (A-Z)',
    ruleLower: '1 చిన్న అక్షరం (a-z)',
    ruleNumber: '1 అంకె (0-9)',
    ruleSymbol: '1 ప్రత్యేక చిహ్నం (@, #, $, % మొదలైనవి)',
    passwordMatch: 'పాస్‌వర్డ్‌లు సరిపోలాయి',
    passwordMismatch: 'పాస్‌వర్డ్‌లు సరిపోలలేదు',
    registerBtn: 'ఖాతా సృష్టించండి / రిజిస్టర్',
    haveAccount: 'ఇప్పటికే ఖాతా ఉందా?',
    signInLink: 'లాగిన్ అవ్వండి',
    errName: 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి.',
    errEmail: 'దయచేసి సరైన ఇమెయిల్ నమోదు చేయండి.',
    errPhone: 'దయచేసి సరైన 10 అంకెల మొబైల్ సంఖ్య నమోదు చేయండి.',
    errPassword: 'పాస్‌వర్డ్ అన్ని నిబంధనలను పూర్తి చేయాలి.',
    errConfirmPassword: 'పాస్‌వర్డ్‌లు సరిపోలలేదు.',
    successReg: 'ఖాతా విజయవంతంగా సృష్టించబడింది!',
  },
  hi: {
    backBtn: 'वापस',
    title: 'नया खाता बनाएं',
    subtitle: 'ट्रैक्टर मरम्मत सेवा के लिए रजिस्टर करें',
    roleLabel: 'अपनी भूमिका चुनें:',
    roleFarmer: '🌾 किसान / ग्राहक',
    roleMechanic: '🔧 ट्रैक्टर मैकेनिक',
    usernameLabel: 'पूरा नाम / उपयोगकर्ता नाम',
    usernamePlaceholder: 'उदा: रमेश पटेल',
    emailLabel: 'ईमेल / जीमेल',
    emailPlaceholder: 'उदा: ramesh@gmail.com',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'मजबूत पासवर्ड बनाएं',
    confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
    confirmPasswordPlaceholder: 'पासवर्ड दोबारा दर्ज करें',
    rulesTitle: 'पासवर्ड की शर्तें:',
    ruleMinLength: 'कम से कम 8 अक्षर',
    ruleUpper: '1 बड़ा अक्षर (A-Z)',
    ruleLower: '1 छोटा अक्षर (a-z)',
    ruleNumber: '1 अंक (0-9)',
    ruleSymbol: '1 विशेष चिन्ह (@, #, $, % आदि)',
    passwordMatch: 'पासवर्ड मेल खाते हैं',
    passwordMismatch: 'पासवर्ड मेल नहीं खाते',
    registerBtn: 'खाता बनाएं / रजिस्टर करें',
    haveAccount: 'क्या पहले से खाता है?',
    signInLink: 'साइन इन करें',
    errName: 'कृपया अपना पूरा नाम दर्ज करें।',
    errEmail: 'कृपया मान्य ईमेल पता दर्ज करें।',
    errPhone: 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।',
    errPassword: 'पासवर्ड सभी सुरक्षा शर्तों को पूरा नहीं करता।',
    errConfirmPassword: 'पासवर्ड मेल नहीं खाते।',
    successReg: 'खाता सफलतापूर्वक बनाया गया!',
  },
  kn: {
    backBtn: 'ಹಿಂದೆ',
    title: 'ಹೊಸ ಖಾತೆ ರಚಿಸಿ',
    subtitle: 'ಟ್ರ್ಯಾಕ್ಟರ್ ದುರಸ್ತಿ ಸೇವೆಗಾಗಿ ನೋಂದಾಯಿಸಿ',
    roleLabel: 'ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ:',
    roleFarmer: '🌾 ರೈತ / ಗ್ರಾಹಕ',
    roleMechanic: '🔧 ಟ್ರ್ಯಾಕ್ಟರ್ ಮೆಕ್ಯಾನಿಕ್',
    usernameLabel: 'ಪೂರ್ಣ ಹೆಸರು',
    usernamePlaceholder: 'ಉದಾ: ರಮೇಶ್ ಪಟೇಲ್',
    emailLabel: 'ಇಮೇಲ್ / ಜಿಮೇಲ್',
    emailPlaceholder: 'ಉದಾ: ramesh@gmail.com',
    phoneLabel: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    phonePlaceholder: '10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    passwordLabel: 'ಪಾಸ್‌ವರ್ಡ್',
    passwordPlaceholder: 'ಬಲವಾದ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ',
    confirmPasswordLabel: 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
    confirmPasswordPlaceholder: 'ಪಾಸ್‌ವರ್ಡ್ ಮರುನಮೂದಿಸಿ',
    rulesTitle: 'ಪಾಸ್‌ವರ್ಡ್ ನಿಯಮಗಳು:',
    ruleMinLength: 'ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳು',
    ruleUpper: '1 ದೊಡ್ಡ ಅಕ್ಷರ (A-Z)',
    ruleLower: '1 ಸಣ್ಣ ಅಕ್ಷರ (a-z)',
    ruleNumber: '1 ಸಂಖ್ಯೆ (0-9)',
    ruleSymbol: '1 ವಿಶೇಷ ಚಿಹ್ನೆ (@, #, $ ಇತ್ಯಾದಿ)',
    passwordMatch: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತವೆ',
    passwordMismatch: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ',
    registerBtn: 'ಖಾತೆ ರಚಿಸಿ / ನೋಂದಾಯಿಸಿ',
    haveAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಹೊಂದಿದ್ದೀರಾ?',
    signInLink: 'ಲಾಗಿನ್ ಆಗಿ',
    errName: 'ದಯವಿಟ್ಟು ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ.',
    errEmail: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ನಮೂದಿಸಿ.',
    errPhone: 'ದಯವಿಟ್ಟು 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
    errPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಎಲ್ಲಾ ನಿಯಮಗಳನ್ನು ಪೂರೈಸಬೇಕು.',
    errConfirmPassword: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ.',
    successReg: 'ಖಾತೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ!',
  },
  ta: {
    backBtn: 'பின்செல்',
    title: 'புதிய கணக்கை உருவாக்கவும்',
    subtitle: 'டிராக்டர் பழுதுபார்ப்பு சேவைகளுக்காக பதிவு செய்க',
    roleLabel: 'உங்கள் பாத்திரத்தைத் தேர்வுசெய்க:',
    roleFarmer: '🌾 விவசாயி / வாடிக்கையாளர்',
    roleMechanic: '🔧 டிராக்டர் மெக்கானிக்',
    usernameLabel: 'முழு பெயர்',
    usernamePlaceholder: 'எ.கா: ரமேஷ் படேல்',
    emailLabel: 'மின்னஞ்சல் / ஜிமெயில்',
    emailPlaceholder: 'எ.கா: ramesh@gmail.com',
    phoneLabel: 'கைபேசி எண்',
    phonePlaceholder: '10 இலக்க கைபேசி எண்',
    passwordLabel: 'கடவுச்சொல்',
    passwordPlaceholder: 'வலுவான கடவுச்சொல்லை உருவாக்கவும்',
    confirmPasswordLabel: 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    confirmPasswordPlaceholder: 'கடவுச்சொல்லை மீண்டும் உள்ளிடவும்',
    rulesTitle: 'கடவுச்சொல் தேவைகள்:',
    ruleMinLength: 'குறைந்தது 8 எழுத்துக்கள்',
    ruleUpper: '1 பெரிய எழுத்து (A-Z)',
    ruleLower: '1 சிறிய எழுத்து (a-z)',
    ruleNumber: '1 எண் (0-9)',
    ruleSymbol: '1 சிறப்பு குறியீடு (@, #, $, % போன்றவை)',
    passwordMatch: 'கடவுச்சொற்கள் பொருந்துகின்றன',
    passwordMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை',
    registerBtn: 'கணக்கை உருவாக்கவும் / பதிவு செய்க',
    haveAccount: 'ஏற்கனவே கணக்கு உள்ளதா?',
    signInLink: 'உள்நுழைக',
    errName: 'தயவுசெய்து முழு பெயரை உள்ளிடவும்.',
    errEmail: 'தயவுசெய்து சரியான மின்னஞ்சலை உள்ளிடவும்.',
    errPhone: 'தயவுசெய்து 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.',
    errPassword: 'கடவுச்சொல் அனைத்து நிபந்தனைகளையும் பூர்த்தி செய்ய வேண்டும்.',
    errConfirmPassword: 'கடவுச்சொற்கள் பொருந்தவில்லை.',
    successReg: 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது!',
  },
};

export default function RegisterScreen() {
  const { language, setSelectedRole, setSession, setProfile, fetchUserProfile } = useAuthStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Form Fields
  const [role, setRole] = useState<'customer' | 'mechanic'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Live Password Conditions ───────────────────────────────────────
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-=+~`[\]\\]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const showMatchFeedback = confirmPassword.length > 0;

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  // ─── Submit Registration ───────────────────────────────────────────
  const handleRegister = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName || cleanFullName.length < 2) {
      setErrorMessage(t.errName);
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage(t.errEmail);
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMessage(t.errPhone);
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage(t.errPassword);
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage(t.errConfirmPassword);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Sign up user via Supabase Auth
      let authRes = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: `+91${cleanPhone}`,
            role,
          },
        },
      });

      // If email rate limit is exceeded on free tier GoTrue, fallback to server pre-confirmation endpoint
      if (
        authRes.error &&
        (authRes.error.message?.toLowerCase().includes('rate limit') ||
          authRes.error.message?.toLowerCase().includes('email rate limit exceeded'))
      ) {
        try {
          const apiBase =
            Platform.OS === 'web'
              ? 'http://localhost:3000'
              : 'http://10.0.2.2:3000';
          const res = await fetch(`${apiBase}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              full_name: cleanFullName,
              phone: cleanPhone,
              role,
            }),
          });
          const json = await res.json();
          if (json.user) {
            // Automatically sign in with pre-confirmed account
            const loginRes = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (loginRes.data?.session) {
              setSession(loginRes.data.session);
              setProfile({
                id: json.user.id,
                role,
                full_name: cleanFullName,
                phone: `+91${cleanPhone}`,
                preferred_language: language || 'en',
                is_active: true,
              } as any);
              setSelectedRole(role);
              await fetchUserProfile(json.user.id);

              setSuccessMessage(t.successReg);
              setTimeout(() => {
                if (role === 'mechanic') {
                  router.replace('/mechanic/(tabs)/home');
                } else {
                  router.replace('/customer/(tabs)/home');
                }
              }, 600);
              return;
            }
          }
        } catch (fbErr) {
          console.warn('Fallback registration error:', fbErr);
        }
      }

      if (authRes.error) {
        setErrorMessage(
          authRes.error.message.includes('rate limit')
            ? 'Email verification rate limit reached. Your credentials have been saved; please try signing in directly with Email & Password.'
            : authRes.error.message
        );
        return;
      }

      const userId = authRes.data.user?.id;
      if (!userId) {
        setErrorMessage('Failed to obtain user identity. Please try again.');
        return;
      }

      // 2. Insert or Upsert into public.profiles
      const profileData = {
        id: userId,
        role,
        full_name: cleanFullName,
        phone: `+91${cleanPhone}`,
        preferred_language: language || 'en',
        is_active: true,
      };

      const { error: profError } = await supabase.from('profiles').upsert(profileData);
      if (profError) {
        console.warn('Profile creation notice:', profError);
      }

      // 3. Insert into Role-Specific Table
      if (role === 'customer') {
        const { error: custError } = await supabase
          .from('customers')
          .upsert({ profile_id: userId }, { onConflict: 'profile_id' });
        if (custError) console.warn('Customer table notice:', custError);
      } else {
        const { error: mechError } = await supabase
          .from('mechanics')
          .upsert(
            {
              profile_id: userId,
              status: 'pending_approval',
              experience_years: 3,
              service_radius_km: 25,
              is_online: false,
            },
            { onConflict: 'profile_id' }
          );
        if (mechError) console.warn('Mechanic table notice:', mechError);
      }

      // 4. Update Store & Navigate
      if (authRes.data?.session) {
        setSession(authRes.data.session);
        setProfile(profileData as any);
        setSelectedRole(role);
        await fetchUserProfile(userId);

        setSuccessMessage(t.successReg);
        setTimeout(() => {
          if (role === 'mechanic') {
            router.replace('/mechanic/(tabs)/home');
          } else {
            router.replace('/customer/(tabs)/home');
          }
        }, 600);
      } else {
        // Email confirmation is required by Supabase settings
        setSuccessMessage('Account created! Please check your email to confirm your account, then sign in.');
        setTimeout(() => {
          router.replace('/auth/sign-in');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* ─── Top Navigation Bar ─── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/auth/sign-in')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>{t.backBtn}</Text>
            </TouchableOpacity>
            <LanguageToggle />
          </View>

          {/* ─── Header Hero ─── */}
          <View style={styles.heroSection}>
            <Text style={styles.brandTitle}>{t.title}</Text>
            <Text style={styles.brandSubtitle}>{t.subtitle}</Text>
          </View>

          {/* ─── Main Form Card ─── */}
          <View style={styles.card}>
            {/* Error & Success Feedback */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#B71C1C" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#1B5E20" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* 1. Role Selection Pills */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.roleLabel}</Text>
              <View style={styles.rolePickerRow}>
                <TouchableOpacity
                  style={[styles.rolePill, role === 'customer' && styles.rolePillActive]}
                  onPress={() => setRole('customer')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rolePillText, role === 'customer' && styles.rolePillTextActive]}>
                    {t.roleFarmer}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rolePill, role === 'mechanic' && styles.rolePillActive]}
                  onPress={() => setRole('mechanic')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rolePillText, role === 'mechanic' && styles.rolePillTextActive]}>
                    {t.roleMechanic}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Full Name / Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.usernameLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.usernamePlaceholder}
                  placeholderTextColor="#90A4AE"
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* 3. Email / Gmail */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.emailLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.emailPlaceholder}
                  placeholderTextColor="#90A4AE"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* 4. Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.phoneLabel}</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.countryBadge}>
                  <Text style={styles.countryBadgeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor="#90A4AE"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* 5. Password with Show/Hide Eye */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.passwordLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.passwordPlaceholder}
                  placeholderTextColor="#90A4AE"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIconBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#455A64"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ─── Live Password Conditions Checklist ─── */}
            <View style={styles.conditionsBox}>
              <Text style={styles.conditionsHeader}>{t.rulesTitle}</Text>

              <View style={styles.conditionRow}>
                <Ionicons
                  name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={hasMinLength ? '#2E7D32' : '#90A4AE'}
                />
                <Text style={[styles.conditionText, hasMinLength && styles.conditionTextMet]}>
                  {t.ruleMinLength}
                </Text>
              </View>

              <View style={styles.conditionRow}>
                <Ionicons
                  name={hasUpperCase ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={hasUpperCase ? '#2E7D32' : '#90A4AE'}
                />
                <Text style={[styles.conditionText, hasUpperCase && styles.conditionTextMet]}>
                  {t.ruleUpper}
                </Text>
              </View>

              <View style={styles.conditionRow}>
                <Ionicons
                  name={hasLowerCase ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={hasLowerCase ? '#2E7D32' : '#90A4AE'}
                />
                <Text style={[styles.conditionText, hasLowerCase && styles.conditionTextMet]}>
                  {t.ruleLower}
                </Text>
              </View>

              <View style={styles.conditionRow}>
                <Ionicons
                  name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={hasNumber ? '#2E7D32' : '#90A4AE'}
                />
                <Text style={[styles.conditionText, hasNumber && styles.conditionTextMet]}>
                  {t.ruleNumber}
                </Text>
              </View>

              <View style={styles.conditionRow}>
                <Ionicons
                  name={hasSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={hasSpecial ? '#2E7D32' : '#90A4AE'}
                />
                <Text style={[styles.conditionText, hasSpecial && styles.conditionTextMet]}>
                  {t.ruleSymbol}
                </Text>
              </View>
            </View>

            {/* 6. Confirm Password with Show/Hide Eye */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.confirmPasswordLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.confirmPasswordPlaceholder}
                  placeholderTextColor="#90A4AE"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIconBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#455A64"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Matching Feedback */}
              {showMatchFeedback && (
                <View style={styles.matchFeedbackRow}>
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordsMatch ? '#2E7D32' : '#D32F2F'}
                  />
                  <Text style={[styles.matchFeedbackText, { color: passwordsMatch ? '#2E7D32' : '#D32F2F' }]}>
                    {passwordsMatch ? t.passwordMatch : t.passwordMismatch}
                  </Text>
                </View>
              )}
            </View>

            {/* 7. Register Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isPasswordValid || !passwordsMatch || cleanPhone.length !== 10 || isLoading) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!isPasswordValid || !passwordsMatch || cleanPhone.length !== 10 || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{t.registerBtn}</Text>
              )}
            </TouchableOpacity>

            {/* 8. Link to Sign In */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t.haveAccount} </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/sign-in')} activeOpacity={0.7}>
                <Text style={styles.footerLinkText}>{t.signInLink}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F282D', // Deep background tone complementing Casal
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 12,
    paddingBottom: 40,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#A0BCC2',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B71C1C',
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7F8',
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#212121',
  },
  eyeIconBtn: {
    padding: 8,
  },
  countryBadge: {
    paddingRight: 10,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#B0BEC5',
  },
  countryBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#37474F',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F0F4F5',
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePillActive: {
    backgroundColor: BRAND_LIGHT,
    borderColor: BRAND_COLOR,
    borderWidth: 2,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#546E7A',
  },
  rolePillTextActive: {
    color: BRAND_COLOR,
    fontWeight: '800',
  },
  conditionsBox: {
    backgroundColor: '#F5F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D8E6E9',
  },
  conditionsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 12,
    color: '#78909C',
  },
  conditionTextMet: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  matchFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingLeft: 4,
  },
  matchFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
    color: '#546E7A',
  },
  footerLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_COLOR,
    textDecorationLine: 'underline',
  },
});
