import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

export default function RootLayout() {
  const { setSession, setLoading, fetchUserProfile } = useAuthStore();

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

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2E7D32',
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
          options={{
            title: 'Mechanic Registration',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#fff',
          }}
        />

        {/* Customer Stack */}
        <Stack.Screen
          name="customer/(tabs)"
          options={{ headerShown: false }}
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
    </>
  );
}
