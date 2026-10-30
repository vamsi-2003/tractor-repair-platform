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
import { APP_NAME } from '@tractor-repair/shared';

const FEEDBACK_TAGS = [
  { id: 'arrived_on_time', label: 'Arrived on time' },
  { id: 'fixed_properly', label: 'Fixed it properly' },
  { id: 'fair_price', label: 'Fair price' },
  { id: 'polite', label: 'Polite' },
];

export default function RatingScreen() {
  const { currentJob, reset: resetRepair } = useRepairStore();
  const { user } = useAuthStore();

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

        // Insert review
        await supabase.from('reviews').insert({
          job_id: currentJob.id,
          customer_id: customerId,
          mechanic_id: mechanic?.id,
          rating,
          tags: selectedTags,
          comment: comment.trim() || null,
        });

        // Recalculate mechanic rating and jobs count
        if (mechanic?.id) {
          const { data: allReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('mechanic_id', mechanic.id);

          if (allReviews && allReviews.length > 0) {
            const avg =
              allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            await supabase
              .from('mechanics')
              .update({
                rating_avg: avg,
                total_jobs: (mechanic.totalJobs || 0) + 1,
              })
              .eq('id', mechanic.id);
          }
        }
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

  const speechText = `Payment done. How was your mechanic ${mechanic?.name || ''}? Select star rating, highlight what went well, add optional comments, and submit. Or report a problem instead.`;

  return (
    <View style={styles.screenWrapper}>
      {/* Top Header Bar with Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
        <SpeechSpeaker text={speechText} label="Read screen" />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerSubtitle}>PAYMENT DONE</Text>
        <Text style={styles.headerTitle}>
          HOW WAS{'\n'}
          {mechanic?.name?.toUpperCase() || 'YOUR MECHANIC'}?
        </Text>

        {/* Mechanic Avatar & Name */}
        <View style={styles.avatarContainer}>
          {mechanic?.avatarUrl ? (
            <Image source={{ uri: mechanic.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={42} color="#C63C14" />
            </View>
          )}
          <Text style={styles.mechanicNameText}>{mechanic?.name || 'Assigned Mechanic'}</Text>
          <Text style={styles.mechanicSubText}>Verified Tractor Specialist</Text>
        </View>

        {/* 5-Star Rating Card */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Your rating</Text>
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
          <Text style={styles.sectionTitle}>What went well?</Text>
          <View style={styles.tagsContainer}>
            {FEEDBACK_TAGS.map((tag) => {
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
          <Text style={styles.sectionTitle}>Anything else? (optional)</Text>
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
            <Text style={styles.submitButtonText}>Submit rating</Text>
          )}
        </TouchableOpacity>

        {/* Report a Problem Link */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReportProblem}>
          <Text style={styles.reportText}>Report a problem instead</Text>
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
    color: '#C63C14',
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
    color: '#C63C14',
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
    backgroundColor: '#FDEEE9',
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
    backgroundColor: '#C63C14',
    borderColor: '#C63C14',
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
    backgroundColor: '#C63C14', // Terracotta primary button
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
