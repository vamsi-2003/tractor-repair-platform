import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, language, profile, mechanic, selectedRole, user } = useAuthStore();

  if (isLoading || (isAuthenticated && !profile)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E3A5F" />
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
  const isMechanic =
    profile?.role === 'mechanic' ||
    selectedRole === 'mechanic' ||
    Boolean(user?.phone && user.phone.endsWith('9902')) ||
    Boolean(user?.email && user.email.includes('mechanic'));

  if (isMechanic) {
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
