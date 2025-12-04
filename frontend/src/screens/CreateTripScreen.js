/**
 * Create Trip Screen
 * Allows users to create a new trip
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';
import * as ImagePicker from 'expo-image-picker';

export default function CreateTripScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { queueAction } = useOffline();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !destination.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      const response = await queueAction(
        'POST',
        endpoints.trips.create(),
        {
          title,
          destination,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          coverImage,
          adminId: user.id,
        }
      );

      Alert.alert('Success', 'Trip created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('TripDetail', { tripId: response.trip.id }),
        },
      ]);
    } catch (error) {
      if (error.queued) {
        Alert.alert('Queued', 'Trip will be created when online');
        navigation.goBack();
      } else {
        Alert.alert('Error', error.message || 'Failed to create trip');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Trip Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Summer Vacation 2024"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Destination *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Paris, France"
          value={destination}
          onChangeText={setDestination}
        />

        <Text style={styles.label}>Start Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateText}>
            {startDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        <Text style={styles.label}>End Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.dateText}>
            {endDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <Text style={styles.label}>Cover Image</Text>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.imageButtonText}>Pick Image</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Trip'}
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
  dateButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  imageButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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

