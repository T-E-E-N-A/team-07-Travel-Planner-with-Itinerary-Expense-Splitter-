/**
 * Home Screen
 * Displays user's trips and allows creating/joining new trips
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api, { endpoints } from '../config/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, [user]);

  const loadTrips = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await api.get(endpoints.trips.getUserTrips(user.id));
      setTrips(response.trips || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTrip = ({ item }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
    >
      {item.coverImage && (
        <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
      )}
      <View style={styles.tripContent}>
        <Text style={styles.tripTitle}>{item.title}</Text>
        <Text style={styles.tripDestination}>{item.destination}</Text>
        <Text style={styles.tripDates}>
          {new Date(item.startDate).toLocaleDateString()} -{' '}
          {new Date(item.endDate).toLocaleDateString()}
        </Text>
        <View style={styles.tripFooter}>
          <Text style={styles.memberCount}>
            {item.members?.length || 0} members
          </Text>
          {item.isFinalized && (
            <View style={styles.finalizedBadge}>
              <Text style={styles.finalizedText}>Finalized</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={() => navigation.navigate('CreateTrip')}
          >
            <Text style={styles.buttonText}>Create Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={() => navigation.navigate('JoinTrip')}
          >
            <Text style={styles.buttonText}>Join Trip</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={trips}
        renderItem={renderTrip}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTrips} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySubtext}>
              Create or join a trip to get started
            </Text>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  joinButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  tripContent: {
    padding: 15,
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  tripDestination: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  tripDates: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
  },
  finalizedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  finalizedText: {
    color: '#fff',
    fontSize: 12,
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
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

