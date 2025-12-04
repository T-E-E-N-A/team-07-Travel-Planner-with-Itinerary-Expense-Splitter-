/**
 * Join Trip Screen
 * Allows users to join a trip via invite code or link
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';

export default function JoinTripScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { queueAction } = useOffline();
  const [tripId, setTripId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!tripId.trim()) {
      Alert.alert('Error', 'Please enter a trip ID or invite link');
      return;
    }

    try {
      setLoading(true);
      const response = await queueAction(
        'POST',
        endpoints.trips.join(tripId),
        {
          userId: user.id,
          inviteCode: inviteCode.trim() || undefined,
        }
      );

      Alert.alert('Success', 'Successfully joined trip!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('TripDetail', { tripId }),
        },
      ]);
    } catch (error) {
      if (error.queued) {
        Alert.alert('Queued', 'Join request will be processed when online');
        navigation.goBack();
      } else {
        Alert.alert('Error', error.message || 'Failed to join trip');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Trip ID or Invite Link</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter trip ID or paste invite link"
          value={tripId}
          onChangeText={setTripId}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Invite Code (if required)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Joining...' : 'Join Trip'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          You can get the trip ID or invite link from the trip admin
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  form: {
    flex: 1,
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
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

