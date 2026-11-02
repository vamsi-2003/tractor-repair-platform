import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAuthStore } from '../store/authStore';

interface SpeechSpeakerProps {
  textToSpeak?: string;
  text?: string;
  label?: string;
  size?: number;
  color?: string;
  activeColor?: string;
}

export function SpeechSpeaker({
  textToSpeak,
  text,
  label = 'Read screen aloud',
  size = 24,
  color = '#2E7D32',
  activeColor = '#E65100',
}: SpeechSpeakerProps) {
  const actualText = textToSpeak || text || '';
  const { language } = useAuthStore();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const getLanguageTag = () => {
    switch (language) {
      case 'te':
        return 'te-IN';
      case 'hi':
        return 'hi-IN';
      case 'kn':
        return 'kn-IN';
      case 'ta':
        return 'ta-IN';
      default:
        return 'en-IN';
    }
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        Speech.stop().catch(() => {});
      }
    };
  }, []);

  const handleToggleSpeak = async () => {
    if (!actualText.trim()) return;

    const langTag = getLanguageTag();

    // 1. Direct Web Speech API support for seamless browser execution
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking || isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(actualText);
      utterance.lang = langTag;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Find best matching voice for Indian languages if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang === langTag || v.lang.startsWith(langTag.split('-')[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (err) => {
        console.warn('Web speech synthesis notice:', err);
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
      return;
    }

    // 2. Mobile Native execution (Expo Speech)
    try {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking || isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        Speech.speak(actualText, {
          language: langTag,
          rate: 0.88,
          pitch: 1.0,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (e) {
      console.warn('Native speech notice:', e);
      setIsSpeaking(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isSpeaking && styles.buttonActive]}
      onPress={handleToggleSpeak}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
        size={size}
        color={isSpeaking ? activeColor : color}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#FFF3E0',
  },
});
