/**
 * Expenses Screen
 * Displays all expenses for a trip and user balance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api, { endpoints } from '../config/api';

export default function ExpensesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tripId } = route.params;
  const [expenses, setExpenses] = useState([]);
  const [userBalance, setUserBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tripId, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesResponse, balanceResponse] = await Promise.all([
        api.get(endpoints.expenses.get(tripId)),
        api.get(endpoints.expenses.getUserBalance(tripId, user.id)),
      ]);
      setExpenses(expensesResponse.expenses || []);
      setUserBalance(balanceResponse);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderExpense = ({ item }) => {
    const userSplit = item.splits?.find(s => s.userId === user.id);
    const isPayer = item.payerId === user.id;

    return (
      <TouchableOpacity style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseDescription}>{item.description || 'Expense'}</Text>
          <Text style={styles.expenseAmount}>
            {item.currency} {item.amount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.expenseDetails}>
          <Text style={styles.expensePayer}>
            Paid by: {isPayer ? 'You' : `User ${item.payerId.slice(0, 8)}`}
          </Text>
          {userSplit && (
            <Text
              style={[
                styles.expenseSplit,
                isPayer ? styles.youPaid : styles.youOwe,
              ]}
            >
              {isPayer
                ? `You paid ${item.amount.toFixed(2)}`
                : `You owe ${userSplit.amount.toFixed(2)}`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {userBalance && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Your Balance</Text>
          <Text
            style={[
              styles.balanceAmount,
              userBalance.balance > 0
                ? styles.balancePositive
                : userBalance.balance < 0
                ? styles.balanceNegative
                : styles.balanceZero,
            ]}
          >
            {userBalance.balance > 0
              ? `You are owed ${Math.abs(userBalance.balance).toFixed(2)}`
              : userBalance.balance < 0
              ? `You owe ${Math.abs(userBalance.balance).toFixed(2)}`
              : 'All settled up!'}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddExpense', { tripId })}
        >
          <Text style={styles.addButtonText}>+ Add Expense</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses yet</Text>
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
  balanceCard: {
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
  balanceTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
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
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expenseDescription: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expensePayer: {
    fontSize: 14,
    color: '#666',
  },
  expenseSplit: {
    fontSize: 14,
    fontWeight: '600',
  },
  youPaid: {
    color: '#34C759',
  },
  youOwe: {
    color: '#FF3B30',
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

