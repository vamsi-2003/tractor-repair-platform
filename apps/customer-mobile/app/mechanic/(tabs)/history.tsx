import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { useJobStore } from '../../../store/jobStore';
import { formatCurrency } from '@tractor-repair/shared';

export default function HistoryScreen() {
  const { mechanic } = useAuthStore();
  const { completedJobs, activeJob, loadMechanicData } = useJobStore();
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');

  useEffect(() => {
    if (mechanic?.id) {
      loadMechanicData(mechanic.id);
    }
  }, [mechanic?.id]);

  const filteredJobs = completedJobs.filter((job) => {
    if (filter === 'completed') return true;
    if (filter === 'active') return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, filter === tab && styles.filterChipActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab === 'all'
                ? `All Jobs (${completedJobs.length + (activeJob ? 1 : 0)})`
                : tab === 'active'
                ? `In Progress (${activeJob ? 1 : 0})`
                : `Completed (${completedJobs.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {/* Active Job Card if matching filter */}
        {activeJob && (filter === 'all' || filter === 'active') && (
          <View style={styles.activeJobCard}>
            <View style={styles.activeJobHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>IN PROGRESS</Text>
              </View>
              <Text style={styles.activeJobDate}>Active Now</Text>
            </View>

            <Text style={styles.jobCustomer}>{activeJob.customer.name}</Text>
            <Text style={styles.jobTractor}>
              🚜 {activeJob.tractor.make} {activeJob.tractor.model} ({activeJob.tractor.year || 2021})
            </Text>
            <Text style={styles.jobProblem}>
              Fault: {activeJob.problem.categoryName} • {activeJob.problem.description}
            </Text>

            <View style={styles.activeJobFooter}>
              <View>
                <Text style={styles.quoteLabel}>Estimate:</Text>
                <Text style={styles.quoteValue}>{formatCurrency(activeJob.quote.total)}</Text>
              </View>

              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => router.push('/mechanic/job/active-job')}
              >
                <Text style={styles.resumeButtonText}>Resume Job</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Completed Jobs */}
        {(filter === 'all' || filter === 'completed') && (
          <>
            <Text style={styles.sectionTitle}>PAST COMPLETED REPAIRS</Text>
            {filteredJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="documents-outline" size={48} color="#A0AEC0" />
                <Text style={styles.emptyTitle}>No completed jobs yet</Text>
                <Text style={styles.emptySub}>
                  Accept tractor requests to start building your work history.
                </Text>
              </View>
            ) : (
              filteredJobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobCardHeader}>
                    <View>
                      <Text style={styles.jobCustomer}>{job.customerName}</Text>
                      <Text style={styles.jobDate}>{job.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.payMethodBadge,
                        job.paymentMethod === 'online'
                          ? styles.payOnlineBadge
                          : styles.payCashBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.payMethodText,
                          job.paymentMethod === 'online'
                            ? styles.payOnlineText
                            : styles.payCashText,
                        ]}
                      >
                        {job.paymentMethod.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobDivider} />

                  <Text style={styles.jobTractor}>🚜 {job.tractor}</Text>
                  <Text style={styles.jobProblem}>Fault: {job.category}</Text>

                  <View style={styles.jobFinancialRow}>
                    <View>
                      <Text style={styles.finLabel}>Total Billed</Text>
                      <Text style={styles.finValue}>{formatCurrency(job.totalAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.finLabel}>Platform Fee (10%)</Text>
                      <Text style={styles.finFee}>-{formatCurrency(job.platformFee)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.finLabel}>Your Earnings</Text>
                      <Text style={styles.finNet}>{formatCurrency(job.mechanicEarnings)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  filterRow: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
  },
  filterChipActive: {
    backgroundColor: '#1E3A5F',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
  },
  filterTextActive: {
    color: '#FFB300',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  activeJobCard: {
    backgroundColor: '#1E3A5F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FFB300',
    elevation: 3,
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 1,
  },
  activeJobDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  activeJobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  quoteLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  quoteValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFB300',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFB300',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  resumeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
  },
  jobDate: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  payMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payCashBadge: {
    backgroundColor: '#FFF3E0',
  },
  payOnlineBadge: {
    backgroundColor: '#E8F5E9',
  },
  payMethodText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  payCashText: {
    color: '#E65100',
  },
  payOnlineText: {
    color: '#2E7D32',
  },
  jobDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 12,
  },
  jobTractor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
  },
  jobProblem: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  jobFinancialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  finLabel: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '600',
  },
  finValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 2,
  },
  finFee: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E53E3E',
    marginTop: 2,
  },
  finNet: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D32',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  emptySub: {
    fontSize: 13,
    color: '#A0AEC0',
    textAlign: 'center',
  },
});
