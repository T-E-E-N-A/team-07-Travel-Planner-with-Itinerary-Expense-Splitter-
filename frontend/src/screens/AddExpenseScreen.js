/**
 * Add Expense Screen
 * Create a new expense with splitting options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';

export default function AddExpenseScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { queueAction } = useOffline();
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [equalSplit, setEqualSplit] = useState(true);
  const [splits, setSplits] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await api.get(endpoints.trips.get(tripId));
      setTrip(response.trip);
      // Initialize splits
      const members = response.trip.members || [];
      const initialSplits = {};
      members.forEach(member => {
        initialSplits[member.userId] = { selected: true, amount: 0 };
      });
      setSplits(initialSplits);
    } catch (error) {
      console.error('Error loading trip:', error);
    }
  };

  const updateEqualSplits = () => {
    if (!amount || !trip) return;
    const selectedMembers = Object.keys(splits).filter(
      id => splits[id].selected
    );
    if (selectedMembers.length === 0) return;

    const splitAmount = parseFloat(amount) / selectedMembers.length;
    const newSplits = { ...splits };
    selectedMembers.forEach(id => {
      newSplits[id] = { ...newSplits[id], amount: splitAmount };
    });
    setSplits(newSplits);
  };

  useEffect(() => {
    if (equalSplit) {
      updateEqualSplits();
    }
  }, [amount, equalSplit]);

  const handleSubmit = async () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const selectedSplits = Object.keys(splits)
      .filter(id => splits[id].selected)
      .map(id => ({
        userId: id,
        amount: splits[id].amount,
      }));

    if (selectedSplits.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    const totalSplit = selectedSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
      Alert.alert('Error', 'Sum of splits must equal total amount');
      return;
    }

    try {
      setLoading(true);
      await queueAction('POST', endpoints.expenses.create(), {
        tripId,
        payerId: user.id,
        amount: parseFloat(amount),
        description,
        splits: selectedSplits,
        currency,
      });

      Alert.alert('Success', 'Expense added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      if (error.queued) {
        Alert.alert('Queued', 'Expense will be added when online');
        navigation.goBack();
      } else {
        Alert.alert('Error', error.message || 'Failed to add expense');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Dinner at restaurant"
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Amount *</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            value={amount}
            onChangeText={text => {
              setAmount(text);
              if (equalSplit) {
                setTimeout(updateEqualSplits, 100);
              }
            }}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.currencyInput]}
            placeholder="USD"
            value={currency}
            onChangeText={setCurrency}
          />
        </View>

        <View style={styles.splitToggle}>
          <Text style={styles.label}>Equal Split</Text>
          <Switch value={equalSplit} onValueChange={setEqualSplit} />
        </View>

        <Text style={styles.label}>Split Between</Text>
        {trip.members?.map(member => {
          const split = splits[member.userId] || { selected: false, amount: 0 };
          return (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Switch
                  value={split.selected}
                  onValueChange={selected => {
                    const newSplits = {
                      ...splits,
                      [member.userId]: { ...split, selected },
                    };
                    setSplits(newSplits);
                    if (equalSplit && selected) {
                      setTimeout(updateEqualSplits, 100);
                    }
                  }}
                />
                <Text style={styles.memberName}>
                  {member.userId === user.id
                    ? 'You'
                    : `User ${member.userId.slice(0, 8)}`}
                </Text>
              </View>
              {split.selected && (
                <TextInput
                  style={styles.splitAmountInput}
                  value={split.amount.toFixed(2)}
                  onChangeText={text => {
                    const newSplits = {
                      ...splits,
                      [member.userId]: {
                        ...split,
                        amount: parseFloat(text) || 0,
                      },
                    };
                    setSplits(newSplits);
                  }}
                  keyboardType="decimal-pad"
                  editable={!equalSplit}
                />
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  amountInput: {
    flex: 2,
  },
  currencyInput: {
    flex: 1,
  },
  splitToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  splitAmountInput: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    width: 80,
    textAlign: 'right',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

