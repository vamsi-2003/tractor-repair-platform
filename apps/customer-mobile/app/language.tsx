import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { APP_NAME, type Language } from '@tractor-repair/shared';

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export default function LanguageScreen() {
  const { setLanguage, isAuthenticated, profile } = useAuthStore();

  const handleSelectLanguage = (language: Language) => {
    setLanguage(language);
    if (isAuthenticated) {
      if (profile?.role === 'mechanic') {
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
      <View style={styles.header}>
        <Text style={styles.appName}>{APP_NAME.toUpperCase()}</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>CHOOSE YOUR{'\n'}LANGUAGE</Text>
        <Text style={styles.subtitle}>భాషను ఎంచుకోండి</Text>
        <Text style={styles.subtitle}>अपनी भाषा चुनें</Text>

        <View style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageButton}
              onPress={() => handleSelectLanguage(lang.code)}
              accessibilityLabel={`Select ${lang.name}`}
              accessibilityRole="button"
            >
              <View style={styles.languageContent}>
                <Text style={styles.languageNative}>{lang.nativeName}</Text>
                {lang.code !== 'en' && (
                  <Text style={styles.languageEnglish}>{lang.name}</Text>
                )}
              </View>
              <Text style={styles.languageArrow}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.languageButton, styles.languageDisabled]} disabled>
            <View style={styles.languageContent}>
              <Text style={[styles.languageNative, styles.languageDisabledText]}>
                More languages
              </Text>
              <Text style={[styles.languageEnglish, styles.languageDisabledText]}>
                Tamil, Kannada, Marathi…
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>You can change this later in Settings.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
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
    paddingTop: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  languageList: {
    marginTop: 32,
    gap: 12,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  languageContent: {
    flex: 1,
  },
  languageNative: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  languageEnglish: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  languageArrow: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300',
  },
  languageDisabled: {
    opacity: 0.4,
    borderStyle: 'dashed',
  },
  languageDisabledText: {
    color: 'rgba(255,255,255,0.5)',
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 24,
  },
});
