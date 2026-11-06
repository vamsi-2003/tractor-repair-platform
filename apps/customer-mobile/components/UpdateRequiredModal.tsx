import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { checkAppVersion, VersionCheckResult } from '../services/versionCheck';
import { useAuthStore } from '../store/authStore';

const BRAND_COLOR = '#006376';
const BRAND_DARK = '#004957';

export function UpdateRequiredModal() {
  const { language } = useAuthStore();
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult | null>(null);

  useEffect(() => {
    checkAppVersion().then((result) => {
      if (result.isOutdated) {
        setVersionInfo(result);
      }
    });
  }, []);

  if (!versionInfo || !versionInfo.isOutdated) {
    return null;
  }

  const isTelugu = language === 'te';
  const isHindi = language === 'hi';

  const title = isTelugu
    ? 'యాప్ అప్‌డేట్ అవసరం'
    : isHindi
    ? 'ऐप अपडेट आवश्यक है'
    : 'App Update Required';

  const message = isTelugu
    ? `మీరు ప్రస్తుతం ట్రాక్టర్ సేవ v${versionInfo.currentVersion} వాడుతున్నారు. సురక్షితంగా కొనసాగడానికి దయచేసి v${versionInfo.minVersion} లేదా అంతకంటే తాజా వెర్షన్‌కు అప్‌డేట్ చేసుకోండి.`
    : isHindi
    ? `आप वर्तमान में ट्रैक्टर सेवा v${versionInfo.currentVersion} का उपयोग कर रहे हैं। सुरक्षित रूप से जारी रखने के लिए कृपया v${versionInfo.minVersion} या नए संस्करण में अपडेट करें।`
    : `You are currently running Tractor Seva v${versionInfo.currentVersion}. To continue using the service safely, an update to v${versionInfo.minVersion} or newer is required.`;

  const btnText = isTelugu
    ? 'ఇప్పుడే అప్‌డేట్ చేయండి'
    : isHindi
    ? 'अभी अपडेट करें'
    : 'Update Tractor Seva Now';

  const handleUpdate = () => {
    if (versionInfo.downloadUrl) {
      Linking.openURL(versionInfo.downloadUrl).catch(() => {});
    }
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="cloud-download-outline" size={44} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.versionBadge}>
            Current: v{versionInfo.currentVersion} • Required: v{versionInfo.minVersion}
          </Text>

          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="arrow-up-bold-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>{btnText}</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Tractor Seva Agricultural Network • Version Policy
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: BRAND_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  versionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006376',
    backgroundColor: '#E0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLOR,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: BRAND_DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: 16,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
