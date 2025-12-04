/**
 * Itinerary Screen
 * Displays timeline of activities with drag-and-drop reordering
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
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';

export default function ItineraryScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { queueAction } = useOffline();
  const { tripId } = route.params;
  const [itinerary, setItinerary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItinerary();
  }, [tripId]);

  const loadItinerary = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.itinerary.get(tripId));
      setItinerary(response.itinerary);
      setActivities(response.itinerary.activities || []);
    } catch (error) {
      console.error('Error loading itinerary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async ({ data }) => {
    setActivities(data);
    // Update order on server
    try {
      const activityIds = data.map(a => a.id);
      await queueAction('PUT', endpoints.itinerary.reorderActivities(tripId), {
        userId: user.id,
        activityIds,
      });
    } catch (error) {
      console.error('Error reordering activities:', error);
    }
  };

  const renderActivity = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.activityCard, isActive && styles.activityCardActive]}
          onLongPress={drag}
          onPress={() => navigation.navigate('ActivityDetail', { tripId, activityId: item.id })}
          disabled={isActive}
        >
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityDate}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          {item.startTime && (
            <Text style={styles.activityTime}>
              {item.startTime} {item.endTime && `- ${item.endTime}`}
            </Text>
          )}
          {item.location && (
            <Text style={styles.activityLocation}>📍 {item.location}</Text>
          )}
          {item.description && (
            <Text style={styles.activityDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {item.polls && item.polls.length > 0 && (
            <View style={styles.pollBadge}>
              <Text style={styles.pollBadgeText}>
                {item.polls.length} poll{item.polls.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Navigate to add activity screen or show modal
            Alert.prompt(
              'Add Activity',
              'Enter activity title:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add',
                  onPress: async title => {
                    if (title) {
                      try {
                        await queueAction(
                          'POST',
                          endpoints.itinerary.addActivity(tripId),
                          {
                            title,
                            date: new Date().toISOString(),
                            userId: user.id,
                          }
                        );
                        loadItinerary();
                      } catch (error) {
                        Alert.alert('Error', error.message);
                      }
                    }
                  },
                },
              ],
              'plain-text'
            );
          }}
        >
          <Text style={styles.addButtonText}>+ Add Activity</Text>
        </TouchableOpacity>
      </View>

      <DraggableFlatList
        data={activities}
        onDragEnd={handleDragEnd}
        keyExtractor={item => item.id}
        renderItem={renderActivity}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadItinerary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activities yet</Text>
            <Text style={styles.emptySubtext}>
              Press and hold an activity to reorder
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
  activityCard: {
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
  activityCardActive: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
  },
  activityTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  activityLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  activityDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  pollBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  pollBadgeText: {
    fontSize: 12,
    color: '#1976D2',
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

