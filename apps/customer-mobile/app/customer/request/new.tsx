import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useRepairStore } from '../../../store/repairStore';
import { SpeechSpeaker } from '../../../components/SpeechSpeaker';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { OfflineBanner } from '../../../components/OfflineBanner';
import { VoiceNoteRecorder } from '../../../components/VoiceNoteRecorder';
import { TractorSelectorModal } from '../../../components/TractorSelectorModal';
import { APP_NAME } from '@tractor-repair/shared';

const CATEGORIES = [
  { id: 'engine', name: 'Engine won\'t start', icon: 'cog', nameTE: 'ఇంజన్ పనిచేయట్లేదు', nameHI: 'इंजन चालू नहीं हो रहा', nameKN: 'ಎಂಜಿನ್ ಸ್ಟಾರ್ಟ್ ಆಗುತ್ತಿಲ್ಲ', nameTA: 'எஞ்சின் ஸ்டார்ட் ஆகவில்லை' },
  { id: 'hydraulics', name: 'Hydraulic lift issue', icon: 'water', nameTE: 'హైడ్రాలిక్ లిఫ్ట్ సమస్య', nameHI: 'हाइड्रोलिक लिफ्ट समस्या', nameKN: 'ಹೈಡ್ರಾಲಿಕ್ ಲಿಫ್ಟ್ ಸಮಸ್ಯೆ', nameTA: 'ஹைட்ராலிக் லிப்ட் பிரச்சனை' },
  { id: 'clutch_gearbox', name: 'Clutch / gear slip', icon: 'settings', nameTE: 'క్లచ్ / గేర్ స్లిప్', nameHI: 'क्लच / गियर स्लिप', nameKN: 'ಕ್ಲಚ್ / ಗೇರ್ ಸ್ಲಿಪ್', nameTA: 'கிளட்ச் / கியர் ஸ்லிப்' },
  { id: 'tyres', name: 'Tyres / Brakes', icon: 'disc', nameTE: 'టైర్లు / బ్రేకులు', nameHI: 'टायर / ब्रेक', nameKN: 'ಟೈರ್ / ಬ್ರೇಕ್‌ಗಳು', nameTA: 'டயர் / பிரேக்குகள்' },
  { id: 'electrical', name: 'Electrical / Wiring', icon: 'flash', nameTE: 'ఎలక్ట్రికల్ / వైరింగ్', nameHI: 'इलेक्ट्रिकल / वायरिंग', nameKN: 'ವಿದ್ಯುತ್ / ವೈರಿಂಗ್', nameTA: 'எலக்ட்ரிக்கல் / வயரிங்' },
  { id: 'other', name: 'Other problem', icon: 'build', nameTE: 'ఇతర సమస్య', nameHI: 'अन्य समस्या', nameKN: 'ಇತರೆ ಸಮಸ್ಯೆ', nameTA: 'மற்ற பிரச்சனை' },
];

export default function NewRequestScreen() {
  const { user, language } = useAuthStore();
  const { setCurrentRequest } = useRepairStore();

  const [selectedTractor, setSelectedTractor] = useState<{
    id: string;
    make: string;
    model: string;
    year?: number | null;
    registrationNumber?: string | null;
  } | null>(null);

  const [isTractorModalVisible, setIsTractorModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0);
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [isMovePinOpen, setIsMovePinOpen] = useState(false);
  const [tempLat, setTempLat] = useState('');
  const [tempLng, setTempLng] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to find nearby mechanics.');
        setIsGettingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setLocation(coords);
      setTempLat(coords.latitude.toFixed(6));
      setTempLng(coords.longitude.toFixed(6));

      try {
        if (Platform.OS === 'web') {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`
          );
          const data = await res.json();
          if (data && data.address) {
            const locality =
              data.address.suburb ||
              data.address.village ||
              data.address.town ||
              data.address.neighbourhood ||
              '';
            const districtOrCity =
              data.address.city ||
              data.address.county ||
              data.address.state_district ||
              '';
            const state = data.address.state || '';
            const parts = [locality, districtOrCity, state].filter(Boolean);
            setLocationAddress(parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(', '));
          } else {
            setLocationAddress(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          }
        } else {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (address) {
            setLocationAddress(
              [address.street, address.district || address.city, address.region].filter(Boolean).join(', ')
            );
          } else {
            setLocationAddress(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          }
        }
      } catch {
        setLocationAddress(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleApplyCustomPin = () => {
    const lat = parseFloat(tempLat);
    const lng = parseFloat(tempLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid GPS Coordinates', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    setLocation({ latitude: lat, longitude: lng });
    setLocationAddress(`Pinned at: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setIsMovePinOpen(false);
  };

  const handlePickImage = async () => {
    if (mediaUris.length >= 5) {
      Alert.alert('Limit', 'Maximum 5 photos/videos allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - mediaUris.length,
    });

    if (!result.canceled && result.assets) {
      setMediaUris([...mediaUris, ...result.assets.map((a: ImagePicker.ImagePickerAsset) => a.uri)]);
    }
  };

  const handleTakePhoto = async () => {
    if (mediaUris.length >= 5) {
      Alert.alert('Limit', 'Maximum 5 photos/videos allowed');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setMediaUris([...mediaUris, result.assets[0].uri]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUris(mediaUris.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!selectedTractor) {
      const msg = 'Please select or add your tractor';
      setErrorMessage(msg);
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Tractor Required', msg);
      return;
    }
    if (!selectedCategory) {
      const msg = 'Please select a problem area';
      setErrorMessage(msg);
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Problem Area Required', msg);
      return;
    }
    if (!location) {
      const msg = 'Location is required to find nearby mechanics';
      setErrorMessage(msg);
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Location Required', msg);
      return;
    }

    setIsLoading(true);
    try {
      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id;
      }
      if (!currentUserId) {
        throw new Error('Please sign in first before requesting a repair.');
      }

      // Ensure customer record exists
      let customerId: string;
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', currentUserId)
        .maybeSingle();

      if (customerData) {
        customerId = customerData.id;
      } else {
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({ profile_id: currentUserId })
          .select('id')
          .single();
        if (custErr) throw custErr;
        customerId = newCustomer.id;
      }

      // Resolve problem category ID
      const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
      const { data: category } = await supabase
        .from('problem_categories')
        .select('id')
        .ilike('name_en', `%${selectedCategory === 'engine' ? 'engine' : selectedCategory === 'hydraulics' ? 'hydraulic' : selectedCategory === 'clutch_gearbox' ? 'clutch' : selectedCategory === 'tyres' ? 'tyre' : selectedCategory === 'electrical' ? 'electric' : 'other'}%`)
        .maybeSingle();

      const categoryId = category?.id || 'c1000000-0000-0000-0000-000000000001';

      // Upload voice note if present
      let uploadedVoiceNoteUrl: string | null = null;
      if (voiceNoteUri) {
        try {
          const fileName = `voice_notes/${customerId}/${Date.now()}_voice.m4a`;
          const response = await fetch(voiceNoteUri);
          const blob = await response.blob();
          const { error: vnErr } = await supabase.storage
            .from('request-media')
            .upload(fileName, blob);
          if (!vnErr) {
            const { data: pubData } = supabase.storage.from('request-media').getPublicUrl(fileName);
            uploadedVoiceNoteUrl = pubData?.publicUrl || fileName;
          }
        } catch (vnUploadErr) {
          console.warn('Voice note upload warning:', vnUploadErr);
        }
      }

      // Create repair request
      const finalAddress =
        locationAddress || `Pinned (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;

      const { data: request, error: requestError } = await supabase
        .from('repair_requests')
        .insert({
          customer_id: customerId,
          tractor_id: selectedTractor.id,
          category_id: categoryId,
          description: description.trim() || null,
          voice_note_url: uploadedVoiceNoteUrl,
          latitude: location.latitude,
          longitude: location.longitude,
          address_text: finalAddress,
          status: 'requested',
        })
        .select('id')
        .single();

      if (requestError) throw requestError;

      // Upload photos / videos
      for (let idx = 0; idx < mediaUris.length; idx++) {
        const uri = mediaUris[idx];
        try {
          const ext = uri.includes('.mp4') || uri.includes('video') ? 'mp4' : 'jpg';
          const fileName = `${request.id}/${Date.now()}_media_${idx}.${ext}`;
          const response = await fetch(uri);
          const blob = await response.blob();

          const { error: uploadError } = await supabase.storage
            .from('request-media')
            .upload(fileName, blob);

          if (!uploadError) {
            await supabase.from('request_media').insert({
              request_id: request.id,
              media_type: ext === 'mp4' ? 'video' : 'photo',
              file_path: fileName,
            });
          }
        } catch (mediaErr) {
          console.warn('Media upload notice:', mediaErr);
        }
      }

      // Trigger server-side match-mechanic function
      try {
        await supabase.functions.invoke('match-mechanic', {
          body: { requestId: request.id },
        });
      } catch (fnErr) {
        console.warn('Edge function invoke notice:', fnErr);
      }

      // Save state
      setCurrentRequest({
        id: request.id,
        tractorMake: selectedTractor.make,
        tractorModel: selectedTractor.model,
        categoryId: selectedCategory,
        categoryName: categoryObj?.name || 'Tractor Issue',
        description: description.trim(),
        voiceNoteUri,
        mediaUris,
        latitude: location.latitude,
        longitude: location.longitude,
        status: 'matching',
      });

      router.replace('/customer/request/finding-mechanic');
    } catch (err: any) {
      console.error('Submit request error:', err);
      const msg = err.message || 'Failed to submit request. Please try again.';
      setErrorMessage(msg);
      if (Platform.OS === 'web') window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryTitle = (cat: typeof CATEGORIES[0]) => {
    switch (language) {
      case 'te': return cat.nameTE;
      case 'hi': return cat.nameHI;
      case 'kn': return cat.nameKN;
      case 'ta': return cat.nameTA;
      default: return cat.name;
    }
  };

  const screenSpeechText = `New repair request for ${APP_NAME}. Select your saved tractor, select problem area, speak or type the problem, add photos, confirm your GPS pin, and request nearest mechanic.`;

  return (
    <View style={styles.screenWrapper}>
      <OfflineBanner />
      {/* Top Header Bar with Language Toggle & Read-Aloud Speaker */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appTitle}>{APP_NAME.toUpperCase()}</Text>
          <Text style={styles.screenSubtitle}>NEW REPAIR REQUEST</Text>
        </View>
        <View style={styles.headerActions}>
          <LanguageToggle />
          <SpeechSpeaker text={screenSpeechText} label="Read screen" />
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Saved Tractor Selector Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>YOUR TRACTOR</Text>
          {selectedTractor ? (
            <TouchableOpacity
              style={styles.tractorSelectedCard}
              onPress={() => setIsTractorModalVisible(true)}
            >
              <View style={styles.tractorIcon}>
                <Ionicons name="construct" size={24} color="#C63C14" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tractorSelectedTitle}>
                  {selectedTractor.make} {selectedTractor.model}
                </Text>
                <Text style={styles.tractorSelectedSub}>
                  {selectedTractor.year ? `Year: ${selectedTractor.year}` : 'Saved in profile'} • Tap to change
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.tractorSelectButton}
              onPress={() => setIsTractorModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={22} color="#C63C14" />
              <Text style={styles.tractorSelectButtonText}>Select or Add Saved Tractor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Problem Area Grid (6 categories matching prototype) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>PROBLEM AREA</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                >
                  <View
                    style={[
                      styles.categoryIconWrap,
                      isSelected && styles.categoryIconWrapSelected,
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={22}
                      color={isSelected ? '#FFFFFF' : '#C63C14'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryTitle,
                      isSelected && styles.categoryTitleSelected,
                    ]}
                  >
                    {getCategoryTitle(cat)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Speak Problem (Voice Note Recording) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>SPEAK PROBLEM (VOICE NOTE)</Text>
          <Text style={styles.fieldHint}>
            Record up to 60 seconds describing abnormal sound or smoke for the mechanic:
          </Text>
          <VoiceNoteRecorder
            onRecordingComplete={(uri: string | null, durationSec?: number) => {
              setVoiceNoteUri(uri);
              if (durationSec !== undefined) setVoiceNoteDuration(durationSec);
            }}
            onDelete={() => {
              setVoiceNoteUri(null);
              setVoiceNoteDuration(0);
            }}
          />
        </View>

        {/* Type Problem Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>DESCRIBE PROBLEM (OPTIONAL)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="What happened? When did it start? What abnormal sounds do you hear?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Photos / Video */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>PHOTOS / VIDEO (OPTIONAL)</Text>
          <View style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={20} color="#C63C14" />
              <Text style={styles.mediaBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={handlePickImage}>
              <Ionicons name="images" size={20} color="#C63C14" />
              <Text style={styles.mediaBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {mediaUris.length > 0 && (
            <ScrollView horizontal style={styles.mediaPreviews}>
              {mediaUris.map((uri, index) => (
                <View key={index} style={styles.mediaPreview}>
                  <Image source={{ uri }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.mediaRemove}
                    onPress={() => handleRemoveMedia(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* GPS Pin with Move Pin */}
        <View style={styles.sectionCard}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.sectionLabel}>TRACTOR LOCATION (GPS PIN)</Text>
            <TouchableOpacity onPress={() => setIsMovePinOpen(true)}>
              <Text style={styles.movePinLink}>Move pin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationBox}>
            {isGettingLocation ? (
              <View style={styles.locationLoadingRow}>
                <ActivityIndicator color="#C63C14" size="small" />
                <Text style={styles.locationLoadingText}>Detecting your current location...</Text>
              </View>
            ) : location ? (
              <View style={styles.locationDetails}>
                <Ionicons name="location" size={22} color="#C63C14" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationAddressText}>
                    {locationAddress || 'Current GPS Location'}
                  </Text>
                  <Text style={styles.locationCoords}>
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </Text>
                </View>
                <TouchableOpacity onPress={getLocation} style={styles.refreshLocBtn}>
                  <Ionicons name="refresh" size={18} color="#C63C14" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.locationRetryBtn} onPress={getLocation}>
                <Ionicons name="location-outline" size={20} color="#C63C14" />
                <Text style={styles.locationRetryText}>Enable Location</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {/* Submit Button (Terracotta #C63C14 matching prototype) */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedTractor || !selectedCategory || !location || isLoading) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedTractor || !selectedCategory || !location || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Request nearest mechanic"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Request nearest mechanic</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Tractor Selector Modal */}
      <TractorSelectorModal
        visible={isTractorModalVisible}
        onClose={() => setIsTractorModalVisible(false)}
        selectedTractorId={selectedTractor?.id}
        onSelectTractor={(tractor) => {
          setSelectedTractor(tractor);
          setIsTractorModalVisible(false);
        }}
      />

      {/* Move Pin Modal */}
      <Modal
        visible={isMovePinOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMovePinOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move GPS Pin</Text>
              <TouchableOpacity onPress={() => setIsMovePinOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              If your tractor is stalled in a field or away from your house, adjust the GPS coordinates:
            </Text>

            <Text style={styles.coordLabel}>Latitude</Text>
            <TextInput
              style={styles.coordInput}
              keyboardType="numeric"
              placeholder="e.g. 17.3850"
              value={tempLat}
              onChangeText={setTempLat}
            />

            <Text style={styles.coordLabel}>Longitude</Text>
            <TextInput
              style={styles.coordInput}
              keyboardType="numeric"
              placeholder="e.g. 78.4867"
              value={tempLng}
              onChangeText={setTempLng}
            />

            <TouchableOpacity style={styles.savePinBtn} onPress={handleApplyCustomPin}>
              <Text style={styles.savePinBtnText}>Update Pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  screenSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A857B',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tractorSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7F4',
    borderWidth: 1.5,
    borderColor: '#C63C14',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  tractorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tractorSelectedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1816',
  },
  tractorSelectedSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tractorSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C63C14',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  tractorSelectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C63C14',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FDFDFD',
    borderWidth: 1.5,
    borderColor: '#E8E6DF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  categoryCardSelected: {
    backgroundColor: '#C63C14',
    borderColor: '#C63C14',
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDEEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  categoryTitleSelected: {
    color: '#FFFFFF',
  },
  fieldHint: {
    fontSize: 12,
    color: '#777',
    marginBottom: 10,
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: '#FDFDFD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0DDD5',
    padding: 12,
    fontSize: 14,
    color: '#222',
    minHeight: 80,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFDFD',
    borderWidth: 1,
    borderColor: '#E0DDD5',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C63C14',
  },
  mediaPreviews: {
    marginTop: 12,
  },
  mediaPreview: {
    marginRight: 10,
    position: 'relative',
  },
  mediaImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  mediaRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movePinLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C63C14',
    textDecorationLine: 'underline',
  },
  locationBox: {
    backgroundColor: '#FDFDFD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0DDD5',
    padding: 12,
  },
  locationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationLoadingText: {
    fontSize: 13,
    color: '#666',
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  locationCoords: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  refreshLocBtn: {
    padding: 6,
  },
  locationRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  locationRetryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C63C14',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#C63C14', // Terracotta primary button matching prototype
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#C63C14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
  },
  modalDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 14,
    lineHeight: 16,
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
    marginBottom: 4,
  },
  coordInput: {
    backgroundColor: '#F5F5F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0DDD5',
  },
  savePinBtn: {
    backgroundColor: '#C63C14',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  savePinBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
