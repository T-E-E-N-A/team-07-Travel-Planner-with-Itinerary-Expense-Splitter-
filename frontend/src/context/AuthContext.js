/**
 * Authentication Context
 * Manages user authentication state
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { endpoints } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        // Fetch user profile
        const userData = await api.get(endpoints.users.get(userId));
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (userId, userData) => {
    try {
      await AsyncStorage.setItem('userId', userId);
      if (userData) {
        await api.post(endpoints.users.create(), {
          userId,
          ...userData,
        });
        setUser({ id: userId, ...userData });
      } else {
        const response = await api.get(endpoints.users.get(userId));
        setUser(response.user);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('authToken');
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateUser = async userData => {
    try {
      await api.post(endpoints.users.create(), {
        userId: user.id,
        ...userData,
      });
      setUser({ ...user, ...userData });
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

