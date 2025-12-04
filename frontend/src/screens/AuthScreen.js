/**
 * Authentication Screen
 * Simple mock authentication for demo purposes
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

export default function AuthScreen() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }

    try {
      await signIn(userId, { name: name || 'User' });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel Planner</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="User ID"
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Name (optional)"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        For demo: Enter any user ID to continue
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
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

