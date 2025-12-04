/**
 * Activity Detail Screen
 * View and edit activity details, add polls, attach documents
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
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';

export default function ActivityDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { queueAction } = useOffline();
  const { tripId, activityId } = route.params;
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadActivity();
  }, [tripId, activityId]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.itinerary.get(tripId));
      const foundActivity = response.itinerary.activities?.find(
        a => a.id === activityId
      );
      if (foundActivity) {
        setActivity(foundActivity);
        setFormData(foundActivity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await queueAction(
        'PUT',
        endpoints.itinerary.updateActivity(tripId, activityId),
        {
          userId: user.id,
          ...formData,
        }
      );
      setEditing(false);
      loadActivity();
      Alert.alert('Success', 'Activity updated');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCreatePoll = () => {
    Alert.prompt(
      'Create Poll',
      'Enter your question:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: question => {
            if (question) {
              Alert.prompt(
                'Poll Options',
                'Enter options separated by commas:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Create',
                    onPress: optionsText => {
                      if (optionsText) {
                        const options = optionsText
                          .split(',')
                          .map(opt => opt.trim())
                          .filter(opt => opt);
                        if (options.length >= 2) {
                          createPoll(question, options);
                        } else {
                          Alert.alert('Error', 'At least 2 options required');
                        }
                      }
                    },
                  },
                ],
                'plain-text'
              );
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const createPoll = async (question, options) => {
    try {
      await queueAction(
        'POST',
        endpoints.itinerary.createPoll(tripId, activityId),
        {
          question,
          options,
          userId: user.id,
        }
      );
      loadActivity();
      Alert.alert('Success', 'Poll created');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      await queueAction(
        'POST',
        endpoints.itinerary.vote(tripId, activityId, pollId),
        {
          userId: user.id,
          optionId,
        }
      );
      loadActivity();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading || !activity) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadActivity} />}
    >
      <View style={styles.content}>
        {editing ? (
          <>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={text => setFormData({ ...formData, title: text })}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={text => setFormData({ ...formData, description: text })}
              multiline
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={text => setFormData({ ...formData, location: text })}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setEditing(false);
                  setFormData(activity);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{activity.title}</Text>
            <Text style={styles.date}>
              {new Date(activity.date).toLocaleDateString()}
            </Text>
            {activity.startTime && (
              <Text style={styles.time}>
                {activity.startTime} {activity.endTime && `- ${activity.endTime}`}
              </Text>
            )}
            {activity.location && (
              <Text style={styles.location}>📍 {activity.location}</Text>
            )}
            {activity.description && (
              <Text style={styles.description}>{activity.description}</Text>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Activity</Text>
            </TouchableOpacity>

            {activity.polls && activity.polls.length > 0 && (
              <View style={styles.pollsSection}>
                <Text style={styles.sectionTitle}>Polls</Text>
                {activity.polls.map(poll => (
                  <View key={poll.id} style={styles.pollCard}>
                    <Text style={styles.pollQuestion}>{poll.question}</Text>
                    {poll.options.map(option => {
                      const voteCount = option.votes?.length || 0;
                      const hasVoted = option.votes?.includes(user.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.pollOption,
                            hasVoted && styles.pollOptionVoted,
                          ]}
                          onPress={() => handleVote(poll.id, option.id)}
                        >
                          <Text style={styles.pollOptionText}>{option.text}</Text>
                          <Text style={styles.pollVoteCount}>
                            {voteCount} vote{voteCount !== 1 ? 's' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.pollButton} onPress={handleCreatePoll}>
              <Text style={styles.pollButtonText}>+ Create Poll</Text>
            </TouchableOpacity>
          </>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  time: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
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
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pollsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  pollCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  pollOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  pollOptionVoted: {
    backgroundColor: '#E3F2FD',
  },
  pollOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pollVoteCount: {
    fontSize: 14,
    color: '#666',
  },
  pollButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  pollButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

