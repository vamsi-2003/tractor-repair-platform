import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-60));

  const checkNetwork = async () => {
    try {
      if (Platform.OS === 'web') {
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        handleStateChange(!online);
        return;
      }

      const state = await Network.getNetworkStateAsync();
      const offline = !state.isConnected || state.isInternetReachable === false;
      handleStateChange(offline);
    } catch {
      // If network check fails, don't block user
    }
  };

  const handleStateChange = (offline: boolean) => {
    if (offline) {
      setIsOffline(true);
      setShowRestored(false);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      if (isOffline) {
        // Was offline and now restored
        setIsOffline(false);
        setShowRestored(true);
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -60,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowRestored(false));
        }, 3000);
      }
    }
  };

  useEffect(() => {
    checkNetwork();

    // Periodic check every 5 seconds (vital for rural 2G packet loss)
    const interval = setInterval(checkNetwork, 5000);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => handleStateChange(false);
      const handleOffline = () => handleStateChange(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => clearInterval(interval);
  }, [isOffline]);

  if (!isOffline && !showRestored) {
    return null;
  }

  const isWarning = isOffline;

  return (
    <Animated.View
      style={[
        styles.banner,
        isWarning ? styles.bannerOffline : styles.bannerOnline,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <MaterialCommunityIcons
        name={isWarning ? 'wifi-off' : 'wifi-check'}
        size={18}
        color="#FFFFFF"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.bannerText}>
        {isWarning
          ? 'Poor or No Connection • Reconnecting to Tractor Seva...'
          : 'Back Online • Connected to Tractor Seva'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  bannerOffline: {
    backgroundColor: '#C62828', // Strong Crimson Red
  },
  bannerOnline: {
    backgroundColor: '#2E7D32', // Emerald Forest Green
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
