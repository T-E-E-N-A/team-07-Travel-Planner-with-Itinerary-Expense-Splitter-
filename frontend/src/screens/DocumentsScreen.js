/**
 * Documents Screen
 * View and manage trip documents
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import api, { endpoints } from '../config/api';

export default function DocumentsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { queueAction } = useOffline();
  const { tripId } = route.params;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [tripId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.documents.get(tripId));
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    Alert.alert(
      'Upload Document',
      'Choose document type',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Image',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please grant camera roll permissions');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });

            if (!result.canceled) {
              uploadFile(result.assets[0].uri, 'image', result.assets[0].mimeType);
            }
          },
        },
        {
          text: 'PDF/Document',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            });

            if (!result.canceled) {
              uploadFile(result.uri, 'document', result.mimeType);
            }
          },
        },
      ]
    );
  };

  const uploadFile = async (uri, documentType, mimeType) => {
    try {
      // In a real app, you'd need to convert the URI to a File/FormData
      // For now, we'll show a message
      Alert.alert(
        'Upload',
        'File upload functionality requires proper file handling. In production, convert URI to FormData and upload via multipart/form-data.',
        [{ text: 'OK' }]
      );

      // Example API call (would need proper FormData implementation)
      // const formData = new FormData();
      // formData.append('file', { uri, type: mimeType, name: 'document' });
      // formData.append('tripId', tripId);
      // formData.append('userId', user.id);
      // formData.append('documentType', documentType);
      //
      // await api.post(endpoints.documents.upload(), formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });
      //
      // loadDocuments();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to upload document');
    }
  };

  const handleDelete = async (documentId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await queueAction('DELETE', endpoints.documents.delete(documentId), {
                userId: user.id,
              });
              loadDocuments();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderDocument = ({ item }) => {
    const isImage = item.fileType?.startsWith('image/');

    return (
      <View style={styles.documentCard}>
        {isImage ? (
          <Image source={{ uri: item.fileUrl }} style={styles.documentImage} />
        ) : (
          <View style={styles.documentIcon}>
            <Text style={styles.documentIconText}>📄</Text>
          </View>
        )}
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={styles.documentType}>{item.documentType}</Text>
          <Text style={styles.documentDate}>
            {new Date(item.uploadedAt).toLocaleDateString()}
          </Text>
        </View>
        {item.userId === user.id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Text style={styles.uploadButtonText}>+ Upload Document</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={item => item.id}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadDocuments} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>
              Upload tickets, vouchers, or IDs
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
  uploadButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    margin: 5,
    flex: 1,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  documentIcon: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  documentIconText: {
    fontSize: 48,
  },
  documentInfo: {
    marginBottom: 10,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
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

