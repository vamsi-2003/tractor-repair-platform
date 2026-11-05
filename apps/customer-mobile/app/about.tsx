import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

// Casal Palette
const BRAND_COLOR = '#006376';
const BRAND_DARK = '#004957';
const BRAND_LIGHT = '#EDF8F9';
const BRAND_BORDER = '#B2D8DE';

export default function AboutScreen() {
  const { language } = useAuthStore();

  const isTelugu = language === 'te';
  const isHindi = language === 'hi';

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
          <Text style={styles.backBtnText}>
            {isTelugu ? 'వెనుకకు' : isHindi ? 'पीछे' : 'Back'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isTelugu ? 'ట్రాక్టర్ సేవా గురించి' : isHindi ? 'ट्रैक्टर सेवा के बारे में' : 'About Tractor Seva'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>TRACTOR SEVA</Text>
          <Text style={styles.heroTagline}>
            {isTelugu
              ? 'రైతుల కోసం · మెకానిక్‌ల కోసం · గ్రామీణ భారతం కోసం'
              : isHindi
              ? 'किसानों के लिए · मैकेनिकों के लिए · ग्रामीण भारत के लिए'
              : 'For Farmers · For Mechanics · For Rural India'}
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.2.0 • Stable Release</Text>
          </View>
        </View>

        {/* Mission Statement */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf-outline" size={20} color={BRAND_COLOR} />
            <Text style={styles.sectionTitle}>
              {isTelugu ? 'మా లక్ష్యం (Our Mission)' : isHindi ? 'हमारा मिशन (Our Mission)' : 'Our Mission'}
            </Text>
          </View>
          <Text style={styles.bodyText}>
            {isTelugu
              ? 'పొలంలో ట్రాక్టర్ ఆగిపోతే, రైతు పంట సమయం వృధా కాకూడదు. ట్రాక్టర్ సేవా అనేది గ్రామీణ రైతులను సమీపంలోని సర్టిఫైడ్ ట్రాక్టర్ మెకానిక్‌లతో నేరుగా అనుసంధానించే లైవ్ GPS ఆధారిత వేదిక. మధ్యవర్తులు లేకుండా, పారదర్శకమైన చార్జీలతో వేగవంతమైన సహాయాన్ని అందిస్తాము.'
              : isHindi
              ? 'खेत में ट्रैक्टर खराब होने पर किसान का फसल का समय बर्बाद नहीं होना चाहिए। ट्रैक्टर सेवा ग्रामीण किसानों को पास के प्रमाणित ट्रैक्टर मैकेनिकों से सीधे जोड़ने वाला लाइव जीपीएस प्लेटफॉर्म है। बिना किसी बिचौलिए के, पारदर्शी और उचित दरों पर तुरंत सहायता।'
              : 'When a tractor breaks down in the field, a farmer cannot afford to lose a single harvest day. Tractor Seva is India’s dedicated on-demand agricultural machinery repair network, connecting rural farmers directly with verified, skilled local mechanics via live GPS dispatch.'}
          </Text>
        </View>

        {/* 3 Simple Steps */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={20} color={BRAND_COLOR} />
            <Text style={styles.sectionTitle}>
              {isTelugu ? 'ఇది ఎలా పనిచేస్తుంది? (How It Works)' : isHindi ? 'यह कैसे काम करता है?' : 'How Tractor Seva Works'}
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>
                {isTelugu ? '10 సెకన్లలో రిపేర్ అభ్యర్థన' : isHindi ? '10 सेकंड में मरम्मत अनुरोध' : '10-Second Breakdown Request'}
              </Text>
              <Text style={styles.stepDesc}>
                {isTelugu
                  ? 'మీ ట్రాక్టర్ ఎంచుకోండి, సమస్యను ఎంచుకోండి (ఇంజన్, గేర్‌బాక్స్, హైడ్రాలిక్స్ మొదలైనవి), వాయిస్ నోట్ లేదా ఫోటో జోడించండి.'
                  : isHindi
                  ? 'अपना ट्रैक्टर चुनें, समस्या चुनें (इंजन, गियरबॉक्स, हाइड्रोलिक्स आदि), वॉयस नोट या फोटो जोड़ें।'
                  : 'Select your tractor, choose the breakdown area (engine, clutch, hydraulics, tyres, electrical), or speak in your own voice.'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>
                {isTelugu ? 'లైవ్ GPS మెకానిక్ డిస్పాచ్' : isHindi ? 'लाइव जीपीएस मैकेनिक डिस्पैच' : 'Instant Field Dispatch'}
              </Text>
              <Text style={styles.stepDesc}>
                {isTelugu
                  ? 'మీ పొలానికి అత్యంత సమీపంలో ఉన్న సర్టిఫైడ్ మెకానిక్ కాల్ స్వీకరించి నేరుగా మీ వద్దకు వస్తారు.'
                  : isHindi
                  ? 'आपके निकटतम प्रमाणित मैकेनिक को कॉल मिलती है और वे सीधे आपके खेत में पहुंचते हैं।'
                  : 'The nearest approved mechanic matching your repair requirements accepts the call and heads directly to your tractor.'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>
                {isTelugu ? 'పారదర్శక ధరలు & సురక్షిత కోడ్' : isHindi ? 'पारदर्शी मूल्य और सुरक्षा कोड' : 'Transparent Pricing & Secure OTP'}
              </Text>
              <Text style={styles.stepDesc}>
                {isTelugu
                  ? 'స్థిరమైన విజిట్ ఛార్జ్ (₹200), ముందస్తు అంచనా కోట్. పని పూర్తయిన తర్వాత క్యాష్ లేదా UPI ద్వారా చెల్లించండి.'
                  : isHindi
                  ? 'निश्चित विज़िट शुल्क (₹200), काम शुरू होने से पहले अनुमान। काम पूरा होने पर नकद या यूपीआई से भुगतान करें।'
                  : 'Standardized visit charges (₹200), upfront estimate before starting work, secure start/finish codes, and convenient payment via Cash or UPI.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Trust & Verification Standards */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={BRAND_COLOR} />
            <Text style={styles.sectionTitle}>
              {isTelugu ? 'భద్రత & నాణ్యత హామీ' : isHindi ? 'सुरक्षा और गुणवत्ता गारंटी' : 'Trust & Verification Standards'}
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
            <Text style={styles.bulletText}>
              {isTelugu
                ? '100% ధృవీకరించబడిన మెకానిక్‌లు (ఆధార్, ట్రేడ్ సర్టిఫికెట్లు, వర్క్‌షాప్ తనిఖీ)'
                : isHindi
                ? '100% सत्यापित मैकेनिक (आधार, ट्रेड प्रमाण पत्र, कार्यशाला सत्यापन)'
                : '100% Government ID & Trade Certificate Verified Technicians'}
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
            <Text style={styles.bulletText}>
              {isTelugu
                ? 'రైతుల నుండి నిజమైన రేటింగ్‌లు మరియు రివ్యూలు'
                : isHindi
                ? 'किसानों द्वारा वास्तविक रेटिंग और समीक्षाएं'
                : 'Genuine farmer reviews, job counts, and star ratings'}
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
            <Text style={styles.bulletText}>
              {isTelugu
                ? 'మద్దతు మరియు వివాద పరిష్కార సహాయం'
                : isHindi
                ? 'समस्या निवारण एवं विवाद सहायता'
                : '24/7 dedicated dispute mediation & phone assistance'}
            </Text>
          </View>
        </View>

        {/* For Mechanics */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={BRAND_COLOR} />
            <Text style={styles.sectionTitle}>
              {isTelugu ? 'గ్రామీణ మెకానిక్‌ల సంక్షేమం' : isHindi ? 'ग्रामीण मैकेनिकों के लिए' : 'Empowering Village Mechanics'}
            </Text>
          </View>
          <Text style={styles.bodyText}>
            {isTelugu
              ? 'గ్రామీణ మెకానిక్‌లకు స్థిరమైన పనులు, డిజిటల్ గుర్తింపు మరియు నేరుగా రైతుల నుండి ఆదాయం కల్పించడమే ట్రాక్టర్ సేవా భాగస్వామ్య లక్ష్యం. న్యాయమైన కమీషన్లు, త్వరిత సెటిల్మెంట్లు.'
              : isHindi
              ? 'ग्रामीण मैकेनिकों को स्थिर काम, डिजिटल पहचान और सीधे किसानों से आय प्रदान करना ही हमारा उद्देश्य है। उचित कमीशन और त्वरित भुगतान।'
              : 'Tractor Seva empowers local independent mechanics and workshops with reliable customer dispatch, guaranteed daily earnings, transparent commissions, and digital identity.'}
          </Text>
        </View>

        {/* App Footer */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerBrand}>Tractor Seva • v1.2.0</Text>
          <Text style={styles.footerSub}>
            Built with ❤️ for Indian Agriculture & Rural Mobility
          </Text>
        </View>
      </ScrollView>
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
  },
  heroCard: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  heroTagline: {
    fontSize: 13,
    color: '#E0F2F5',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  versionBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F5',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND_DARK,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#37474F',
    fontWeight: '400',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 8,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_LIGHT,
    borderWidth: 1.5,
    borderColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND_COLOR,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#263238',
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#546E7A',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },
  bulletText: {
    fontSize: 13,
    color: '#37474F',
    fontWeight: '600',
    flex: 1,
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  footerSub: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 4,
  },
});
