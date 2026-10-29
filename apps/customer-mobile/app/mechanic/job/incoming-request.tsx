import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useJobStore } from '../../../store/jobStore';
import { formatDistance, formatDuration } from '@tractor-repair/shared';

const { width } = Dimensions.get('window');

export default function IncomingRequestScreen() {
  const { incomingRequest, acceptIncomingRequest, declineIncomingRequest } = useJobStore();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voicePositionSec, setVoicePositionSec] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Handle hardware back safely
  useEffect(() => {
    const onBackPress = () => {
      declineIncomingRequest();
      router.replace('/mechanic/(tabs)/home');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  // If request expires or is null, exit (only if not currently accepting)
  useEffect(() => {
    if (!incomingRequest && !isAccepting) {
      router.replace('/mechanic/(tabs)/home');
    }
  }, [incomingRequest, isAccepting]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Handle Voice Note playback
  const handleToggleVoiceNote = async () => {
    try {
      if (isPlayingVoice) {
        if (sound) {
          await sound.pauseAsync();
        }
        setIsPlayingVoice(false);
      } else {
        if (sound) {
          await sound.playAsync();
          setIsPlayingVoice(true);
        } else if (incomingRequest?.voiceNoteUrl) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: incomingRequest.voiceNoteUrl },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded) {
                setVoicePositionSec(Math.round(status.positionMillis / 1000));
                if (status.didJustFinish) {
                  setIsPlayingVoice(false);
                  setVoicePositionSec(0);
                }
              }
            }
          );
          setSound(newSound);
          setIsPlayingVoice(true);
        } else {
          // Simulation fallback
          setIsPlayingVoice(true);
          const dur = incomingRequest?.voiceNoteDurationSec || 15;
          let current = 0;
          const timer = setInterval(() => {
            current += 1;
            setVoicePositionSec(current);
            if (current >= dur) {
              clearInterval(timer);
              setIsPlayingVoice(false);
              setVoicePositionSec(0);
            }
          }, 1000);
        }
      }
    } catch (e) {
      // Audio playback fallback simulation
      setIsPlayingVoice(!isPlayingVoice);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      if (sound) {
        await sound.stopAsync();
      }
      const success = await acceptIncomingRequest();
      if (success) {
        router.replace('/mechanic/job/active-job');
      } else {
        setIsAccepting(false);
        Alert.alert(
          'Request Unavailable',
          'This repair request is no longer available or was taken by another mechanic.',
          [{ text: 'OK', onPress: () => router.replace('/mechanic/(tabs)/home') }]
        );
      }
    } catch (err: any) {
      setIsAccepting(false);
      Alert.alert('Error', err?.message || 'Failed to accept job. Please try again.');
    }
  };

  const handleDecline = () => {
    if (sound) {
      sound.stopAsync();
    }
    declineIncomingRequest();
    router.replace('/mechanic/(tabs)/home');
  };

  if (!incomingRequest) {
    return null;
  }

  const secondsLeft = incomingRequest.secondsRemaining ?? 30;
  const progressRatio = secondsLeft / 30;

  // Dynamic urgency color
  const timerColor =
    secondsLeft > 15 ? '#00C853' : secondsLeft > 7 ? '#FFB300' : '#FF5252';

  return (
    <View style={styles.container}>
      {/* 30-Second Countdown Timer Bar */}
      <View style={styles.timerBarWrapper}>
        <View style={styles.timerTopRow}>
          <View style={styles.timerLeft}>
            <Ionicons name="time" size={20} color={timerColor} />
            <Text style={styles.timerTitle}>NEW REQUEST DISPATCH</Text>
          </View>
          <View style={[styles.timerBadge, { backgroundColor: timerColor }]}>
            <Text style={styles.timerBadgeText}>{secondsLeft}s</Text>
          </View>
        </View>

        {/* Progress track */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.max(0, Math.min(100, progressRatio * 100))}%`,
                backgroundColor: timerColor,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Distance & ETA Hero Banner */}
        <View style={styles.etaCard}>
          <View style={styles.etaItem}>
            <Ionicons name="navigate-circle" size={28} color="#FFB300" />
            <View>
              <Text style={styles.etaLabel}>DISTANCE</Text>
              <Text style={styles.etaVal}>{formatDistance(incomingRequest.distanceKm)}</Text>
            </View>
          </View>

          <View style={styles.etaDivider} />

          <View style={styles.etaItem}>
            <Ionicons name="speedometer" size={28} color="#00E676" />
            <View>
              <Text style={styles.etaLabel}>ARRIVAL ETA</Text>
              <Text style={styles.etaVal}>~{formatDuration(incomingRequest.etaMinutes)}</Text>
            </View>
          </View>
        </View>

        {/* Location & GPS Pin Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color="#E65100" />
            <Text style={styles.cardTitle}>FARMER & BREAKDOWN LOCATION</Text>
          </View>

          <Text style={styles.customerName}>{incomingRequest.customerName}</Text>
          <View style={styles.phoneHiddenBadge}>
            <Ionicons name="lock-closed" size={12} color="#94A3B8" />
            <Text style={styles.phoneHiddenText}>Customer mobile number hidden until Accept</Text>
          </View>
          <Text style={styles.customerArea}>
            📍 {incomingRequest.customerArea}, {incomingRequest.village}
          </Text>
          <Text style={styles.customerSubarea}>
            Mandal: {incomingRequest.mandal} • District: {incomingRequest.district}
          </Text>

          {/* GPS Pin View */}
          <View style={styles.mapPinPreview}>
            <View style={styles.mapPinBadge}>
              <Ionicons name="pin" size={20} color="#FF1744" />
              <Text style={styles.mapPinText}>GPS: {incomingRequest.latitude.toFixed(4)}, {incomingRequest.longitude.toFixed(4)}</Text>
            </View>
            <Text style={styles.mapHintText}>Coordinates verified by customer's phone GPS</Text>
          </View>
        </View>

        {/* Tractor Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="construct" size={20} color="#1E3A5F" />
            <Text style={styles.cardTitle}>TRACTOR & REPORTED FAULT</Text>
          </View>

          <View style={styles.tractorRow}>
            <Text style={styles.tractorMakeModel}>
              🚜 {incomingRequest.tractorMake} {incomingRequest.tractorModel}
            </Text>
            {incomingRequest.tractorYear && (
              <View style={styles.yearPill}>
                <Text style={styles.yearText}>{incomingRequest.tractorYear}</Text>
              </View>
            )}
          </View>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              System: {incomingRequest.problemCategoryName.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.problemDesc}>"{incomingRequest.reportedProblem}"</Text>
        </View>

        {/* Voice Note Player */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mic" size={20} color="#00C853" />
            <Text style={styles.cardTitle}>FARMER VOICE NOTE</Text>
          </View>

          <View style={styles.voicePlayer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handleToggleVoiceNote}
            >
              <Ionicons
                name={isPlayingVoice ? 'pause' : 'play'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.waveformContainer}>
              <View style={styles.waveformBars}>
                {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 60, 30, 85, 40].map(
                  (h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: h * 0.35,
                          backgroundColor:
                            i * 2 <= voicePositionSec ? '#00C853' : '#CBD5E0',
                        },
                      ]}
                    />
                  )
                )}
              </View>
              <Text style={styles.voiceDuration}>
                {isPlayingVoice
                  ? `00:${voicePositionSec < 10 ? '0' : ''}${voicePositionSec}`
                  : `00:${incomingRequest.voiceNoteDurationSec || 24}s`}
              </Text>
            </View>
          </View>
          <Text style={styles.voiceHint}>
            Listen to hear abnormal sounds, knocks, or warning lights described.
          </Text>
        </View>

        {/* Breakdown Photos */}
        {incomingRequest.photoUrls.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="images" size={20} color="#1E3A5F" />
              <Text style={styles.cardTitle}>ATTACHED PHOTOS ({incomingRequest.photoUrls.length})</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {incomingRequest.photoUrls.map((url, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: url }} style={styles.thumbImage} />
                  <View style={styles.zoomBadge}>
                    <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.photoHint}>Tap any image to view high-resolution photo.</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Footer: Accept & Decline */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={handleDecline}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle" size={22} color="#FF5252" />
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={isAccepting}
          activeOpacity={0.8}
        >
          {isAccepting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.acceptText}>ACCEPT JOB</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark Slate for high contrast urgency
  },
  timerBarWrapper: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  timerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timerBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E65100',
  },
  etaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  etaDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334155',
    marginHorizontal: 10,
  },
  etaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  etaVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  phoneHiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  phoneHiddenText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  customerArea: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB300',
    marginTop: 4,
  },
  customerSubarea: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  mapPinPreview: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapHintText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  tractorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tractorMakeModel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  yearPill: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  yearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(230, 81, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E65100',
  },
  categoryBadgeText: {
    color: '#FFB300',
    fontSize: 11,
    fontWeight: '800',
  },
  problemDesc: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  voiceHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  },
  photoList: {
    flexDirection: 'row',
    marginTop: 4,
  },
  thumbImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 6,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  photoHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#FF5252',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5252',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    elevation: 4,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: width * 0.95,
    height: width * 0.95,
  },
});
