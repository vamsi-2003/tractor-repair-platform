import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';

const BRAND_COLOR = '#006376'; // Casal Teal

const TAB_TRANSLATIONS: Record<string, { home: string; history: string; alerts: string; settings: string }> = {
  en: { home: 'Home', history: 'History', alerts: 'Alerts', settings: 'Settings' },
  te: { home: 'హోమ్', history: 'చరిత్ర', alerts: 'హెచ్చరికలు', settings: 'సెట్టింగ్‌లు' },
  hi: { home: 'होम', history: 'इतिहास', alerts: 'अलर्ट', settings: 'सेटिंग्स' },
  kn: { home: 'ಮುಖಪುಟ', history: 'ಇತಿಹಾಸ', alerts: 'ಎಚ್ಚರಿಕೆಗಳು', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು' },
  ta: { home: 'முகப்பு', history: 'வரலாறு', alerts: 'அறிவிப்புகள்', settings: 'அமைப்புகள்' },
};

export default function TabLayout() {
  const { language } = useAuthStore();
  const t = TAB_TRANSLATIONS[language] || TAB_TRANSLATIONS.en;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND_COLOR,
        tabBarInactiveTintColor: '#78909C',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: BRAND_COLOR,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarLabel: t.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t.history,
          tabBarLabel: t.history,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t.alerts,
          tabBarLabel: t.alerts,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings,
          tabBarLabel: t.settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
