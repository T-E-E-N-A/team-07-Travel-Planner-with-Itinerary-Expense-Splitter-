/**
 * API Configuration
 * Centralized API client and endpoints
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      // Server responded with error
      return Promise.reject({
        message: error.response.data?.error?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        status: 0,
      });
    } else {
      // Something else happened
      return Promise.reject({
        message: error.message || 'An unexpected error occurred',
        status: 0,
      });
    }
  }
);

export default api;

// API Endpoints
export const endpoints = {
  // Trips
  trips: {
    create: () => '/trips',
    get: tripId => `/trips/${tripId}`,
    join: tripId => `/trips/${tripId}/join`,
    getUserTrips: userId => `/trips/user/${userId}`,
    update: tripId => `/trips/${tripId}`,
    finalize: tripId => `/trips/${tripId}/finalize`,
    updateMemberRole: (tripId, memberId) => `/trips/${tripId}/members/${memberId}/role`,
  },
  // Itinerary
  itinerary: {
    get: tripId => `/itinerary/${tripId}`,
    addActivity: tripId => `/itinerary/${tripId}/activities`,
    updateActivity: (tripId, activityId) => `/itinerary/${tripId}/activities/${activityId}`,
    deleteActivity: (tripId, activityId) => `/itinerary/${tripId}/activities/${activityId}`,
    reorderActivities: tripId => `/itinerary/${tripId}/activities/reorder`,
    createPoll: (tripId, activityId) => `/itinerary/${tripId}/activities/${activityId}/polls`,
    vote: (tripId, activityId, pollId) =>
      `/itinerary/${tripId}/activities/${activityId}/polls/${pollId}/vote`,
  },
  // Expenses
  expenses: {
    get: tripId => `/expenses/${tripId}`,
    create: () => '/expenses',
    getById: (tripId, expenseId) => `/expenses/${tripId}/${expenseId}`,
    update: expenseId => `/expenses/${expenseId}`,
    delete: expenseId => `/expenses/${expenseId}`,
    getBalances: tripId => `/expenses/${tripId}/balances`,
    getUserBalance: (tripId, userId) => `/expenses/${tripId}/user/${userId}`,
    settle: tripId => `/expenses/${tripId}/settle`,
    getSettlements: tripId => `/expenses/${tripId}/settlements`,
  },
  // Documents
  documents: {
    upload: () => '/documents',
    get: tripId => `/documents/${tripId}`,
    getById: (tripId, documentId) => `/documents/${tripId}/${documentId}`,
    delete: documentId => `/documents/${documentId}`,
  },
  // Users
  users: {
    get: userId => `/users/${userId}`,
    create: () => '/users',
  },
  // Currency
  currency: {
    getRates: () => '/currency/rates',
    convert: () => '/currency/convert',
    getCurrencies: () => '/currency/currencies',
  },
};

