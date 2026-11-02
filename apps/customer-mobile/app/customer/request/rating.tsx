import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  BackHandler,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';
import { useAuthStore } from '../../../store/authStore';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { APP_NAME, t } from '@tractor-repair/shared';

export default function RatingScreen() {
  const { currentJob, reset: resetRepair } = useRepairStore();
  const { user, language } = useAuthStore();

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['fixed_properly']);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trap Android hardware back button so it safely returns to Customer Home
  useEffect(() => {
    const onBackPress = () => {
      resetRepair();
      router.replace('/customer/(tabs)/home');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  const mechanic = currentJob?.mechanic;

  const toggleTag = (id: string) => {
    if (selectedTags.includes(id)) {
      setSelectedTags(selectedTags.filter((t) => t !== id));
    } else {
      setSelectedTags([...selectedTags, id]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (currentJob?.id) {
        // Fetch customer profile id
        let customerId: string | null = null;
        if (user?.id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle();
          customerId = customerData?.id || null;
        }

        // Insert review (PostgreSQL trigger on_review_created_update_stats automatically updates mechanic rating_avg and total_jobs with SECURITY DEFINER)
        await supabase.from('reviews').insert({
          job_id: currentJob.id,
          customer_id: customerId,
          mechanic_id: mechanic?.id,
          rating,
          tags: selectedTags,
          comment: comment.trim() || null,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Thank you! Your rating and feedback help ensure fair, quality tractor repairs.');
        resetRepair();
        router.replace('/customer/(tabs)/home');
      } else {
        Alert.alert(
          'Thank You!',
          'Your rating and feedback help ensure fair, quality tractor repairs across our network.',
          [
            {
              text: 'Return to Home',
              onPress: () => {
                resetRepair();
                router.replace('/customer/(tabs)/home');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.warn('Review submission notice:', err.message);
      resetRepair();
      router.replace('/customer/(tabs)/home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportProblem = () => {
    router.push('/customer/dispute/new');
  };

  const feedbackTags = [
    { id: 'arrived_on_time', label: t('arrivedOnTime', language) },
    { id: 'fixed_properly', label: t('fixedProperly', language) },
    { id: 'fair_price', label: t('fairPrice', language) },
    { id: 'polite', label: t('polite', language) },
  ];

  const getSpeechPrompt = () => {
    switch (language) {
      case 'te':
        return `చెల్లింపు పూర్తయింది. మీ మెకానిక్ ${mechanic?.name || ''} సేవ ఎలా ఉంది? స్టార్ రేటింగ్ ఎంచుకోండి, బాగున్న అంశాలను గుర్తించండి మరియు సమర్పించండి.`;
      case 'hi':
        return `भुगतान संपन्न हुआ। आपके मैकेनिक ${mechanic?.name || ''} की सेवा कैसी रही? स्टार रेटिंग चुनें, क्या अच्छा लगा बताएं और सबमिट करें।`;
      case 'kn':
        return `ಪಾವತಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ನಿಮ್ಮ ಮೆಕ್ಯಾನಿಕ್ ${mechanic?.name || ''} ಸೇವೆ ಹೇಗಿತ್ತು? ರೇಟಿಂಗ್ ಆಯ್ಕೆಮಾಡಿ, ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ಹಂಚಿಕೊಳ್ಳಿ ಮತ್ತು ಸಲ್ಲಿಸಿ.`;
      case 'ta':
        return `பணம் செலுத்தப்பட்டது. உங்கள் மெக்கானிக் ${mechanic?.name || ''} சேவை எவ்வாறு இருந்தது? மதிப்பீட்டைத் தேர்ந்தெடுத்து சமர்ப்பிக்கவும்.`;
      default:
        return `Payment done. How was your mechanic ${mechanic?.name || ''}? Select star rating, highlight what went well, add optional comments, and submit. Or report a problem instead.`;
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top Header Bar with Read-Aloud Speaker & Language Switcher */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LanguageToggle />
          <SpeechSpeaker text={getSpeechPrompt()} label="Read screen" />
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerSubtitle}>{t('paymentDone', language).toUpperCase()}</Text>
        <Text style={styles.headerTitle}>
          {t('howWas', language).toUpperCase()}{'\n'}
          {mechanic?.name?.toUpperCase() || 'YOUR MECHANIC'}?
        </Text>

        {/* Mechanic Avatar & Name */}
        <View style={styles.avatarContainer}>
          {mechanic?.avatarUrl ? (
            <Image source={{ uri: mechanic.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={42} color="#006376" />
            </View>
          )}
          <Text style={styles.mechanicNameText}>{mechanic?.name || 'Assigned Mechanic'}</Text>
          <Text style={styles.mechanicSubText}>Verified Tractor Specialist</Text>
        </View>

        {/* 5-Star Rating Card */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>{t('yourRating', language)}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
                accessibilityLabel={`${star} stars`}
                accessibilityRole="button"
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#FFA000' : '#CCCCCC'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* What Went Well Feedback Tags */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('whatWentWell', language)}</Text>
          <View style={styles.tagsContainer}>
            {feedbackTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                  onPress={() => toggleTag(tag.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  )}
                  <Text
                    style={[styles.tagText, isSelected && styles.tagTextSelected]}
                  >
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Comments Box */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('anythingElse', language)}</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share any comments on how the tractor was fixed..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Rating Button (Terracotta #C63C14) */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t('submitRating', language)}</Text>
          )}
        </TouchableOpacity>

        {/* Report a Problem Link */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReportProblem}>
          <Text style={styles.reportText}>{t('reportProblem', language)}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6DF',
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#006376',
    letterSpacing: 1.5,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006376',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1816',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 30,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDF8F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1816',
    marginTop: 8,
  },
  mechanicSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1816',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  starButton: {
    padding: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F0',
    borderWidth: 1,
    borderColor: '#E0DDD5',
  },
  tagPillSelected: {
    backgroundColor: '#006376',
    borderColor: '#006376',
  },
  tagText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FDFDFD',
    borderWidth: 1,
    borderColor: '#E0DDD5',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: '#222',
  },
  submitButton: {
    backgroundColor: '#006376', // Casal brand primary button
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reportButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  reportText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '700',
  },
});
