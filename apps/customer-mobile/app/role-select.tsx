import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, UserRole } from '../store/authStore';
import { APP_NAME } from '@tractor-repair/shared';

export default function RoleSelectScreen() {
  const { setSelectedRole, language } = useAuthStore();

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    router.push('/auth/sign-in');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <View style={styles.header}>
        <Text style={styles.appName}>{APP_NAME.toUpperCase()}</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {language === 'te'
            ? 'మీరు ఎవరు?'
            : language === 'hi'
            ? 'अपनी भूमिका चुनें'
            : 'WHO ARE YOU?'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'te'
            ? 'దయచేసి మీ పాత్రను ఎంచుకోండి'
            : language === 'hi'
            ? 'कृपया आगे बढ़ने के लिए चुनें'
            : 'Select how you would like to use the app'}
        </Text>

        <View style={styles.rolesContainer}>
          {/* Customer Option */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleSelectRole('customer')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="I need a mechanic"
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2E7D32' }]}>
              <Ionicons name="car-sport" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>
                {language === 'te'
                  ? 'నాకు మెకానిక్ కావాలి'
                  : language === 'hi'
                  ? 'मुझे मैकेनिक चाहिए'
                  : 'I need a mechanic'}
              </Text>
              <Text style={styles.roleSubtitle}>
                {language === 'te'
                  ? 'రైతు / ట్రాక్టర్ యజమాని'
                  : language === 'hi'
                  ? 'किसान / ट्रैक्टर मालिक'
                  : 'Farmer / Tractor Owner'}
              </Text>
              <Text style={styles.roleDesc}>
                {language === 'te'
                  ? 'సమీపంలోని నైపుణ్యం కలిగిన మెకానిక్‌ని బుక్ చేయండి'
                  : language === 'hi'
                  ? 'अपने खेत पर ट्रैक्टर रिपेयर बुक करें'
                  : 'Book verified doorstep repair for your tractor'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#2E7D32" />
          </TouchableOpacity>

          {/* Mechanic Option */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleSelectRole('mechanic')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="I am a mechanic"
          >
            <View style={[styles.iconCircle, { backgroundColor: '#1E3A5F' }]}>
              <Ionicons name="construct" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>
                {language === 'te'
                  ? 'నేను మెకానిక్'
                  : language === 'hi'
                  ? 'मैं मैकेनिक हूँ'
                  : "I'm a mechanic"}
              </Text>
              <Text style={styles.roleSubtitle}>
                {language === 'te'
                  ? 'ట్రాక్టర్ రిపేర్ సర్వీస్ ప్రొవైడర్'
                  : language === 'hi'
                  ? 'ट्रैक्टर रिपेयर सर्विस प्रोवाइडर'
                  : 'Tractor Repair Specialist'}
              </Text>
              <Text style={styles.roleDesc}>
                {language === 'te'
                  ? 'సమీప రిపేర్ ఆర్డర్లు పొందండి మరియు సంపాదించండి'
                  : language === 'hi'
                  ? 'आस-पास के ऑर्डर प्राप्त करें और कमाई करें'
                  : 'Accept nearby repair jobs and grow earnings'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>
            {language === 'te' ? '← భాష మార్చండి' : language === 'hi' ? '← भाषा बदलें' : '← Change Language'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 12,
  },
  appName: {
    fontSize: 14,
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    marginBottom: 28,
  },
  rolesContainer: {
    gap: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
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
    fontWeight: '700',
    color: '#212121',
  },
  roleSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
    marginTop: 2,
  },
  roleDesc: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    lineHeight: 16,
  },
  backButton: {
    marginTop: 32,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
});
