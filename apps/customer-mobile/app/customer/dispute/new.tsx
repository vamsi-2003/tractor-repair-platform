import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useRepairStore } from '../../../store/repairStore';
import { useAuthStore } from '../../../store/authStore';

const ISSUE_CATEGORIES = [
  'Overcharged on spare parts or labor',
  'Mechanic did not arrive or arrived late',
  'Repair was ineffective or broke again',
  'Mechanic demanded cash without finish code',
  'Other billing or behavior issue',
];

export default function DisputeNewScreen() {
  const { currentJob } = useRepairStore();
  const { user } = useAuthStore();

  const [selectedCategory, setSelectedCategory] = useState(ISSUE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Details Required', 'Please provide a brief explanation of the problem.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.id) {
        const { error } = await supabase.from('support_tickets').insert({
          job_id: currentJob?.id || null,
          reporter_id: user.id,
          subject: selectedCategory,
          description: description.trim(),
          status: 'open',
          priority: 'high',
        });

        if (error) throw error;
      }

      Alert.alert(
        'Dispute Registered',
        'Our support team will review your report, inspect the mechanic and invoice logs, and contact you directly.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to file report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerSubtitle}>CUSTOMER SUPPORT</Text>
      <Text style={styles.headerTitle}>REPORT A PROBLEM{'\n'}OR DISPUTE</Text>

      <Text style={styles.sectionTitle}>What issue did you experience?</Text>
      <View style={styles.card}>
        {ISSUE_CATEGORIES.map((cat, idx) => {
          const isSelected = selectedCategory === cat;
          return (
            <React.Fragment key={cat}>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => setSelectedCategory(cat)}
              >
                <View
                  style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                >
                  {isSelected && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
              {idx < ISSUE_CATEGORIES.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Explain what happened</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Provide as much detail as possible (e.g. incorrect price, tractor behavior)..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit to Support Team</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#D32F2F',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D32F2F',
  },
  radioText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
  radioTextSelected: {
    color: '#333',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
