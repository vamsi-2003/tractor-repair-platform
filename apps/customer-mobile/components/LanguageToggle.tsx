import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import type { Language } from '@tractor-repair/shared';

const LANGUAGE_OPTIONS: { code: Language; label: string; native: string; badge: string }[] = [
  { code: 'en', label: 'English', native: 'English', badge: 'EN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', badge: 'తె' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', badge: 'हि' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', badge: 'ಕ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', badge: 'த' },
];

export function LanguageToggle() {
  const { language, setLanguage } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption =
    LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pillButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Change language, current is ${currentOption.label}`}
      >
        <Ionicons name="globe-outline" size={16} color="#2E7D32" />
        <Text style={styles.pillText}>{currentOption.badge}</Text>
        <Ionicons name="chevron-down" size={12} color="#2E7D32" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="language" size={20} color="#2E7D32" />
                <Text style={styles.modalTitle}>Choose Language / భాష</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = opt.code === language;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSelect(opt.code)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionTextWrap}>
                      <Text
                        style={[
                          styles.nativeName,
                          isSelected && styles.selectedText,
                        ]}
                      >
                        {opt.native}
                      </Text>
                      <Text style={styles.englishName}>{opt.label}</Text>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#2E7D32"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    minHeight: 56, // Meets rural tactile accessibility requirement
  },
  optionItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  optionTextWrap: {
    flexDirection: 'column',
    gap: 2,
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  englishName: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  selectedText: {
    color: '#1B5E20',
  },
});
