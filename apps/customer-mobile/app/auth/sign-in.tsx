import React, { useState, useRef, useEffect } from 'react';
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
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { LanguageToggle } from '../../components/LanguageToggle';

// ─── Theme Constants (Casal Primary Theme) ───────────────────────────
const BRAND_COLOR = '#006376'; // Casal Teal (Confirmed)
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_ACCENT = '#3AAEEB';

// ─── Storage Keys for Remember Me ────────────────────────────────────
const REMEMBER_ME_PREF_KEY = 'tractor_remember_me_enabled';
const SAVED_IDENTIFIER_KEY = 'tractor_saved_identifier';
const SAVED_METHOD_KEY = 'tractor_saved_method';

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

// ─── 5-Language Dictionary ───────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    customerTitle: 'FARMER / CUSTOMER LOGIN',
    mechanicTitle: 'MECHANIC LOGIN',
    tagline: 'Reliable doorstep tractor repair & assistance',
    tabPhone: 'Mobile OTP',
    tabEmail: 'Email & Password',
    phoneLabel: 'Mobile Number',
    phonePlaceholder: 'Enter 10-digit mobile number',
    phoneHint: "We'll send a 6-digit SMS verification code.",
    sendCode: 'Send Verification Code',
    verifyCode: 'Verify & Sign In',
    enterCodeTitle: 'ENTER 6-DIGIT SMS CODE',
    codeSentTo: 'Verification code sent to',
    resendIn: 'Resend code in',
    resendNow: 'Resend Code',
    changeNumber: 'Change Number',
    emailLabel: 'Email / Gmail',
    emailPlaceholder: 'name@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberMe: 'Keep me remembered',
    forgotPassword: 'Forgot Password?',
    signInBtn: 'Sign In',
    orDivider: 'OR',
    noAccount: "Don't have an account?",
    registerLink: 'Create an Account / Register',
    switchRoleFarmer: 'Looking for tractor repair? Sign in as Farmer',
    switchRoleMechanic: 'Are you a tractor mechanic? Sign in here',
    invalidPhone: 'Please enter a valid 10-digit mobile number.',
    invalidEmail: 'Please enter a valid email address.',
    invalidPassword: 'Password cannot be empty.',
    invalidOtp: 'Please enter the 6-digit verification code.',
    resetSent: 'Password reset link sent to your email.',
  },
  te: {
    customerTitle: 'రైతు / కస్టమర్ లాగిన్',
    mechanicTitle: 'మెకానిక్ లాగిన్',
    tagline: 'మీ ట్రాక్టర్‌కు వేగవంతమైన మరమ్మతు సేవలు',
    tabPhone: 'మొబైల్ OTP',
    tabEmail: 'ఇమెయిల్ & పాస్‌వర్డ్',
    phoneLabel: 'మొబైల్ సంఖ్య',
    phonePlaceholder: '10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి',
    phoneHint: 'మేము 6 అంకెల SMS ధృవీకరణ కోడ్‌ను పంపుతాము.',
    sendCode: 'ధృవీకరణ కోడ్ పంపండి',
    verifyCode: 'ధృవీకరించి లాగిన్ అవ్వండి',
    enterCodeTitle: '6-అంకెల SMS కోడ్‌ను నమోదు చేయండి',
    codeSentTo: 'కోడ్ పంపబడిన సంఖ్య:',
    resendIn: 'కోడ్ మళ్లీ పంపుటకు సమయం',
    resendNow: 'కోడ్ మళ్లీ పంపండి',
    changeNumber: 'నంబర్ మార్చండి',
    emailLabel: 'ఇమెయిల్ / జీమెయిల్',
    emailPlaceholder: 'name@gmail.com',
    passwordLabel: 'పాస్‌వర్డ్',
    passwordPlaceholder: 'మీ పాస్‌వర్డ్ నమోదు చేయండి',
    rememberMe: 'నన్ను గుర్తుంచుకోండి (Remember Me)',
    forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
    signInBtn: 'లాగిన్ అవ్వండి',
    orDivider: 'లేదా',
    noAccount: 'ఖాతా లేదా?',
    registerLink: 'కొత్త ఖాతా సృష్టించండి / రిజిస్టర్',
    switchRoleFarmer: 'ట్రాక్టర్ రిపేర్ కావాలా? రైతుగా లాగిన్ అవ్వండి',
    switchRoleMechanic: 'మీరు మెకానిక్ నా? ఇక్కడ లాగిన్ అవ్వండి',
    invalidPhone: 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి.',
    invalidEmail: 'దయచేసి సరైన ఇమెయిల్ చిరునామాను నమోదు చేయండి.',
    invalidPassword: 'దయచేసి పాస్‌వర్డ్ నమోదు చేయండి.',
    invalidOtp: 'దయచేసి 6 అంకెల కోడ్‌ను నమోదు చేయండి.',
    resetSent: 'పాస్‌వర్డ్ రీసెట్ లింక్ మీ ఇమెయిల్‌కు పంపబడింది.',
  },
  hi: {
    customerTitle: 'किसान / ग्राहक लॉगिन',
    mechanicTitle: 'मैकेनिक लॉगिन',
    tagline: 'खेत पर विश्वसनीय ट्रैक्टर मरम्मत सेवा',
    tabPhone: 'मोबाइल OTP',
    tabEmail: 'ईमेल और पासवर्ड',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
    phoneHint: 'हम 6 अंकों का SMS सत्यापन कोड भेजेंगे।',
    sendCode: 'सत्यापन कोड भेजें',
    verifyCode: 'सत्यापित करें और लॉगिन करें',
    enterCodeTitle: '6-अंकों का SMS कोड दर्ज करें',
    codeSentTo: 'कोड भेजा गया:',
    resendIn: 'पुनः कोड भेजने का समय',
    resendNow: 'कोड पुनः भेजें',
    changeNumber: 'नंबर बदलें',
    emailLabel: 'ईमेल / जीमेल',
    emailPlaceholder: 'name@gmail.com',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    rememberMe: 'मुझे याद रखें (Remember Me)',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInBtn: 'साइन इन करें',
    orDivider: 'या',
    noAccount: 'क्या आपके पास खाता नहीं है?',
    registerLink: 'नया खाता बनाएं / रजिस्टर',
    switchRoleFarmer: 'ट्रैक्टर मरम्मत चाहिए? किसान के रूप में लॉगिन करें',
    switchRoleMechanic: 'क्या आप मैकेनिक हैं? यहाँ लॉगिन करें',
    invalidPhone: 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।',
    invalidEmail: 'कृपया एक वैध ईमेल पता दर्ज करें।',
    invalidPassword: 'कृपया पासवर्ड दर्ज करें।',
    invalidOtp: 'कृपया 6 अंकों का सत्यापन कोड दर्ज करें।',
    resetSent: 'पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है।',
  },
  kn: {
    customerTitle: 'ರೈತ / ಗ್ರಾಹಕ ಲಾಗಿನ್',
    mechanicTitle: 'ಮೆಕ್ಯಾನಿಕ್ ಲಾಗಿನ್',
    tagline: 'ವಿಶ್ವಾಸಾರ್ಹ ಟ್ರ್ಯಾಕ್ಟರ್ ದುರಸ್ತಿ ಸೇವೆಗಳು',
    tabPhone: 'ಮೊಬೈಲ್ OTP',
    tabEmail: 'ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್',
    phoneLabel: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    phonePlaceholder: '10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ',
    phoneHint: 'ನಾವು 6 ಅಂಕಿಗಳ SMS ಪರಿಶೀಲನಾ ಕೋಡ್ ಕಳುಹಿಸುತ್ತೇವೆ.',
    sendCode: 'ಕೋಡ್ ಕಳುಹಿಸಿ',
    verifyCode: 'ಪರಿಶೀಲಿಸಿ ಲಾಗಿನ್ ಮಾಡಿ',
    enterCodeTitle: '6-ಅಂಕಿಗಳ SMS ಕೋಡ್ ನಮೂದಿಸಿ',
    codeSentTo: 'ಕೋಡ್ ಕಳುಹಿಸಲಾದ ಸಂಖ್ಯೆ:',
    resendIn: 'ಮರುಕಳುಹಿಸುವ ಸಮಯ',
    resendNow: 'ಕೋಡ್ ಮರುಕಳುಹಿಸಿ',
    changeNumber: 'ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ',
    emailLabel: 'ಇಮೇಲ್ / ಜಿಮೇಲ್',
    emailPlaceholder: 'name@gmail.com',
    passwordLabel: 'ಪಾಸ್‌ವರ್ಡ್',
    passwordPlaceholder: 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ',
    rememberMe: 'ನನ್ನನ್ನು ನೆನಪಿನಲ್ಲಿಡಿ',
    forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರುವಿರಾ?',
    signInBtn: 'ಲಾಗಿನ್ ಆಗಿ',
    orDivider: 'ಅಥವಾ',
    noAccount: 'ಖಾತೆ ಇಲ್ಲವೇ?',
    registerLink: 'ಹೊಸ ಖಾತೆ ರಚಿಸಿ / ನೋಂದಾಯಿಸಿ',
    switchRoleFarmer: 'ಟ್ರ್ಯಾಕ್ಟರ್ ದುರಸ್ತಿ ಬೇಕೇ? ರೈತರಾಗಿ ಲಾಗಿನ್ ಆಗಿ',
    switchRoleMechanic: 'ನೀವು ಮೆಕ್ಯಾನಿಕ್ ಆಗಿದ್ದೀರಾ? ಇಲ್ಲಿ ಲಾಗಿನ್ ಆಗಿ',
    invalidPhone: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
    invalidEmail: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ನಮೂದಿಸಿ.',
    invalidPassword: 'ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.',
    invalidOtp: 'ದಯವಿಟ್ಟು 6 ಅಂಕಿಗಳ ಕೋಡ್ ನಮೂದಿಸಿ.',
    resetSent: 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸಲಾಗಿದೆ.',
  },
  ta: {
    customerTitle: 'விவசாயி / வாடிக்கையாளர் உள்நுழைவு',
    mechanicTitle: 'மெக்கானிக் உள்நுழைவு',
    tagline: 'நம்பகமான டிராக்டர் பழுதுபார்ப்பு சேவை',
    tabPhone: 'மொபைல் OTP',
    tabEmail: 'மின்னஞ்சல் & கடவுச்சொல்',
    phoneLabel: 'கைபேசி எண்',
    phonePlaceholder: '10 இலக்க கைபேசி எண்ணை உள்ளிடவும்',
    phoneHint: '6 இலக்க SMS சரிபார்ப்புக் குறியீடு அனுப்புவோம்.',
    sendCode: 'குறியீட்டை அனுப்பவும்',
    verifyCode: 'சரிபார்த்து உள்நுழையவும்',
    enterCodeTitle: '6-இலக்க SMS குறியீட்டை உள்ளிடவும்',
    codeSentTo: 'குறியீடு அனுப்பப்பட்ட எண்:',
    resendIn: 'மறுஅனுப்பல் நேரம்',
    resendNow: 'குறியீட்டை மீண்டும் அனுப்பு',
    changeNumber: 'எண்ணை மாற்றவும்',
    emailLabel: 'மின்னஞ்சல் / ஜிமெயில்',
    emailPlaceholder: 'name@gmail.com',
    passwordLabel: 'கடவுச்சொல்',
    passwordPlaceholder: 'கடவுச்சொல்லை உள்ளிடவும்',
    rememberMe: 'என்னை நினைவில் கொள்',
    forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
    signInBtn: 'உள்நுழைய',
    orDivider: 'அல்லது',
    noAccount: 'கணக்கு இல்லையா?',
    registerLink: 'புதிய கணக்கை உருவாக்கவும் / பதிவு செய்க',
    switchRoleFarmer: 'டிராக்டர் பழுது தேவையா? விவசாயியாக உள்நுழையவும்',
    switchRoleMechanic: 'நீங்கள் மெக்கானிக்கா? இங்கே உள்நுழையவும்',
    invalidPhone: 'தயவுசெய்து சரியான 10 இலக்க எண்ணை உள்ளிடவும்.',
    invalidEmail: 'தயவுசெய்து சரியான மின்னஞ்சலை உள்ளிடவும்.',
    invalidPassword: 'கடவுச்சொல்லை உள்ளிடவும்.',
    invalidOtp: 'தயவுசெய்து 6 இலக்க குறியீட்டை உள்ளிடவும்.',
    resetSent: 'கடவுச்சொல் மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டது.',
  },
};

export default function SignInScreen() {
  const { language, selectedRole, setSelectedRole, setSession, setProfile, fetchUserProfile } = useAuthStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Login Mode: 'otp' | 'email'
  const [authMethod, setAuthMethod] = useState<'otp' | 'email'>('email');

  // Form State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const otpInputRef = useRef<TextInput>(null);
  const isMechanic = selectedRole === 'mechanic';

  // Restore saved credentials if remember me was active
  useEffect(() => {
    (async () => {
      try {
        const savedPref = await storage.get(REMEMBER_ME_PREF_KEY);
        if (savedPref === 'true') {
          setRememberMe(true);
          const savedId = await storage.get(SAVED_IDENTIFIER_KEY);
          const savedMeth = await storage.get(SAVED_METHOD_KEY);
          if (savedMeth === 'otp' && savedId) {
            setPhone(savedId);
            setAuthMethod('otp');
          } else if (savedId) {
            setEmail(savedId);
            setAuthMethod('email');
          }
        }
      } catch (e) {
        console.warn('Could not read saved auth preferences:', e);
      }
    })();
  }, []);

  // OTP Resend Countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  const saveRememberMePreference = async (identifier: string, method: 'otp' | 'email') => {
    if (rememberMe) {
      await storage.set(REMEMBER_ME_PREF_KEY, 'true');
      await storage.set(SAVED_IDENTIFIER_KEY, identifier);
      await storage.set(SAVED_METHOD_KEY, method);
    } else {
      await storage.remove(REMEMBER_ME_PREF_KEY);
      await storage.remove(SAVED_IDENTIFIER_KEY);
      await storage.remove(SAVED_METHOD_KEY);
    }
  };

  // ─── Email & Password Authentication ────────────────────────────────
  const handleEmailSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage(t.invalidEmail);
      return;
    }
    if (!password) {
      setErrorMessage(t.invalidPassword);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
        return;
      }

      if (data?.session && data.session.user) {
        await saveRememberMePreference(cleanEmail, 'email');
        setSession(data.session);

        // Fetch or hydrate profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (userProfile) {
          setProfile(userProfile);
          await fetchUserProfile(data.session.user.id);
          const effectiveRole = userProfile.role || selectedRole || 'customer';
          setSelectedRole(effectiveRole as any);

          if (effectiveRole === 'mechanic') {
            router.replace('/mechanic/(tabs)/home');
          } else {
            router.replace('/customer/(tabs)/home');
          }
        } else {
          // If profile does not exist yet, create default
          const assignedRole = selectedRole || 'customer';
          await supabase.from('profiles').insert({
            id: data.session.user.id,
            role: assignedRole,
            full_name: cleanEmail.split('@')[0],
            preferred_language: language || 'en',
            is_active: true,
          });
          if (assignedRole === 'customer') {
            await supabase.from('customers').insert({ profile_id: data.session.user.id });
            router.replace('/customer/(tabs)/home');
          } else {
            router.replace('/mechanic/(tabs)/home');
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Forgot Password Trigger ───────────────────────────────────────
  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter your email above to receive a reset link.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage(t.resetSent);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Phone OTP Request ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (cleanPhone.length !== 10) {
      setErrorMessage(t.invalidPhone);
      return;
    }

    setIsLoading(true);
    try {
      // Test Accounts Fast-track
      if (cleanPhone === '9999999901' || cleanPhone === '9999999902') {
        setStep('otp');
        setCountdown(30);
        setTimeout(() => otpInputRef.current?.focus(), 300);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${cleanPhone}`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setStep('otp');
      setCountdown(30);
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send OTP code. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Phone OTP Verification ─────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (otp.length !== 6) {
      setErrorMessage(t.invalidOtp);
      return;
    }

    setIsLoading(true);
    try {
      await saveRememberMePreference(cleanPhone, 'otp');

      // Test accounts verification
      if (cleanPhone === '9999999901' || cleanPhone === '9999999902') {
        if (otp !== '123456') {
          setErrorMessage('Invalid verification code. Use test OTP: 123456');
          setIsLoading(false);
          return;
        }

        const testEmail =
          cleanPhone === '9999999901'
            ? 'customer.test@tractorrepair.internal'
            : 'mechanic.test@tractorrepair.internal';

        const { data: testAuthData, error: testAuthError } =
          await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'TestPassword123456!',
          });

        if (testAuthError || !testAuthData.session) {
          setErrorMessage(testAuthError?.message || 'Failed to authenticate test account.');
          setIsLoading(false);
          return;
        }

        setSession(testAuthData.session);
        await fetchUserProfile(testAuthData.session.user.id);

        if (cleanPhone === '9999999902') {
          setSelectedRole('mechanic');
          router.replace('/mechanic/(tabs)/home');
        } else {
          setSelectedRole('customer');
          router.replace('/customer/(tabs)/home');
        }
        return;
      }

      // Live SMS OTP Verification
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${cleanPhone}`,
        token: otp,
        type: 'sms',
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data?.session) {
        setSession(data.session);

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        let userRole = selectedRole || 'customer';

        if (!existingProfile) {
          const defaultName =
            userRole === 'mechanic'
              ? `Mechanic (${cleanPhone.slice(-4)})`
              : `Farmer (${cleanPhone.slice(-4)})`;

          await supabase.from('profiles').insert({
            id: data.session.user.id,
            role: userRole,
            full_name: defaultName,
            phone: `+91${cleanPhone}`,
            preferred_language: language || 'en',
            is_active: true,
          });

          if (userRole === 'customer') {
            await supabase.from('customers').insert({ profile_id: data.session.user.id });
            await fetchUserProfile(data.session.user.id);
            router.replace('/customer/(tabs)/home');
          } else {
            await fetchUserProfile(data.session.user.id);
            router.replace('/mechanic/(tabs)/home');
          }
        } else {
          userRole = existingProfile.role;
          setSelectedRole(userRole as any);
          setProfile(existingProfile);
          await fetchUserProfile(data.session.user.id);

          if (userRole === 'mechanic') {
            router.replace('/mechanic/(tabs)/home');
          } else {
            router.replace('/customer/(tabs)/home');
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please try again.');
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
          {/* ─── Top Header Bar ─── */}
          <View style={styles.topBar}>
            <View style={styles.badgeRow}>
              <View style={styles.brandIconContainer}>
                <Ionicons name="construct" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.headerLabel}>
                {isMechanic ? t.mechanicTitle : t.customerTitle}
              </Text>
            </View>
            <LanguageToggle />
          </View>

          {/* ─── Brand Hero ─── */}
          <View style={styles.heroSection}>
            <Text style={styles.brandTitle}>TRACTOR SEVA</Text>
            <Text style={styles.brandSubtitle}>{t.tagline}</Text>
          </View>

          {/* ─── Auth Method Tabs (SMS OTP vs Email & Password) ─── */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMethod === 'email' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMethod('email');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={authMethod === 'email' ? BRAND_COLOR : '#5D7175'}
              />
              <Text style={[styles.tabText, authMethod === 'email' && styles.tabTextActive]}>
                {t.tabEmail}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMethod === 'otp' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMethod('otp');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={authMethod === 'otp' ? BRAND_COLOR : '#5D7175'}
              />
              <Text style={[styles.tabText, authMethod === 'otp' && styles.tabTextActive]}>
                {t.tabPhone}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Card Container ─── */}
          <View style={styles.card}>
            {/* Error & Success Banners */}
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

            {/* ══════════ TAB 1: EMAIL & PASSWORD ══════════ */}
            {authMethod === 'email' && (
              <View style={styles.formBlock}>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.emailLabel}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail" size={20} color="#78909C" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t.emailPlaceholder}
                      placeholderTextColor="#90A4AE"
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Input with Eye Toggle */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.passwordLabel}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed" size={20} color="#78909C" style={styles.inputIcon} />
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

                {/* Remember Me Checkbox & Forgot Password Row */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                      {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>{t.rememberMe}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
                    <Text style={styles.forgotPasswordText}>{t.forgotPassword}</Text>
                  </TouchableOpacity>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleEmailSignIn}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t.signInBtn}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ══════════ TAB 2: MOBILE SMS OTP ══════════ */}
            {authMethod === 'otp' && (
              <View style={styles.formBlock}>
                {step === 'phone' ? (
                  <>
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
                      <Text style={styles.hintText}>{t.phoneHint}</Text>
                    </View>

                    {/* Quick Test Accounts Suggestion */}
                    <View style={styles.testAccountBox}>
                      <Text style={styles.testAccountTitle}>💡 Quick Test Accounts (Instant OTP: 123456):</Text>
                      <View style={styles.testAccountRow}>
                        <TouchableOpacity
                          style={styles.testChip}
                          onPress={() => {
                            setPhone('9999999901');
                            setSelectedRole('customer');
                          }}
                        >
                          <Text style={styles.testChipText}>🌾 Farmer: 9999999901</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.testChip}
                          onPress={() => {
                            setPhone('9999999902');
                            setSelectedRole('mechanic');
                          }}
                        >
                          <Text style={styles.testChipText}>🔧 Mechanic: 9999999902</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        (cleanPhone.length < 10 || isLoading) && styles.buttonDisabled,
                      ]}
                      onPress={handleSendOtp}
                      disabled={cleanPhone.length < 10 || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>{t.sendCode}</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.otpHeaderBox}>
                      <Text style={styles.otpHeaderTitle}>{t.enterCodeTitle}</Text>
                      <Text style={styles.otpHeaderSub}>
                        {t.codeSentTo} <Text style={styles.boldPhone}>+91 {cleanPhone}</Text>
                      </Text>
                    </View>

                    {/* 6-Digit OTP Box Grid */}
                    <View style={styles.otpGrid}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <View
                          key={index}
                          style={[
                            styles.otpCell,
                            otp.length === index && styles.otpCellActive,
                            otp.length > index && styles.otpCellFilled,
                          ]}
                        >
                          <Text style={styles.otpCellText}>{otp[index] || ''}</Text>
                        </View>
                      ))}
                    </View>

                    <TextInput
                      ref={otpInputRef}
                      style={styles.hiddenInput}
                      value={otp}
                      onChangeText={(val) => {
                        const cleaned = val.replace(/\D/g, '').slice(0, 6);
                        setOtp(cleaned);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />

                    {/* OTP Action Row */}
                    <View style={styles.otpNavRow}>
                      <TouchableOpacity onPress={() => setStep('phone')} disabled={isLoading}>
                        <Text style={styles.changePhoneText}>{t.changeNumber}</Text>
                      </TouchableOpacity>

                      {countdown > 0 ? (
                        <Text style={styles.countdownText}>
                          {t.resendIn} {countdown}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                          <Text style={styles.resendBtnText}>{t.resendNow}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, (otp.length < 6 || isLoading) && styles.buttonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={otp.length < 6 || isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>{t.verifyCode}</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* ─── Prominent Register / Create Account Link ─── */}
            <View style={styles.registerPromptRow}>
              <Text style={styles.noAccountText}>{t.noAccount} </Text>
              <TouchableOpacity
                onPress={() => router.push('/auth/register')}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLinkText}>{t.registerLink}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Footer Role Switcher ─── */}
          <TouchableOpacity
            style={styles.switchRoleCard}
            onPress={() => {
              const nextRole = isMechanic ? 'customer' : 'mechanic';
              setSelectedRole(nextRole);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMechanic ? 'leaf-outline' : 'construct-outline'}
              size={18}
              color={BRAND_COLOR}
            />
            <Text style={styles.switchRoleCardText}>
              {isMechanic ? t.switchRoleFarmer : t.switchRoleMechanic}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  brandIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E0F2F5',
    letterSpacing: 0.5,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#A0BCC2',
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8CA6AB',
  },
  tabTextActive: {
    color: BRAND_COLOR,
    fontWeight: '800',
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
  formBlock: {
    width: '100%',
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
  hintText: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#78909C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#37474F',
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: BRAND_COLOR,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  registerPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    flexWrap: 'wrap',
  },
  noAccountText: {
    fontSize: 14,
    color: '#546E7A',
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_COLOR,
    textDecorationLine: 'underline',
  },
  switchRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 8,
  },
  switchRoleCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4E8EB',
  },
  testAccountBox: {
    backgroundColor: '#EBF4F6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  testAccountTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLOR,
    marginBottom: 6,
  },
  testAccountRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  testChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B2D8DE',
  },
  testChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#004957',
  },
  otpHeaderBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  otpHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#263238',
  },
  otpHeaderSub: {
    fontSize: 13,
    color: '#607D8B',
    marginTop: 4,
  },
  boldPhone: {
    fontWeight: '700',
    color: '#212121',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  otpCell: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#B0BEC5',
    backgroundColor: '#F4F7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellActive: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  otpCellFilled: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#EBF4F6',
  },
  otpCellText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#212121',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  changePhoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLOR,
  },
  countdownText: {
    fontSize: 12,
    color: '#78909C',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLOR,
  },
});
