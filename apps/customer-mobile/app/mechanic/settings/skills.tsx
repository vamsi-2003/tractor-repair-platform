import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

const BRAND_COLOR = '#006376';
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';

interface CategoryItem {
  id: string;
  name_en: string;
  name_te?: string;
  name_hi?: string;
  icon?: string;
}

export default function MechanicSkillsScreen() {
  const { mechanic, language } = useAuthStore();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([
    'Fuel Injection Calibration',
    'Rotavator Gearbox',
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Add Skill Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

  useEffect(() => {
    async function loadSkills() {
      setIsLoading(true);
      try {
        const { data: catData } = await supabase
          .from('problem_categories')
          .select('id, name_en, name_te, name_hi, icon')
          .order('name_en');

        if (catData) setCategories(catData);

        if (mechanic?.id) {
          const { data: skillData } = await supabase
            .from('mechanic_skills')
            .select('category_id')
            .eq('mechanic_id', mechanic.id);

          if (skillData) {
            setActiveSkillIds(skillData.map((s: any) => s.category_id));
          }
        }
      } catch (e) {
        console.warn('Error loading skills:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSkills();
  }, [mechanic?.id]);

  const handleToggleCategory = async (categoryId: string) => {
    if (!mechanic?.id) return;

    const isActive = activeSkillIds.includes(categoryId);
    const updated = isActive
      ? activeSkillIds.filter((id) => id !== categoryId)
      : [...activeSkillIds, categoryId];

    setActiveSkillIds(updated);

    try {
      if (isActive) {
        await supabase
          .from('mechanic_skills')
          .delete()
          .eq('mechanic_id', mechanic.id)
          .eq('category_id', categoryId);
      } else {
        await supabase
          .from('mechanic_skills')
          .upsert({ mechanic_id: mechanic.id, category_id: categoryId });
      }
    } catch (e) {
      console.warn('Error toggling skill:', e);
    }
  };

  const handleAddCustomSkill = () => {
    if (!newSkillName.trim()) {
      Alert.alert('Required', 'Please enter a skill name.');
      return;
    }

    const trimmed = newSkillName.trim();
    if (customSkills.includes(trimmed)) {
      Alert.alert('Notice', 'This skill is already in your active list.');
      return;
    }

    setCustomSkills([...customSkills, trimmed]);
    setNewSkillName('');
    setIsAddModalOpen(false);

    if (Platform.OS === 'web') {
      window.alert(`Specialized skill "${trimmed}" added!`);
    } else {
      Alert.alert('Skill Added', `Specialized skill "${trimmed}" added to your profile!`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Repair Skills</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="construct-outline" size={22} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>DISPATCH MATCHING SKILLS</Text>
              <Text style={styles.cardSubtitle}>
                Select the tractor subsystems you service. Emergency calls matching these categories will be routed to you.
              </Text>
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>PRIMARY REPAIR CATEGORIES</Text>

          {isLoading ? (
            <ActivityIndicator color={BRAND_COLOR} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.skillsGrid}>
              {categories.map((cat) => {
                const isSelected = activeSkillIds.includes(cat.id);
                const label =
                  language === 'te' && cat.name_te
                    ? cat.name_te
                    : language === 'hi' && cat.name_hi
                    ? cat.name_hi
                    : cat.name_en;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.skillChip, isSelected && styles.skillChipActive]}
                    onPress={() => handleToggleCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={20}
                      color={isSelected ? '#FFFFFF' : '#546E7A'}
                    />
                    <Text
                      style={[
                        styles.skillChipText,
                        isSelected && styles.skillChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Custom Specialized Skills */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionHeading}>SPECIALIZED REPAIRS & ATTACHMENTS</Text>
            <TouchableOpacity
              style={styles.addSkillBtn}
              onPress={() => setIsAddModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addSkillBtnText}>Add Skill</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.skillsGrid}>
            {customSkills.map((s, idx) => (
              <View key={idx} style={styles.customChip}>
                <Ionicons name="star" size={14} color="#F57C00" />
                <Text style={styles.customChipText}>{s}</Text>
                <TouchableOpacity
                  onPress={() => setCustomSkills(customSkills.filter((_, i) => i !== idx))}
                >
                  <Ionicons name="close-circle" size={16} color="#90A4AE" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Custom Skill Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Specialized Repair Skill</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={24} color="#546E7A" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Skill or Implement Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newSkillName}
                onChangeText={setNewSkillName}
                placeholder="e.g. Hydraulic Trolley Valve Servicing"
                placeholderTextColor="#90A4AE"
                autoFocus
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsAddModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleAddCustomSkill}
                >
                  <Text style={styles.saveBtnText}>Add Skill</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_DARK,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    backgroundColor: BRAND_COLOR,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F4F7F8',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: BRAND_DARK,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#455A64',
    letterSpacing: 0.5,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F4F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
  },
  skillChipActive: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  skillChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#37474F',
  },
  skillChipTextActive: {
    color: '#FFFFFF',
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSkillBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  customChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BRAND_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND_DARK,
  },
  modalBody: {
    padding: 20,
    gap: 14,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
  },
  modalInput: {
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#263238',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#546E7A',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
