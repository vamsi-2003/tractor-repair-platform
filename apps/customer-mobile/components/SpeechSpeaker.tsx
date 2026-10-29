import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
      default:
        return 'en-IN';
    }
  };

  const handleToggleSpeak = async () => {
    try {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking || isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
      } else {
        if (!actualText.trim()) return;
        setIsSpeaking(true);
        Speech.speak(actualText, {
          language: getLanguageTag(),
          rate: 0.88,
          pitch: 1.0,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (e) {
      console.warn('Text-to-speech notice:', e);
      setIsSpeaking(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleToggleSpeak}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Read screen aloud"
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
});
