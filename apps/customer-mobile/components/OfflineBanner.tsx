import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { language } = useAuthStore();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      setIsOffline(!window.navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!isOffline) return null;

  const getOfflineText = () => {
    switch (language) {
      case 'te':
        return 'ఇంటర్నెట్ లేదు · నెట్‌వర్క్ రాగానే అప్‌డేట్ అవుతుంది';
      case 'hi':
        return 'कोई इंटरनेट नहीं · नेटवर्क आने पर अपडेट होगा';
      case 'kn':
        return 'ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವಿಲ್ಲ · ನೆಟ್‌ವರ್ಕ್ ಬಂದಾಗ ಅಪ್‌ಡೇಟ್ ಆಗುತ್ತದೆ';
      case 'ta':
        return 'இணைய இணைப்பு இல்லை · நெட்வொர்க் வந்ததும் புதுப்பிக்கப்படும்';
      default:
        return 'No Internet Connection · Updates will sync once connected';
    }
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>{getOfflineText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E65100', // High-visibility Amber/Orange
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
