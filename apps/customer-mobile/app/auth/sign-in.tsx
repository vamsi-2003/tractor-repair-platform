import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { APP_NAME } from '@tractor-repair/shared';

export default function SignInScreen() {
  const { language, selectedRole, setSelectedRole, setSession, setProfile, fetchUserProfile } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);

  const isMechanic = selectedRole === 'mechanic';
  const primaryColor = isMechanic ? '#1E3A5F' : '#2E7D32';

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    if (cleanPhone.length !== 10) {
      setErrorMessage(
        language === 'te'
          ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి'
          : language === 'hi'
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें'
          : 'Please enter a valid 10-digit mobile number'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Test accounts for two-phone verification build phase
      if (cleanPhone === '9999999901' || cleanPhone === '9999999902') {
        setStep('otp');
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
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send OTP code. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (otp.length !== 6) {
      setErrorMessage(
        language === 'te'
          ? 'దయచేసి 6 అంకెల ధృవీకరణ కోడ్‌ను నమోదు చేయండి'
          : language === 'hi'
          ? 'कृपया 6 अंकों का सत्यापन कोड दर्ज करें'
          : 'Please enter the 6-digit verification code'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Test accounts verification
      if (cleanPhone === '9999999901' || cleanPhone === '9999999902') {
        if (otp !== '123456') {
          setErrorMessage('Invalid verification code. Use fixed OTP: 123456 for test accounts.');
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

        // Fetch or create profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        let userRole = selectedRole || 'customer';

        if (!existingProfile) {
          // New user registration - fixed role assigned
          const defaultName =
            userRole === 'mechanic'
              ? `Mechanic (${cleanPhone.slice(-4)})`
              : `Farmer (${cleanPhone.slice(-4)})`;

          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.session.user.id,
            role: userRole,
            full_name: defaultName,
            phone: `+91${cleanPhone}`,
            preferred_language: language || 'en',
            is_active: true,
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          if (userRole === 'customer') {
            await supabase.from('customers').insert({
              profile_id: data.session.user.id,
            });
            await fetchUserProfile(data.session.user.id);
            router.replace('/customer/(tabs)/home');
          } else {
            // Mechanic needs registration
            await fetchUserProfile(data.session.user.id);
            router.replace('/auth/register');
          }
        } else {
          // Existing profile - role is fixed
          userRole = existingProfile.role;
          setSelectedRole(userRole as any);
          setProfile(existingProfile);
          await fetchUserProfile(data.session.user.id);

          if (userRole === 'mechanic') {
            const { data: mech } = await supabase
              .from('mechanics')
              .select('id, status')
              .eq('profile_id', existingProfile.id)
              .maybeSingle();

            if (!mech) {
              router.replace('/auth/register');
            } else {
              router.replace('/mechanic/(tabs)/home');
            }
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

  const handleResendOtp = async () => {
    setOtp('');
    await handleSendOtp();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: primaryColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.headerLabel}>
            {isMechanic
              ? (language === 'te' ? 'మెకానిక్ సైన్ ఇన్' : language === 'hi' ? 'मैकेनिक साइन इन' : 'MECHANIC SIGN IN')
              : (language === 'te' ? 'రైతు / కస్టమర్ సైన్ ఇన్' : language === 'hi' ? 'किसान साइन इन' : 'CUSTOMER SIGN IN')}
          </Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {step === 'phone'
              ? (language === 'te' ? 'మీ మొబైల్ నంబర్\nనమోదు చేయండి' : language === 'hi' ? 'अपना मोबाइल नंबर\nदर्ज करें' : 'ENTER YOUR\nMOBILE NUMBER')
              : (language === 'te' ? 'SMS కోడ్‌ను\nనమోదు చేయండి' : language === 'hi' ? 'SMS कोड\nदर्ज करें' : 'ENTER 6-DIGIT\nSMS CODE')}
          </Text>

          {/* Error Message Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Phone Input Step */}
          {step === 'phone' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'te' ? 'మొబైల్ సంఖ్య' : language === 'hi' ? 'मोबाइल नंबर' : 'Mobile number'}
                </Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    accessibilityLabel="Phone number"
                  />
                </View>
              </View>

              <Text style={styles.hint}>
                {language === 'te'
                  ? 'మేము SMS ద్వారా 6 అంకెల ధృవీకరణ కోడ్‌ను పంపుతాము.'
                  : language === 'hi'
                  ? 'हम SMS द्वारा 6-अंकों का सत्यापन कोड भेजेंगे।'
                  : "We'll send a 6-digit verification code by SMS."}
              </Text>

              <TouchableOpacity
                style={[styles.button, cleanPhone.length < 10 && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={cleanPhone.length < 10 || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Send verification code"
              >
                {isLoading ? (
                  <ActivityIndicator color={primaryColor} />
                ) : (
                  <Text style={[styles.buttonText, { color: primaryColor }]}>
                    {language === 'te' ? 'కోడ్ పంపండి' : language === 'hi' ? 'कोड भेजें' : 'Send code'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Role Toggle Link */}
              <TouchableOpacity
                style={styles.switchRoleButton}
                onPress={() => router.replace('/role-select')}
              >
                <Text style={styles.switchRoleText}>
                  {isMechanic
                    ? (language === 'te' ? 'రైతుగా సైన్ ఇన్ చేయాలా? ఇక్కడ నొక్కండి' : 'Looking for tractor repair? Tap here')
                    : (language === 'te' ? 'మెకానిక్‌గా సైన్ ఇన్ చేయాలా? ఇక్కడ నొక్కండి' : 'Are you a mechanic? Tap here')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* OTP Input Step */}
          {step === 'otp' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'te'
                    ? `+91 ${cleanPhone} కి పంపిన 6-అంకెల కోడ్`
                    : language === 'hi'
                    ? `+91 ${cleanPhone} पर भेजा गया 6-अंकीय कोड`
                    : `6-digit code sent to +91 ${cleanPhone}`}
                </Text>

                {/* 6 Digit Input Boxes */}
                <View style={styles.otpBoxesContainer}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        otp.length === index && styles.otpBoxActive,
                        otp.length > index && styles.otpBoxFilled,
                      ]}
                    >
                      <Text style={styles.otpBoxText}>{otp[index] || ''}</Text>
                    </View>
                  ))}
                </View>

                {/* Hidden input overlay to capture all 6 keystrokes */}
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenOtpInput}
                  value={otp}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 6);
                    setOtp(cleaned);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <View style={styles.otpActionRow}>
                <TouchableOpacity onPress={() => setStep('phone')} disabled={isLoading}>
                  <Text style={styles.resendText}>
                    {language === 'te' ? 'నంబర్ మార్చండి' : language === 'hi' ? 'नंबर बदलें' : 'Change number'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                  <Text style={styles.resendText}>
                    {language === 'te' ? 'కోడ్ మళ్లీ పంపండి' : language === 'hi' ? 'कोड दोबारा भेजें' : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, otp.length < 6 && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={otp.length < 6 || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Verify and continue"
              >
                {isLoading ? (
                  <ActivityIndicator color={primaryColor} />
                ) : (
                  <Text style={[styles.buttonText, { color: primaryColor }]}>
                    {language === 'te' ? 'ధృవీకరించి కొనసాగించండి' : language === 'hi' ? 'सत्यापित करें और आगे बढ़ें' : 'Verify & Continue'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ alignItems: 'center', marginTop: 'auto', paddingVertical: 16 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>
              {APP_NAME} • v1.0.0 (Build 1)
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 12,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 8,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    height: 56,
  },
  countryCode: {
    width: 64,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  countryCodeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  switchRoleButton: {
    marginTop: 24,
    alignSelf: 'center',
    padding: 10,
  },
  switchRoleText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  otpBoxFilled: {
    borderColor: '#FFFFFF',
  },
  otpBoxText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: '100%',
    height: 56,
    opacity: 0.01,
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  resendText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
