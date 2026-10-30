import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../../../store/jobStore';
import { supabase } from '../../../services/supabase';
import { formatCurrency } from '@tractor-repair/shared';

export default function FinishJobScreen() {
  const {
    activeJob,
    addSparePart,
    removeSparePart,
    setPaymentMethod,
    setCashReceivedConfirmed,
    verifyFinishCode,
    completeJob,
  } = useJobStore();

  useEffect(() => {
    const onBackPress = () => {
      router.replace('/mechanic/job/active-job');
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  // Add spare part modal state
  const [isAddPartModal, setIsAddPartModal] = useState(false);
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('');

  // Finish code state
  const [finishCodeInput, setFinishCodeInput] = useState('');
  const [isVerifyingFinishCode, setIsVerifyingFinishCode] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Hydrate quote from Supabase and auto-seed spare parts from approved quote
  useEffect(() => {
    if (!activeJob?.id) return;
    (async () => {
      try {
        const { data: q } = await supabase
          .from('quotes')
          .select('*')
          .eq('job_id', activeJob.id)
          .maybeSingle();

        if (q) {
          const partsEst = Number(q.parts_estimate || 0);
          const labor = Number(q.labor_cost || 0);
          const visit = Number(q.visit_fee || 200);
          const tot = Number(q.total || (visit + labor + partsEst));

          useJobStore.setState((state) => {
            if (!state.activeJob) return state;
            const updatedQuote = {
              ...(state.activeJob.quote || {}),
              id: q.id,
              visitFee: visit,
              laborCost: labor,
              partsEstimate: partsEst,
              total: tot,
              status: q.status,
            };
            return {
              activeJob: {
                ...state.activeJob,
                quote: updatedQuote as any,
              },
            };
          });

          if (partsEst > 0 && activeJob.spareParts.length === 0) {
            addSparePart(
              'Replaced Spare Parts (as quoted & approved)',
              1,
              partsEst
            );
          }
        }
      } catch (err) {
        console.warn('Error fetching quote in finish-job:', err);
      }
    })();
  }, [activeJob?.id]);

  if (!activeJob) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-done-circle" size={54} color="#00C853" />
        <Text style={styles.emptyTitle}>No Pending Finish Jobs</Text>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/mechanic/(tabs)/home')}
        >
          <Text style={styles.homeBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visitCharge = activeJob?.quote?.visitFee ?? 200;
  const laborCharge = activeJob?.quote?.laborCost ?? 0;
  const rawParts = (activeJob?.spareParts || []).reduce((acc, p) => acc + p.total, 0);
  const partsSubtotal = rawParts > 0 ? rawParts : (activeJob?.quote?.partsEstimate ?? 0);
  const grandTotal = visitCharge + laborCharge + partsSubtotal;
  const platformFee = Math.round(grandTotal * 0.1);
  const mechanicNet = grandTotal - platformFee;

  const handleAddPart = () => {
    if (!partName.trim()) {
      Alert.alert('Part Name', 'Please enter spare part description.');
      return;
    }
    const qty = parseInt(partQty, 10);
    const unitPrice = parseFloat(partUnitPrice);

    if (isNaN(qty) || qty <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      Alert.alert('Invalid Price/Qty', 'Please check quantity and unit price.');
      return;
    }

    addSparePart(partName.trim(), qty, unitPrice);
    setPartName('');
    setPartQty('1');
    setPartUnitPrice('');
    setIsAddPartModal(false);
  };

  const handleVerifyFinishCode = async () => {
    if (finishCodeInput.length < 4) {
      Alert.alert('Finish Code', 'Please enter the 4-6 digit Finish Code shown on the farmer’s phone.');
      return;
    }

    setIsVerifyingFinishCode(true);
    const result = await verifyFinishCode(finishCodeInput);
    setIsVerifyingFinishCode(false);

    if (result.success) {
      Alert.alert('Finish Code Verified ✓', result.message);
    } else {
      Alert.alert('Invalid Code', result.message);
    }
  };

  const handleCompleteJob = async () => {
    if (!activeJob.finishCodeVerified) {
      Alert.alert(
        'Finish Code Required',
        'Please enter and verify the Finish Code from the farmer before completing.'
      );
      return;
    }

    if (activeJob.paymentMethod === 'cash' && !activeJob.cashReceivedConfirmed) {
      Alert.alert(
        'Cash Confirmation',
        `Please check the box confirming you have received ${formatCurrency(grandTotal)} cash in hand.`
      );
      return;
    }

    setIsCompleting(true);
    try {
      // 1. Trigger server RPC for atomic completion & fee calculation from app_settings
      const { data: serverResult, error: rpcErr } = await supabase.rpc('complete_job_cash_server', {
        p_job_id: activeJob.id,
        p_spare_parts_amount: partsSubtotal,
        p_finish_code: finishCodeInput.trim() || activeJob.finishCode || null,
      });

      if (rpcErr) {
        console.warn('RPC complete_job_cash_server notice (falling back to store sync):', rpcErr.message);
        await completeJob();
      } else {
        await completeJob();
      }
    } catch (e) {
      await completeJob();
    } finally {
      setIsCompleting(false);
    }

    Alert.alert(
      'Service Completed!',
      `Tractor repair successfully completed! You earned ${formatCurrency(mechanicNet)}. ${
        activeJob.paymentMethod === 'cash'
          ? `${formatCurrency(platformFee)} platform fee added to ledger.`
          : 'Payment routed via online escrow.'
      }`,
      [
        {
          text: 'View Earnings',
          onPress: () => router.replace('/mechanic/(tabs)/earnings'),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Itemized Bill Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="receipt-outline" size={20} color="#1E3A5F" />
          <Text style={styles.cardTitle}>FINAL ITEMIZED BILL SUMMARY</Text>
        </View>

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Visit & Diagnostic Charge</Text>
          <Text style={styles.billVal}>{formatCurrency(visitCharge)}</Text>
        </View>

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Approved Labor Charge</Text>
          <Text style={styles.billVal}>{formatCurrency(laborCharge)}</Text>
        </View>

        {/* Spare parts listing */}
        <View style={styles.partsSection}>
          <View style={styles.partsHeader}>
            <Text style={styles.partsTitle}>
              Spare Parts Replaced ({activeJob.spareParts.length})
            </Text>
            <TouchableOpacity
              style={styles.addPartBtn}
              onPress={() => setIsAddPartModal(true)}
            >
              <Ionicons name="add-circle" size={16} color="#1E3A5F" />
              <Text style={styles.addPartBtnText}>+ Add Spare Part</Text>
            </TouchableOpacity>
          </View>

          {activeJob.spareParts.length === 0 ? (
            <Text style={styles.noPartsText}>No spare parts added yet.</Text>
          ) : (
            activeJob.spareParts.map((part) => (
              <View key={part.id} style={styles.partItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partName}>{part.name}</Text>
                  <Text style={styles.partDetail}>
                    {part.quantity} unit(s) @ {formatCurrency(part.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.partTotal}>{formatCurrency(part.total)}</Text>
                <TouchableOpacity
                  style={styles.removePartBtn}
                  onPress={() => removeSparePart(part.id)}
                >
                  <Ionicons name="trash" size={16} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Grand Total Row */}
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>TOTAL AMOUNT DUE</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
        </View>
      </View>

      {/* 2. Customer Payment Method Choice */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet-outline" size={20} color="#1E3A5F" />
          <Text style={styles.cardTitle}>CUSTOMER PAYMENT METHOD</Text>
        </View>

        <View style={styles.paymentMethodRow}>
          <TouchableOpacity
            style={[
              styles.methodBox,
              activeJob.paymentMethod === 'cash' && styles.methodBoxActive,
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Ionicons
              name="cash"
              size={24}
              color={activeJob.paymentMethod === 'cash' ? '#E65100' : '#718096'}
            />
            <Text
              style={[
                styles.methodText,
                activeJob.paymentMethod === 'cash' && styles.methodTextActive,
              ]}
            >
              Cash Payment
            </Text>
            <Text style={styles.methodSub}>Collected on-site</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodBox,
              activeJob.paymentMethod === 'online' && styles.methodBoxActive,
            ]}
            onPress={() => setPaymentMethod('online')}
          >
            <Ionicons
              name="qr-code"
              size={24}
              color={activeJob.paymentMethod === 'online' ? '#2E7D32' : '#718096'}
            />
            <Text
              style={[
                styles.methodText,
                activeJob.paymentMethod === 'online' && styles.methodTextActive,
              ]}
            >
              Online UPI / Card
            </Text>
            <Text style={styles.methodSub}>In customer app</Text>
          </TouchableOpacity>
        </View>

        {/* Platform Fee Liability for Cash Jobs */}
        {activeJob.paymentMethod === 'cash' ? (
          <View style={styles.cashNoticeBox}>
            <View style={styles.cashNoticeTop}>
              <Ionicons name="information-circle" size={20} color="#E65100" />
              <Text style={styles.cashNoticeTitle}>Platform Fee Liability</Text>
            </View>
            <Text style={styles.cashNoticeBody}>
              Since you are collecting the full amount of {formatCurrency(grandTotal)} in cash, the 10% platform commission ({formatCurrency(platformFee)}) will be added to your platform fee ledger.
            </Text>

            <TouchableOpacity
              style={styles.confirmCashRow}
              onPress={() => setCashReceivedConfirmed(!activeJob.cashReceivedConfirmed)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeJob.cashReceivedConfirmed ? 'checkbox' : 'square-outline'}
                size={22}
                color={activeJob.cashReceivedConfirmed ? '#2E7D32' : '#718096'}
              />
              <Text style={styles.confirmCashText}>
                I confirm receiving {formatCurrency(grandTotal)} cash in full from {activeJob.customer.name}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.onlineNoticeBox}>
            <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
            <Text style={styles.onlineNoticeText}>
              Farmer is paying online via UPI. Your net payout of {formatCurrency(mechanicNet)} will be settled directly to your bank account.
            </Text>
          </View>
        )}
      </View>

      {/* 3. Finish Code Entry & Verification */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="key" size={20} color="#E65100" />
          <Text style={styles.cardTitle}>SECURE FINISH CODE VALIDATION</Text>
        </View>

        {activeJob.finishCodeVerified ? (
          <View style={styles.codeVerifiedCard}>
            <Ionicons name="checkmark-circle" size={28} color="#00C853" />
            <View style={{ flex: 1 }}>
              <Text style={styles.codeVerifiedTitle}>Finish Code Validated ✓</Text>
              <Text style={styles.codeVerifiedSub}>
                Customer authorized work completion and signed off on repairs.
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.codePrompt}>
              Enter the 4-6 digit Finish Code shown on {activeJob.customer.name}'s phone to verify completion:
            </Text>

            <View style={styles.codeInputRow}>
              <TextInput
                style={styles.codeInput}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Code"
                placeholderTextColor="#A0AEC0"
                value={finishCodeInput}
                onChangeText={setFinishCodeInput}
              />

              <TouchableOpacity
                style={[
                  styles.verifyCodeBtn,
                  isVerifyingFinishCode && styles.btnDisabled,
                ]}
                onPress={handleVerifyFinishCode}
                disabled={isVerifyingFinishCode}
              >
                {isVerifyingFinishCode ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyCodeBtnText}>Validate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Complete Job & Settle Button */}
      <TouchableOpacity
        style={[
          styles.completeJobBtn,
          (!activeJob.finishCodeVerified ||
            (activeJob.paymentMethod === 'cash' && !activeJob.cashReceivedConfirmed) ||
            isCompleting) &&
            styles.btnDisabled,
        ]}
        onPress={handleCompleteJob}
        disabled={
          !activeJob.finishCodeVerified ||
          (activeJob.paymentMethod === 'cash' && !activeJob.cashReceivedConfirmed) ||
          isCompleting
        }
      >
        {isCompleting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-done-circle" size={24} color="#FFFFFF" />
            <Text style={styles.completeJobBtnText}>
              Mark Job Done & Settle {formatCurrency(mechanicNet)}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Add Spare Part Modal */}
      <Modal
        visible={isAddPartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddPartModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Spare Part Used</Text>
              <TouchableOpacity onPress={() => setIsAddPartModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Part Description / Name:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Hydraulic O-Ring Seal Set"
              value={partName}
              onChangeText={setPartName}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Quantity:</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={partQty}
                  onChangeText={setPartQty}
                />
              </View>

              <View style={{ flex: 2 }}>
                <Text style={styles.modalLabel}>Unit Price (₹):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="e.g. 350"
                  value={partUnitPrice}
                  onChangeText={setPartUnitPrice}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.modalAddBtn} onPress={handleAddPart}>
              <Text style={styles.modalAddBtnText}>Add to Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 12,
  },
  homeBtn: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
  },
  homeBtnText: {
    color: '#FFB300',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A5568',
    letterSpacing: 1.2,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 13,
    color: '#4A5568',
  },
  billVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  partsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  partsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3748',
  },
  addPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addPartBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  noPartsText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  partItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  partName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  partDetail: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  partTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
    marginRight: 10,
  },
  removePartBtn: {
    padding: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFB300',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  methodBoxActive: {
    borderColor: '#E65100',
    backgroundColor: '#FFF8E1',
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 6,
  },
  methodTextActive: {
    color: '#E65100',
  },
  methodSub: {
    fontSize: 10,
    color: '#A0AEC0',
    marginTop: 2,
  },
  cashNoticeBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  cashNoticeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cashNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E65100',
  },
  cashNoticeBody: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
  },
  confirmCashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  confirmCashText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
  },
  onlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  onlineNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    flex: 1,
    lineHeight: 16,
  },
  codeVerifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  codeVerifiedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D32',
  },
  codeVerifiedSub: {
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  codePrompt: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 8,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  verifyCodeBtn: {
    backgroundColor: '#E65100',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10,
  },
  verifyCodeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  codeHint: {
    fontSize: 11,
    color: '#718096',
    marginTop: 6,
  },
  completeJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 6,
    elevation: 3,
  },
  completeJobBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  modalAddBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  modalAddBtnText: {
    color: '#FFB300',
    fontWeight: '700',
    fontSize: 14,
  },
});
