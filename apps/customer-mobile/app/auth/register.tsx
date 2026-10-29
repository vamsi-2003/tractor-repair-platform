import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { PROBLEM_CATEGORIES } from '@tractor-repair/shared';

interface SkillOption {
  id: string;
  name: string;
  nativeName: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SKILL_OPTIONS: SkillOption[] = [
  { id: 'engine', name: 'Engine Repair', nativeName: 'ఇంజన్ / इंजन', icon: 'settings' },
  { id: 'hydraulics', name: 'Hydraulics & Lift', nativeName: 'హైడ్రాలిక్స్ / हाइड्रोलिक्स', icon: 'water' },
  { id: 'clutch_gearbox', name: 'Clutch / Gearbox', nativeName: 'క్లచ్ / गियरबॉक्स', icon: 'git-commit' },
  { id: 'tyres', name: 'Tyres & Brakes', nativeName: 'టైర్లు & బ్రేకులు / टायर और ब्रेक', icon: 'disc' },
  { id: 'electrical', name: 'Electrical & Wiring', nativeName: 'ఎలక్ట్రికల్ / इलेक्ट्रिकल', icon: 'flash' },
  { id: 'other', name: 'Other / General Service', nativeName: 'ఇతరం / अन्य', icon: 'build' },
];

export default function RegisterScreen() {
  const { setProfile, setMechanic, setSkills, setDocuments, updateVerification } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [workshopAddress, setWorkshopAddress] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['engine', 'hydraulics']);
  const [documentType, setDocumentType] = useState('aadhaar');
  const [documentNumber, setDocumentNumber] = useState('');
  const [idDocumentUri, setIdDocumentUri] = useState<string | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notifyUser = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handlePickDocument = async (source: 'camera' | 'gallery') => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        notifyUser('Permission Denied', 'Please allow camera/gallery access to upload your verification ID.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIdDocumentUri(result.assets[0].uri);
      }
    } catch (e) {
      notifyUser('Error', 'Could not open camera/gallery.');
    }
  };

  const handlePickProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        notifyUser('Permission Denied', 'Camera permission is required to capture your photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfilePhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      notifyUser('Error', 'Could not capture photo.');
    }
  };

  const handleCaptureGps = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notifyUser('Location Denied', 'Location permission is required to pinpoint your workshop.');
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setGpsLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // Reverse geocode to populate address
      try {
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&addressdetails=1`
            );
            const data = await res.json();
            if (data && data.address && !workshopAddress) {
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
              const formatted = [locality, districtOrCity, state].filter(Boolean).join(', ');
              if (formatted) setWorkshopAddress(formatted);
            }
          } catch {
            // fallback
          }
        } else {
          const [geocode] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geocode) {
            const formatted = [
              geocode.name,
              geocode.street,
              geocode.subregion || geocode.city,
              geocode.region,
              geocode.postalCode,
            ]
              .filter(Boolean)
              .join(', ');
            if (!workshopAddress) {
              setWorkshopAddress(formatted);
            }
          }
        }
      } catch (err) {
        // Fallback
      }
      notifyUser('Location Captured', 'Your workshop coordinates have been recorded.');
    } catch (e) {
      notifyUser('GPS Error', 'Unable to retrieve location.');
    } finally {
      setIsLocating(false);
    }
  };

  const CATEGORY_MAP: Record<string, string> = {
    engine: 'c1000000-0000-0000-0000-000000000001',
    hydraulics: 'c1000000-0000-0000-0000-000000000002',
    clutch_gearbox: 'c1000000-0000-0000-0000-000000000003',
    tyres: 'c1000000-0000-0000-0000-000000000004',
    electrical: 'c1000000-0000-0000-0000-000000000005',
    other: 'c1000000-0000-0000-0000-000000000006',
  };

  const handleSubmit = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (!fullName.trim() || fullName.trim().length < 3) {
      notifyUser('Full Name', 'Please enter your full legal name as per ID proof.');
      return;
    }
    if (cleanPhone.length !== 10) {
      notifyUser('Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (selectedSkills.length === 0) {
      notifyUser('Skills Required', 'Please select at least one repair skill category.');
      return;
    }
    if (!workshopAddress.trim()) {
      notifyUser('Workshop Address', 'Please enter your workshop or base service address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Resolve or establish active auth user
      let userId: string;
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        userId = authData.user.id;
      } else {
        // Auto-provision mechanic auth account using phone
        const authEmail = `mech_${cleanPhone}@tractorapp.com`;
        const authPassword = `Password@${cleanPhone}!2026`;

        const { data: signInRes } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (signInRes?.user?.id) {
          userId = signInRes.user.id;
        } else {
          const { data: signUpRes, error: signUpErr } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
              data: {
                full_name: fullName.trim(),
                role: 'mechanic',
                phone: `+91${cleanPhone}`,
              },
            },
          });

          if (signUpErr) {
            // If already registered with OTP, try sign in with phone OTP or handle
            console.warn('Sign up notice:', signUpErr);
          }

          if (signUpRes?.user?.id) {
            userId = signUpRes.user.id;
          } else {
            // Fallback: check if profile with this phone exists in database
            const { data: existingProf } = await supabase
              .from('profiles')
              .select('id')
              .eq('phone', `+91${cleanPhone}`)
              .maybeSingle();

            if (existingProf?.id) {
              userId = existingProf.id;
            } else {
              throw new Error(signUpErr?.message || 'Could not create registration account. Please verify mobile.');
            }
          }
        }
      }

      const profileData = {
        id: userId,
        role: 'mechanic' as const,
        full_name: fullName.trim(),
        phone: `+91${cleanPhone}`,
        avatar_url: profilePhotoUri || null,
        preferred_language: 'en',
        is_active: true,
      };

      // 2. Upsert profile
      const { error: profErr } = await supabase.from('profiles').upsert(profileData);
      if (profErr) throw profErr;

      // 3. Upsert mechanic record
      const { data: mechanicRow, error: mechErr } = await supabase
        .from('mechanics')
        .upsert(
          {
            profile_id: userId,
            status: 'pending_approval' as const,
            experience_years: parseInt(experienceYears, 10) || 1,
            workshop_address: workshopAddress.trim(),
            service_radius_km: 25,
            is_online: false,
            rating_avg: 0,
            total_jobs: 0,
          },
          { onConflict: 'profile_id' }
        )
        .select()
        .single();

      if (mechErr) throw mechErr;

      // 4. Insert skills with UUID mapping
      if (mechanicRow && selectedSkills.length > 0) {
        for (const skillId of selectedSkills) {
          const categoryUuid = CATEGORY_MAP[skillId] || skillId;
          await supabase.from('mechanic_skills').upsert(
            {
              mechanic_id: mechanicRow.id,
              category_id: categoryUuid,
            },
            { onConflict: 'mechanic_id,category_id' }
          );
        }
      }

      // 5. Insert documents if uploaded
      if (mechanicRow && idDocumentUri) {
        let docFilePath = idDocumentUri;
        try {
          const fileName = `documents/${mechanicRow.id}/${Date.now()}_${documentType}.jpg`;
          const res = await fetch(idDocumentUri);
          const blob = await res.blob();
          const { error: uploadErr } = await supabase.storage
            .from('mechanic-documents')
            .upload(fileName, blob, { upsert: true });

          if (!uploadErr) {
            docFilePath = fileName;
          }
        } catch (uploadErr) {
          console.warn('Doc storage upload warning:', uploadErr);
        }

        await supabase.from('mechanic_documents').insert({
          mechanic_id: mechanicRow.id,
          document_type: documentType,
          file_path: docFilePath,
          status: 'pending' as const,
        });
      }

      // Update local Zustand store
      setProfile(profileData as any);
      setMechanic(mechanicRow as any);
      setSkills(selectedSkills);
      updateVerification({
        mobileVerified: true,
        idUploaded: !!idDocumentUri,
        approvalStatus: 'pending_approval',
      });

      notifyUser(
        'Application Submitted!',
        'Your registration and verification documents have been submitted for Admin Review. Approval typically takes 2-4 hours. You can explore the partner app in the meantime.',
        () => router.replace('/mechanic/(tabs)/home')
      );
    } catch (e: any) {
      console.error('Registration submit error:', e);
      notifyUser('Submission Error', e?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mechanic Partner Registration</Text>
          <Text style={styles.subtitle}>
            Join India's tractor repair network. Connect directly with farmers in your mandal.
          </Text>
        </View>

        {/* Verification Checklist Banner */}
        <View style={styles.checklistBanner}>
          <Text style={styles.checklistTitle}>ONBOARDING PROCESS</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNumActive}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepLabel}>Profile Details</Text>
            <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.4)" />
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepLabel}>ID Verification</Text>
            <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.4)" />
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepLabel}>Admin Approval</Text>
          </View>
        </View>

        {/* Profile Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>1. MECHANIC PHOTO</Text>
          <View style={styles.photoRow}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.avatarPreview} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color="rgba(255,255,255,0.4)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handlePickProfilePhoto}
              >
                <Ionicons name="camera" size={18} color="#FFB300" />
                <Text style={styles.photoButtonText}>Take Profile Photo</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>
                Clear front-facing photo helps farmers recognize you on-site.
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>2. PERSONAL & WORKSHOP DETAILS</Text>

          <Text style={styles.label}>FULL NAME (AS PER AADHAAR)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>MOBILE NUMBER (+91)</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}><Text style={styles.countryText}>+91</Text></View>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="10-digit mobile number"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Text style={styles.label}>YEARS OF REPAIR EXPERIENCE</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="e.g. 8"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={experienceYears}
            onChangeText={setExperienceYears}
          />

          <Text style={styles.label}>WORKSHOP / SHED ADDRESS</Text>
          <TextInput
            style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
            multiline
            placeholder="Shop no, Landmark, Mandal, District"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={workshopAddress}
            onChangeText={setWorkshopAddress}
          />

          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleCaptureGps}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator color="#FFB300" size="small" />
            ) : (
              <>
                <Ionicons name="location" size={18} color="#FFB300" />
                <Text style={styles.gpsButtonText}>
                  {gpsLocation ? 'GPS Location Captured ✓' : 'Detect Current GPS Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Skills Multi-Select */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>3. REPAIR SPECIALIZATIONS & SKILLS</Text>
          <Text style={styles.fieldHint}>Select all systems you are trained to fix:</Text>

          <View style={styles.skillsGrid}>
            {SKILL_OPTIONS.map((skill) => {
              const isSelected = selectedSkills.includes(skill.id);
              return (
                <TouchableOpacity
                  key={skill.id}
                  style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                  onPress={() => toggleSkill(skill.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={skill.icon}
                    size={20}
                    color={isSelected ? '#1E3A5F' : '#FFB300'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.skillName, isSelected && styles.skillNameSelected]}>
                      {skill.name}
                    </Text>
                    <Text style={[styles.skillNative, isSelected && styles.skillNativeSelected]}>
                      {skill.nativeName}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSelected ? '#1E3A5F' : 'rgba(255,255,255,0.4)'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ID Document Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>4. ID VERIFICATION DOCUMENT</Text>

          <Text style={styles.label}>DOCUMENT TYPE</Text>
          <View style={styles.docTypeRow}>
            {['aadhaar', 'driving_license', 'mechanic_certificate'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.docTypeButton,
                  documentType === type && styles.docTypeButtonActive,
                ]}
                onPress={() => setDocumentType(type)}
              >
                <Text
                  style={[
                    styles.docTypeText,
                    documentType === type && styles.docTypeTextActive,
                  ]}
                >
                  {type === 'aadhaar'
                    ? 'Aadhaar'
                    : type === 'driving_license'
                    ? 'Driving License'
                    : 'Certificate'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>DOCUMENT NUMBER (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5624 8920 1234"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={documentNumber}
            onChangeText={setDocumentNumber}
          />

          <View style={styles.docUploadBox}>
            {idDocumentUri ? (
              <View style={styles.docPreviewWrap}>
                <Image source={{ uri: idDocumentUri }} style={styles.docPreview} />
                <TouchableOpacity
                  style={styles.reUploadBtn}
                  onPress={() => setIdDocumentUri(null)}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF5252" />
                  <Text style={styles.reUploadText}>Remove & Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.docPrompt}>
                <Ionicons name="cloud-upload-outline" size={36} color="#FFB300" />
                <Text style={styles.docPromptTitle}>Upload Document Photo</Text>
                <Text style={styles.docPromptSub}>Clear front image of original ID</Text>
                <View style={styles.uploadBtnRow}>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => handlePickDocument('camera')}
                  >
                    <Ionicons name="camera" size={18} color="#1E3A5F" />
                    <Text style={styles.uploadBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => handlePickDocument('gallery')}
                  >
                    <Ionicons name="images" size={18} color="#1E3A5F" />
                    <Text style={styles.uploadBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#1E3A5F" />
          ) : (
            <>
              <Text style={styles.submitText}>Submit for Admin Approval</Text>
              <Ionicons name="checkmark-done" size={20} color="#1E3A5F" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By submitting, you agree to Tractor Repair's Partner Terms of Service and 10% platform fee policy on completed repairs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  checklistBanner: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.25)',
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB300',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFB300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  stepLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFB300',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFB300',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB300',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCode: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  countryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  gpsButtonText: {
    color: '#FFB300',
    fontSize: 13,
    fontWeight: '700',
  },
  skillsGrid: {
    gap: 10,
    marginTop: 4,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 12,
  },
  skillChipSelected: {
    backgroundColor: '#FFB300',
    borderColor: '#FFA000',
  },
  skillName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skillNameSelected: {
    color: '#1E3A5F',
  },
  skillNative: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  skillNativeSelected: {
    color: 'rgba(30,58,95,0.8)',
    fontWeight: '600',
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  docTypeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  docTypeButtonActive: {
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
    borderColor: '#FFB300',
  },
  docTypeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  docTypeTextActive: {
    color: '#FFB300',
    fontWeight: '800',
  },
  docUploadBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 179, 0, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
    alignItems: 'center',
  },
  docPrompt: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  docPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  docPromptSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    marginBottom: 12,
  },
  uploadBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFB300',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#1E3A5F',
    fontWeight: '700',
    fontSize: 13,
  },
  docPreviewWrap: {
    width: '100%',
    alignItems: 'center',
  },
  docPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  reUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  reUploadText: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFB300',
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#1E3A5F',
    fontSize: 17,
    fontWeight: '800',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },
});
