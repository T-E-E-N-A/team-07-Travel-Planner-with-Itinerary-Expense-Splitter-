/**
 * Trip Detail Screen
 * Main screen for viewing trip details and navigating to features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api, { endpoints } from '../config/api';

export default function TripDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.trips.get(tripId));
      setTrip(response.trip);
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = trip?.adminId === user?.id;
  const userMember = trip?.members?.find(m => m.userId === user?.id);

  if (loading || !trip) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTrip} />}
    >
      {trip.coverImage && (
        <Image source={{ uri: trip.coverImage }} style={styles.coverImage} />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{trip.title}</Text>
        <Text style={styles.destination}>{trip.destination}</Text>
        <Text style={styles.dates}>
          {new Date(trip.startDate).toLocaleDateString()} -{' '}
          {new Date(trip.endDate).toLocaleDateString()}
        </Text>

        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members ({trip.members?.length || 0})</Text>
          <View style={styles.memberList}>
            {trip.members?.map(member => (
              <View key={member.userId} style={styles.memberItem}>
                <Text style={styles.memberName}>
                  {member.userId === user?.id ? 'You' : `User ${member.userId.slice(0, 8)}`}
                </Text>
                <Text style={styles.memberRole}>
                  {member.role === 'admin' ? '👑 Admin' : 'Member'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {trip.inviteCode && (
          <View style={styles.inviteSection}>
            <Text style={styles.sectionTitle}>Invite Code</Text>
            <Text style={styles.inviteCode}>{trip.inviteCode}</Text>
            <Text style={styles.inviteLink}>{trip.inviteLink}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Itinerary', { tripId })}
          >
            <Text style={styles.actionButtonText}>📅 Itinerary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Expenses', { tripId })}
          >
            <Text style={styles.actionButtonText}>💰 Expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Documents', { tripId })}
          >
            <Text style={styles.actionButtonText}>📁 Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Settlement', { tripId })}
          >
            <Text style={styles.actionButtonText}>💳 Settle Up</Text>
          </TouchableOpacity>
        </View>

        {isAdmin && !trip.isFinalized && (
          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={async () => {
              try {
                await api.post(endpoints.trips.finalize(tripId), { userId: user.id });
                Alert.alert('Success', 'Trip itinerary finalized');
                loadTrip();
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }}
          >
            <Text style={styles.finalizeButtonText}>Finalize Itinerary</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  destination: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  dates: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  memberList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  inviteSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  inviteLink: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 18,
    color: '#333',
  },
  finalizeButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

