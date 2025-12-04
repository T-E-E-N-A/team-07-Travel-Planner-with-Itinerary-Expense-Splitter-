/**
 * Settlement Screen
 * Shows simplified debt transactions and allows marking as settled
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';

export default function SettlementScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { queueAction } = useOffline();
  const { tripId } = route.params;
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettlement();
  }, [tripId]);

  const loadSettlement = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.expenses.getBalances(tripId));
      setSettlement(response);
    } catch (error) {
      console.error('Error loading settlement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (transaction) => {
    Alert.alert(
      'Settle Up',
      `Mark payment of ${transaction.amount.toFixed(2)} as settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Settled',
          onPress: async () => {
            try {
              await queueAction('POST', endpoints.expenses.settle(tripId), {
                fromUserId: transaction.from,
                toUserId: transaction.to,
                amount: transaction.amount,
              });
              Alert.alert('Success', 'Transaction marked as settled');
              loadSettlement();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderTransaction = ({ item }) => {
    const isInvolved = item.from === user.id || item.to === user.id;
    const isPayer = item.from === user.id;

    return (
      <View style={[styles.transactionCard, isInvolved && styles.transactionCardHighlight]}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionUsers}>
            <Text style={styles.transactionFrom}>
              {item.from === user.id ? 'You' : `User ${item.from.slice(0, 8)}`}
            </Text>
            <Text style={styles.transactionArrow}>→</Text>
            <Text style={styles.transactionTo}>
              {item.to === user.id ? 'You' : `User ${item.to.slice(0, 8)}`}
            </Text>
          </View>
          <Text style={styles.transactionAmount}>
            ${item.amount.toFixed(2)}
          </Text>
        </View>
        {isInvolved && (
          <Text style={styles.transactionNote}>
            {isPayer ? 'You need to pay' : 'You will receive'} ${item.amount.toFixed(2)}
          </Text>
        )}
        {isInvolved && (
          <TouchableOpacity
            style={styles.settleButton}
            onPress={() => handleSettle(item)}
          >
            <Text style={styles.settleButtonText}>Mark as Settled</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!settlement) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const userBalance = settlement.balances?.[user.id] || 0;
  const userTransactions = settlement.transactions?.filter(
    t => t.from === user.id || t.to === user.id
  ) || [];

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Settlement Summary</Text>
        <Text style={styles.summaryText}>
          Total transactions needed: {settlement.totalTransactions || 0}
        </Text>
        <Text
          style={[
            styles.summaryBalance,
            userBalance > 0
              ? styles.balancePositive
              : userBalance < 0
              ? styles.balanceNegative
              : styles.balanceZero,
          ]}
        >
          Your balance: ${Math.abs(userBalance).toFixed(2)}{' '}
          {userBalance > 0 ? '(owed to you)' : userBalance < 0 ? '(you owe)' : '(settled)'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Simplified Transactions ({settlement.transactions?.length || 0})
        </Text>
        <Text style={styles.sectionSubtitle}>
          These are the minimum transactions needed to settle all debts
        </Text>
      </View>

      <FlatList
        data={settlement.transactions || []}
        renderItem={renderTransaction}
        keyExtractor={(item, index) => `${item.from}-${item.to}-${index}`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSettlement} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>All settled up! 🎉</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  summaryBalance: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  balancePositive: {
    color: '#34C759',
  },
  balanceNegative: {
    color: '#FF3B30',
  },
  balanceZero: {
    color: '#666',
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  listContent: {
    padding: 15,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionCardHighlight: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionArrow: {
    fontSize: 16,
    marginHorizontal: 10,
    color: '#666',
  },
  transactionTo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  transactionNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  settleButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
});

