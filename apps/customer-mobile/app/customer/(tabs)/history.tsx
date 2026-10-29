import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!user?.id) return;

    try {
      // Get customer id
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (customer) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select(`
            id,
            status,
            created_at,
            completed_at,
            repair_requests (
              description,
              tractors (make, model),
              problem_categories (name_en)
            ),
            mechanics (
              profiles!mechanics_profile_id_fkey (full_name)
            ),
            invoices (total, status)
          `)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

        setJobs(jobsData || []);
      }
    } catch (err: any) {
      console.warn('History fetch error:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchHistory();
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const tractor = item.repair_requests?.tractors;
    const category = item.repair_requests?.problem_categories?.name_en || 'General Repair';
    const mechanicName = item.mechanics?.profiles?.full_name || 'Assigned Mechanic';
    const total = item.invoices?.[0]?.total ? `₹${Number(item.invoices[0].total).toFixed(2)}` : '--';
    const date = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const isCompleted = item.status === 'completed';

    return (
      <View style={styles.jobCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.tractorText}>
              {tractor ? `${tractor.make} ${tractor.model}` : 'Tractor Repair'}
            </Text>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isCompleted ? styles.statusCompleted : styles.statusInProgress,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isCompleted ? styles.statusTextCompleted : styles.statusTextInProgress,
              ]}
            >
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{mechanicName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{date}</Text>
          </View>
          <Text style={styles.priceText}>{total}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#2E7D32']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>No repairs yet</Text>
            <Text style={styles.emptySubtitle}>
              When you book a tractor repair service, your history and invoices will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tractorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusInProgress: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#2E7D32',
  },
  statusTextInProgress: {
    color: '#E65100',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
