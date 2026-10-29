import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export interface TractorItem {
  id: string;
  make: string;
  model: string;
  year?: number | null;
  registration_number?: string | null;
}

interface TractorSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTractor: (tractor: TractorItem) => void;
  selectedTractorId?: string | null;
}

export function TractorSelectorModal({
  visible,
  onClose,
  onSelectTractor,
  selectedTractorId,
}: TractorSelectorModalProps) {
  const { user, language } = useAuthStore();
  const [tractors, setTractors] = useState<TractorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newRegNumber, setNewRegNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      loadTractors();
    }
  }, [visible, user?.id]);

  const loadTractors = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (customer?.id) {
        const { data, error } = await supabase
          .from('tractors')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setTractors(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load tractors:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNewTractor = async () => {
    if (!newMake.trim() || !newModel.trim()) {
      Alert.alert(
        language === 'te' ? 'వివరాలు అవసరం' : 'Required',
        language === 'te' ? 'దయచేసి ట్రాక్టర్ కంపెనీ మరియు మోడల్ నమోదు చేయండి.' : 'Please enter tractor make and model.'
      );
      return;
    }

    setIsSaving(true);
    try {
      // 1. Get or create customer row
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user!.id)
        .maybeSingle();

      if (!customer) {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ profile_id: user!.id })
          .select('id')
          .single();
        if (custErr) throw custErr;
        customer = newCust;
      }

      // 2. Insert into tractors
      const { data: inserted, error: insertErr } = await supabase
        .from('tractors')
        .insert({
          customer_id: customer.id,
          make: newMake.trim(),
          model: newModel.trim(),
          year: newYear ? parseInt(newYear, 10) : null,
          registration_number: newRegNumber.trim() || null,
        })
        .select('*')
        .single();

      if (insertErr) throw insertErr;

      if (inserted) {
        setTractors([inserted, ...tractors]);
        onSelectTractor(inserted);
        setIsAddingNew(false);
        setNewMake('');
        setNewModel('');
        setNewYear('');
        setNewRegNumber('');
        onClose();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save tractor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>
              {isAddingNew
                ? (language === 'te' ? 'కొత్త ట్రాక్టర్ జోడించండి' : 'Add New Tractor')
                : (language === 'te' ? 'మీ ట్రాక్టర్‌ను ఎంచుకోండి' : 'Choose Your Tractor')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#616161" />
            </TouchableOpacity>
          </View>

          {isAddingNew ? (
            <View style={styles.formContainer}>
              <Text style={styles.fieldLabel}>Make / Company (e.g. Mahindra, Swaraj, John Deere)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mahindra"
                value={newMake}
                onChangeText={setNewMake}
              />

              <Text style={styles.fieldLabel}>Model (e.g. 575 DI, 744 FE, 5050 D)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 575 DI"
                value={newModel}
                onChangeText={setNewModel}
              />

              <Text style={styles.fieldLabel}>Year of Manufacture (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2021"
                keyboardType="numeric"
                value={newYear}
                onChangeText={setNewYear}
                maxLength={4}
              />

              <Text style={styles.fieldLabel}>Registration Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. AP 29 BX 1234"
                value={newRegNumber}
                onChangeText={setNewRegNumber}
                autoCapitalize="characters"
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setIsAddingNew(false)}
                >
                  <Text style={styles.cancelFormText}>Back to Saved</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveNewTractor}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save & Select</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color="#2E7D32" />
                </View>
              ) : (
                <FlatList
                  data={tractors}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="car-sport-outline" size={48} color="#9E9E9E" />
                      <Text style={styles.emptyTitle}>No saved tractors found</Text>
                      <Text style={styles.emptySubtitle}>
                        Add your tractor details once for quick 1-tap booking in the future.
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isSelected = selectedTractorId === item.id;
                    return (
                      <TouchableOpacity
                        style={[styles.tractorCard, isSelected && styles.tractorCardSelected]}
                        onPress={() => {
                          onSelectTractor(item);
                          onClose();
                        }}
                      >
                        <View style={styles.tractorIconCircle}>
                          <Ionicons name="car-sport" size={24} color="#2E7D32" />
                        </View>
                        <View style={styles.tractorDetails}>
                          <Text style={styles.tractorName}>
                            {item.make} {item.model}
                          </Text>
                          <Text style={styles.tractorMeta}>
                            {[item.year, item.registration_number].filter(Boolean).join(' • ') || 'Saved Tractor'}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => setIsAddingNew(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#2E7D32" />
                <Text style={styles.addNewButtonText}>+ Add a new tractor</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#424242',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  tractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  tractorCardSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  tractorIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tractorDetails: {
    flex: 1,
  },
  tractorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  tractorMeta: {
    fontSize: 13,
    color: '#616161',
    marginTop: 2,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  addNewButtonText: {
    color: '#2E7D32',
    fontSize: 15,
    fontWeight: '700',
  },
  formContainer: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212121',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    alignItems: 'center',
  },
  cancelFormText: {
    color: '#616161',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
