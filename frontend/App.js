/**
 * Travel Planner App - Main Entry Point
 * React Native application with Expo
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import JoinTripScreen from './src/screens/JoinTripScreen';
import ItineraryScreen from './src/screens/ItineraryScreen';
import ActivityDetailScreen from './src/screens/ActivityDetailScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SettlementScreen from './src/screens/SettlementScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';

// Import context providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {!user ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'My Trips' }}
            />
            <Stack.Screen
              name="CreateTrip"
              component={CreateTripScreen}
              options={{ title: 'Create Trip' }}
            />
            <Stack.Screen
              name="JoinTrip"
              component={JoinTripScreen}
              options={{ title: 'Join Trip' }}
            />
            <Stack.Screen
              name="TripDetail"
              component={TripDetailScreen}
              options={{ title: 'Trip Details' }}
            />
            <Stack.Screen
              name="Itinerary"
              component={ItineraryScreen}
              options={{ title: 'Itinerary' }}
            />
            <Stack.Screen
              name="ActivityDetail"
              component={ActivityDetailScreen}
              options={{ title: 'Activity' }}
            />
            <Stack.Screen
              name="Expenses"
              component={ExpensesScreen}
              options={{ title: 'Expenses' }}
            />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{ title: 'Add Expense' }}
            />
            <Stack.Screen
              name="Settlement"
              component={SettlementScreen}
              options={{ title: 'Settle Up' }}
            />
            <Stack.Screen
              name="Documents"
              component={DocumentsScreen}
              options={{ title: 'Documents' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </OfflineProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

