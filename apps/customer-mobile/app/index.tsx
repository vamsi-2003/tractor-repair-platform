import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, language, profile, mechanic } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // If no language selected yet, go to language selection
  if (!language) {
    return <Redirect href="/language" />;
  }

  // If not authenticated, go to language/onboarding
  if (!isAuthenticated) {
    return <Redirect href="/language" />;
  }

  // If mechanic role
  if (profile?.role === 'mechanic') {
    if (!mechanic) {
      return <Redirect href="/auth/register" />;
    }
    return <Redirect href="/mechanic/(tabs)/home" />;
  }

  // Default to customer home
  return <Redirect href="/customer/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
  },
});
