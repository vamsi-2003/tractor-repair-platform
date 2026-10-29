import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { useJobStore } from '../../../store/jobStore';
import { formatCurrency } from '@tractor-repair/shared';

export default function EarningsScreen() {
  const { mechanic, balance } = useAuthStore();
  const {
    todayEarnings,
    platformFeeBalance,
    completedJobs,
    feeLedger,
    settlements,
    requestSettlement,
    payPlatformFee,
    loadMechanicData,
  } = useJobStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'settlements'>('overview');
  const [isPayoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('500');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (mechanic?.id) {
      loadMechanicData(mechanic.id);
    }
  }, [mechanic?.id]);

  const totalLifetimeEarnings = balance?.total_earned
    ? Number(balance.total_earned)
    : completedJobs.reduce((acc, j) => acc + j.mechanicEarnings, 0);

  const totalCashCollected = completedJobs
    .filter((j) => j.paymentMethod === 'cash')
    .reduce((acc, j) => acc + j.totalAmount, 0);

  const totalOnlinePayments = completedJobs
    .filter((j) => j.paymentMethod === 'online')
    .reduce((acc, j) => acc + j.totalAmount, 0);

  const pendingPayout = Number(balance?.balance_due ?? 0);

  const handleRequestPayout = async () => {
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < 500) {
      Alert.alert('Minimum Settlement', 'Minimum payout settlement request is ₹500.');
      return;
    }

    if (amt > pendingPayout) {
      Alert.alert('Insufficient Balance', `Requested amount exceeds available payout balance of ${formatCurrency(pendingPayout)}.`);
      return;
    }

    setIsRequesting(true);
    await requestSettlement(amt);
    setIsRequesting(false);
    setPayoutModal(false);

    Alert.alert(
      'Settlement Initiated',
      `${formatCurrency(amt)} payout request sent to your linked UPI: ${
        mechanic?.upi_id || 'Not configured'
      }. Bank transfers typically credit within 2-4 hours.`
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Controls */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>
            Earnings Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ledger' && styles.tabItemActive]}
          onPress={() => setActiveTab('ledger')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ledger' && styles.tabLabelActive]}>
            Platform Fee Ledger
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settlements' && styles.tabItemActive]}
          onPress={() => setActiveTab('settlements')}
        >
          <Text style={[styles.tabLabel, activeTab === 'settlements' && styles.tabLabelActive]}>
            Bank Payouts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* Big Total Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>LIFETIME NET EARNINGS</Text>
              <Text style={styles.heroAmount}>{formatCurrency(totalLifetimeEarnings)}</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroMini}>
                  <Text style={styles.heroMiniLabel}>Today's Earnings</Text>
                  <Text style={styles.heroMiniVal}>{formatCurrency(todayEarnings)}</Text>
                </View>
                <View style={styles.heroMini}>
                  <Text style={styles.heroMiniLabel}>Pending Payout</Text>
                  <Text style={styles.heroMiniVal}>{formatCurrency(pendingPayout)}</Text>
                </View>
                <View style={styles.heroMini}>
                  <Text style={styles.heroMiniLabel}>Cash Fee Due</Text>
                  <Text style={[styles.heroMiniVal, { color: '#FFB300' }]}>
                    {formatCurrency(platformFeeBalance)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cash vs Online Split */}
            <Text style={styles.sectionHeader}>PAYMENT COLLECTION BREAKDOWN</Text>
            <View style={styles.splitRow}>
              <View style={styles.splitCard}>
                <View style={styles.splitIconCash}>
                  <Ionicons name="cash" size={20} color="#E65100" />
                </View>
                <Text style={styles.splitTitle}>Cash In Hand</Text>
                <Text style={styles.splitAmount}>{formatCurrency(totalCashCollected)}</Text>
                <Text style={styles.splitNote}>Collected directly from farmers on-site</Text>
              </View>

              <View style={styles.splitCard}>
                <View style={styles.splitIconOnline}>
                  <Ionicons name="card" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.splitTitle}>Online UPI / Gateway</Text>
                <Text style={styles.splitAmount}>{formatCurrency(totalOnlinePayments)}</Text>
                <Text style={styles.splitNote}>Paid directly into platform escrow</Text>
              </View>
            </View>

            {/* Quick Request Payout Card */}
            <View style={styles.payoutCard}>
              <View>
                <Text style={styles.payoutTitle}>Ready for Payout?</Text>
                <Text style={styles.payoutSub}>
                  UPI: {mechanic?.upi_id || 'Not configured'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payoutBtn}
                onPress={() => setPayoutModal(true)}
              >
                <Ionicons name="paper-plane" size={16} color="#1E3A5F" />
                <Text style={styles.payoutBtnText}>Request Payout</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Completed Jobs */}
            <Text style={styles.sectionHeader}>RECENT EARNINGS ENTRIES</Text>
            {completedJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={36} color="#A0AEC0" />
                <Text style={styles.emptyTitle}>No earnings recorded yet</Text>
                <Text style={styles.emptySub}>Completed repair jobs will show your earnings and deductions here.</Text>
              </View>
            ) : (
              completedJobs.slice(0, 4).map((job) => (
                <View key={job.id} style={styles.earningEntry}>
                  <View style={styles.entryLeft}>
                    <View style={styles.entryIcon}>
                      <Ionicons name="checkmark-done" size={18} color="#2E7D32" />
                    </View>
                    <View>
                      <Text style={styles.entryCustomer}>{job.customerName}</Text>
                      <Text style={styles.entryTractor}>
                        {job.tractor} • {job.paymentMethod.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.entryEarnings}>+{formatCurrency(job.mechanicEarnings)}</Text>
                    <Text style={styles.entryFee}>Fee: -{formatCurrency(job.platformFee)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'ledger' && (
          <>
            {/* Platform Fee Ledger Header Card */}
            <View style={styles.ledgerSummaryCard}>
              <View>
                <Text style={styles.ledgerSumLabel}>Current Commission Liability</Text>
                <Text style={styles.ledgerSumAmount}>{formatCurrency(platformFeeBalance)}</Text>
                <Text style={styles.ledgerSumSub}>
                  Platform fee is 10% on repair total. Auto-deducted from online jobs, or logged for cash jobs.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ledgerPayBtn}
                onPress={async () => {
                  Alert.alert(
                    'Clear Fee Balance',
                    `Pay ${formatCurrency(platformFeeBalance)} via UPI now?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Pay via UPI',
                        onPress: async () => {
                          await payPlatformFee(platformFeeBalance);
                          Alert.alert('Settled', 'Platform fee paid successfully!');
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.ledgerPayBtnText}>Clear Balance</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>FEE TRANSACTION AUDIT TRAIL</Text>
            {feeLedger.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="documents-outline" size={36} color="#A0AEC0" />
                <Text style={styles.emptyTitle}>No fee transactions yet</Text>
                <Text style={styles.emptySub}>Platform commissions and cash fee payments will be recorded here.</Text>
              </View>
            ) : (
              feeLedger.map((item) => {
                const isPayment = item.type === 'payment';
                return (
                  <View key={item.id} style={styles.ledgerRow}>
                    <View
                      style={[
                        styles.ledgerIcon,
                        { backgroundColor: isPayment ? '#E8F5E9' : '#FFF3E0' },
                      ]}
                    >
                      <Ionicons
                        name={isPayment ? 'arrow-down' : 'receipt'}
                        size={18}
                        color={isPayment ? '#2E7D32' : '#E65100'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ledgerDesc}>{item.description}</Text>
                      <Text style={styles.ledgerDate}>
                        {item.date} • Balance after: {formatCurrency(item.balanceAfter)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.ledgerFeeAmt,
                        { color: isPayment ? '#2E7D32' : '#E65100' },
                      ]}
                    >
                      {isPayment ? '-' : '+'}
                      {formatCurrency(item.feeAmount)}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'settlements' && (
          <>
            {/* Bank / UPI Account Details Card */}
            <View style={styles.bankCard}>
              <View style={styles.bankHeader}>
                <Ionicons name="card-outline" size={22} color="#1E3A5F" />
                <Text style={styles.bankTitle}>Linked Payout Account</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>UPI ID:</Text>
                <Text style={styles.bankDetailVal}>{mechanic?.upi_id || 'Not configured'}</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Bank Name:</Text>
                <Text style={styles.bankDetailVal}>{(mechanic as any)?.bank_name || 'Not linked'}</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Account No:</Text>
                <Text style={styles.bankDetailVal}>
                  {(mechanic as any)?.bank_account_number
                    ? `•••• ${(mechanic as any).bank_account_number.slice(-4)}`
                    : 'Not linked'}
                </Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>IFSC Code:</Text>
                <Text style={styles.bankDetailVal}>{(mechanic as any)?.bank_ifsc || 'Not linked'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.requestBigBtn}
              onPress={() => setPayoutModal(true)}
            >
              <Ionicons name="wallet" size={20} color="#1E3A5F" />
              <Text style={styles.requestBigBtnText}>Request New Payout Settlement</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeader}>PAST SETTLEMENT TRANSACTIONS</Text>
            {settlements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={36} color="#A0AEC0" />
                <Text style={styles.emptyTitle}>No payout settlements yet</Text>
                <Text style={styles.emptySub}>Payout requests and transfers will appear here once requested.</Text>
              </View>
            ) : (
              settlements.map((set) => (
                <View key={set.id} style={styles.settleRow}>
                  <View style={styles.settleIcon}>
                    <Ionicons
                      name={set.status === 'settled' ? 'checkmark-circle' : 'time'}
                      size={20}
                      color={set.status === 'settled' ? '#2E7D32' : '#FF9800'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settleAmount}>{formatCurrency(set.amount)}</Text>
                    <Text style={styles.settleRef}>{set.referenceId}</Text>
                    <Text style={styles.settleDate}>
                      {set.date} • via {set.channel.toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.settleStatusBadge,
                      {
                        backgroundColor:
                          set.status === 'settled' ? '#E8F5E9' : '#FFF8E1',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.settleStatusText,
                        { color: set.status === 'settled' ? '#2E7D32' : '#F57C00' },
                      ]}
                    >
                      {set.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Request Payout Modal */}
      <Modal
        visible={isPayoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout Settlement</Text>
              <TouchableOpacity onPress={() => setPayoutModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>
              Available balance for payout: {formatCurrency(pendingPayout)}
            </Text>

            <Text style={styles.modalInputLabel}>ENTER AMOUNT (₹):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={payoutAmount}
              onChangeText={setPayoutAmount}
            />

            <Text style={styles.modalSub}>
              Payout will be transferred to: {mechanic?.upi_id || 'Not configured in profile'}
            </Text>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleRequestPayout}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Confirm Settlement Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
    borderBottomWidth: 2,
    borderBottomColor: '#FFB300',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabLabelActive: {
    color: '#FFB300',
    fontWeight: '800',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#1E3A5F',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 3,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFB300',
    marginVertical: 8,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  heroMini: {
    alignItems: 'center',
  },
  heroMiniLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  heroMiniVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 10,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  splitCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splitIconCash: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  splitIconOnline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  splitTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
  },
  splitAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 2,
  },
  splitNote: {
    fontSize: 10,
    color: '#A0AEC0',
    marginTop: 4,
  },
  payoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  payoutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  payoutSub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFB300',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  payoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  earningEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  entryTractor: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  entryEarnings: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
  },
  entryFee: {
    fontSize: 11,
    color: '#E53E3E',
    marginTop: 2,
  },
  ledgerSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  ledgerSumLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  ledgerSumAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#E65100',
    marginVertical: 4,
  },
  ledgerSumSub: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  ledgerPayBtn: {
    backgroundColor: '#E65100',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  ledgerPayBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  ledgerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  ledgerDate: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  ledgerFeeAmt: {
    fontSize: 15,
    fontWeight: '800',
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 8,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  bankDetailLabel: {
    fontSize: 13,
    color: '#718096',
  },
  bankDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  requestBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFB300',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  requestBigBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  settleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
  },
  settleRef: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  settleDate: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 1,
  },
  settleStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settleStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A202C',
  },
  modalPrompt: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '700',
    marginBottom: 12,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  modalSub: {
    fontSize: 11,
    color: '#718096',
    marginTop: 8,
    marginBottom: 18,
  },
  modalSubmitBtn: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFB300',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
  },
});
