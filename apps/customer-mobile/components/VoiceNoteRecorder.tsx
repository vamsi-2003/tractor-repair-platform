import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuthStore } from '../store/authStore';

interface VoiceNoteRecorderProps {
  onRecordingComplete: (uri: string | null, durationSec?: number) => void;
  voiceNoteUri?: string | null;
  onDelete?: () => void;
}

export function VoiceNoteRecorder({ onRecordingComplete, voiceNoteUri, onDelete }: VoiceNoteRecorderProps) {
  const { language } = useAuthStore();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosSec, setPlaybackPosSec] = useState(0);

  const [recordedUri, setRecordedUri] = useState<string | null>(voiceNoteUri || null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync().catch(() => {});
    };
  }, [sound, recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          language === 'te' ? 'అనుమతి నిరాకరించబడింది' : 'Permission Denied',
          language === 'te'
            ? 'సమస్యను వాయిస్ రూపంలో వివరించడానికి మైక్రోఫోన్ అనుమతి అవసరం.'
            : 'Microphone permission is required to record a voice description of your tractor problem.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDurationSec(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDurationSec((prev) => {
          if (prev >= 60) {
            // Auto-stop at 60 seconds
            stopRecording(newRecording);
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Voice recording failed to start:', err);
      Alert.alert('Recording Error', err.message || 'Unable to initialize audio recorder.');
    }
  };

  const stopRecording = async (activeRecording?: Audio.Recording) => {
    const rec = activeRecording || recording;
    if (!rec) return;

    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setIsRecording(false);

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);

      if (uri) {
        setRecordedUri(uri);
        onRecordingComplete(uri, recordingDurationSec);
      }
    } catch (err) {
      console.warn('Failed to stop recording:', err);
    }
  };

  const currentUri = voiceNoteUri || recordedUri;

  const togglePlayback = async () => {
    if (!currentUri) return;

    try {
      if (isPlaying) {
        if (sound) await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        if (sound) {
          await sound.playAsync();
          setIsPlaying(true);
        } else {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: currentUri },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded) {
                setPlaybackPosSec(Math.round(status.positionMillis / 1000));
                if (status.didJustFinish) {
                  setIsPlaying(false);
                  setPlaybackPosSec(0);
                }
              }
            }
          );
          setSound(newSound);
          setIsPlaying(true);
        }
      }
    } catch (e) {
      console.warn('Playback error:', e);
    }
  };

  const deleteRecording = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setPlaybackPosSec(0);
    setRecordingDurationSec(0);
    setRecordedUri(null);
    onRecordingComplete(null, 0);
    if (onDelete) onDelete();
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // State A: Has recorded audio
  if (currentUri) {
    return (
      <View style={styles.reviewContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayback}
          accessibilityRole="button"
          accessibilityLabel="Play recorded voice note"
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.audioInfo}>
          <Text style={styles.audioLabel}>
            {language === 'te' ? 'రికార్డ్ చేయబడిన వాయిస్ నోట్' : 'Voice note recorded'}
          </Text>
          <Text style={styles.audioTimer}>
            {isPlaying ? formatSec(playbackPosSec) : `${formatSec(recordingDurationSec || 15)} sec`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={deleteRecording}
          accessibilityRole="button"
          accessibilityLabel="Delete voice note"
        >
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    );
  }

  // State B: Currently Recording
  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.recordingDot} />
        <Text style={styles.recordingText}>
          {language === 'te' ? 'రికార్డింగ్...' : 'Recording...'} {formatSec(recordingDurationSec)} / 1:00
        </Text>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={() => stopRecording()}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
        >
          <Ionicons name="stop" size={20} color="#FFFFFF" />
          <Text style={styles.stopButtonText}>{language === 'te' ? 'ఆపు' : 'Done'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State C: Default Idle - Matches Design "[🎤 Speak problem]"
  return (
    <TouchableOpacity
      style={styles.idleButton}
      onPress={startRecording}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Speak problem description"
    >
      <Ionicons name="mic-outline" size={20} color="#212121" />
      <Text style={styles.idleButtonText}>
        {language === 'te' ? 'సమస్యను చెప్పండి' : language === 'hi' ? 'बोलकर बताएं' : 'Speak problem'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  idleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F0',
    borderWidth: 1.5,
    borderColor: '#E0E0D8',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  idleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#EF5350',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D32F2F',
  },
  recordingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#C62828',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
  },
  audioLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  audioTimer: {
    fontSize: 11,
    color: '#558B2F',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 6,
  },
});
