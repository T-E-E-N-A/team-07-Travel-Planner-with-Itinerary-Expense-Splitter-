/**
 * Offline Context
 * Manages offline data synchronization
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Note: NetInfo import - use @react-native-community/netinfo or expo-network
// For Expo, you can use: import * as Network from 'expo-network';
// For React Native CLI: import NetInfo from '@react-native-community/netinfo';
// This is a placeholder - adjust based on your setup
const NetInfo = {
  addEventListener: (callback) => {
    // Mock implementation - replace with actual NetInfo
    const unsubscribe = () => {};
    return unsubscribe;
  }
};
import api from '../config/api';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState([]);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        syncPendingActions();
      }
    });

    // Load pending actions on mount
    loadPendingActions();

    return () => unsubscribe();
  }, []);

  const loadPendingActions = async () => {
    try {
      const stored = await AsyncStorage.getItem('pendingActions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const savePendingActions = async actions => {
    try {
      await AsyncStorage.setItem('pendingActions', JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const addPendingAction = async action => {
    const newActions = [...pendingActions, { ...action, id: Date.now() }];
    await savePendingActions(newActions);
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return;

    const synced = [];
    const failed = [];

    for (const action of pendingActions) {
      try {
        // Execute the pending action
        await api({
          method: action.method,
          url: action.url,
          data: action.data,
        });
        synced.push(action.id);
      } catch (error) {
        console.error('Error syncing action:', error);
        failed.push(action);
      }
    }

    // Remove synced actions
    const remaining = pendingActions.filter(
      action => !synced.includes(action.id)
    );
    await savePendingActions(remaining);
  };

  const queueAction = async (method, url, data) => {
    if (isOnline) {
      try {
        return await api({ method, url, data });
      } catch (error) {
        // If offline after request, queue it
        if (!isOnline) {
          await addPendingAction({ method, url, data });
          throw { message: 'Action queued for sync', queued: true };
        }
        throw error;
      }
    } else {
      // Queue for later
      await addPendingAction({ method, url, data });
      throw { message: 'Action queued for sync', queued: true };
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingActions,
        queueAction,
        syncPendingActions,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

