import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { initCrashReporting } from '../services/crashReporting';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { UpdateRequiredModal } from '../components/UpdateRequiredModal';
import { setupNotificationChannels } from '../services/notifications';

// Initialize global uncaught crash telemetry & notification channels
initCrashReporting();
setupNotificationChannels();

export default function RootLayout() {
  const { session, profile, selectedRole, isLoading, setSession, setLoading, fetchUserProfile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Strict Role Guard
  useEffect(() => {
    if (isLoading || !session?.user || !profile) {
      return;
    }

    const rootSegment = segments[0];
    const isMechanic = profile?.role
      ? profile.role === 'mechanic'
      : (session?.user?.phone?.endsWith('9902') || selectedRole === 'mechanic');

    if (isMechanic && rootSegment === 'customer') {
      // Mechanics cannot access customer screens
      router.replace('/mechanic/(tabs)/home');
    } else if (!isMechanic && rootSegment === 'mechanic') {
      // Customers cannot access mechanic screens
      router.replace('/customer/(tabs)/home');
    }
  }, [segments, session, profile, selectedRole, isLoading]);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <OfflineBanner />
      <UpdateRequiredModal />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#006376',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#F5F5F5',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="language"
          options={{ title: 'Choose Language', headerShown: false }}
        />
        <Stack.Screen
          name="role-select"
          options={{ title: 'Select Role', headerShown: false }}
        />
        <Stack.Screen
          name="auth/sign-in"
          options={{ title: 'Sign In', headerShown: false }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ headerShown: false }}
        />

        {/* Common Screens */}
        <Stack.Screen
          name="about"
          options={{ title: 'About Tractor Seva', headerShown: false }}
        />
        <Stack.Screen
          name="account-delete"
          options={{ title: 'Delete Account', headerShown: false }}
        />

        {/* Customer Stack */}
        <Stack.Screen
          name="customer/(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="customer/settings/profile-edit"
          options={{ title: 'Farmer Profile', headerShown: false }}
        />
        <Stack.Screen
          name="customer/request/new"
          options={{ title: 'New Repair Request' }}
        />
        <Stack.Screen
          name="customer/request/finding-mechanic"
          options={{ title: 'Finding Mechanic', headerBackVisible: false }}
        />
        <Stack.Screen
          name="customer/request/mechanic-assigned"
          options={{ title: 'Mechanic Assigned' }}
        />
        <Stack.Screen
          name="customer/request/quote-approval"
          options={{ title: 'Approve Quote' }}
        />
        <Stack.Screen
          name="customer/request/bill"
          options={{ title: 'Your Bill' }}
        />
        <Stack.Screen
          name="customer/request/payment"
          options={{ title: 'Payment' }}
        />
        <Stack.Screen
          name="customer/request/rating"
          options={{ title: 'Rate Mechanic' }}
        />
        <Stack.Screen
          name="customer/dispute/new"
          options={{ title: 'Report a Problem' }}
        />

        {/* Mechanic Stack */}
        <Stack.Screen
          name="mechanic/(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="mechanic/settings/profile-edit"
          options={{ title: 'Mechanic Profile', headerShown: false }}
        />
        <Stack.Screen
          name="mechanic/settings/documents"
          options={{ title: 'Verification Documents', headerShown: false }}
        />
        <Stack.Screen
          name="mechanic/settings/skills"
          options={{ title: 'Active Repair Skills', headerShown: false }}
        />
        <Stack.Screen
          name="mechanic/settings/radius"
          options={{ title: 'Service Radius', headerShown: false }}
        />
        <Stack.Screen
          name="mechanic/settings/availability"
          options={{ title: 'Service Availability', headerShown: false }}
        />
        <Stack.Screen
          name="mechanic/job/incoming-request"
          options={{
            title: 'Incoming Repair Request',
            headerBackVisible: false,
            headerStyle: { backgroundColor: '#E65100' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="mechanic/job/active-job"
          options={{
            title: 'Active Repair Job',
            headerBackVisible: false,
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="mechanic/job/finish-job"
          options={{
            title: 'Finish Job & Payment',
            headerStyle: { backgroundColor: '#2E7D32' },
            headerTintColor: '#FFFFFF',
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
