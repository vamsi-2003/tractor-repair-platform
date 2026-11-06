import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') return true;

    Alert.alert(
      'Location Permission Required',
      'Tractor Seva uses your GPS location to match you with verified mechanics within 35 km and guide them to your agricultural field.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Linking.openSettings().catch(() => {});
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.warn('Location permission request error:', err);
    return false;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') return true;

    Alert.alert(
      'Camera Permission Required',
      'Camera access is required to take clear photos of your broken tractor parts or upload verification identity documents.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Linking.openSettings().catch(() => {});
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.warn('Camera permission request error:', err);
    return false;
  }
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;

    Alert.alert(
      'Photo Library Access Required',
      'Access to your device photo gallery is needed to select tractor photos or verification documents.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Linking.openSettings().catch(() => {});
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.warn('Media library permission request error:', err);
    return false;
  }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Audio.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Audio.requestPermissionsAsync();
    if (status === 'granted') return true;

    Alert.alert(
      'Microphone Access Required',
      'Microphone access is needed to record a voice description of your tractor problem for the mechanic.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Linking.openSettings().catch(() => {});
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.warn('Microphone permission request error:', err);
    return false;
  }
}
