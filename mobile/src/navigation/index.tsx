import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import TournamentHomeScreen from '../screens/Tournament/TournamentHomeScreen';
import SubmissionFlowScreen from '../screens/Submission/SubmissionFlowScreen';
import LeaderboardScreen from '../screens/Leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import PublicProfileScreen from '../screens/Profile/PublicProfileScreen';
import { colors } from '../theme/colors';

// ── Route type definitions ────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Submission: { tournamentId: string };
  Leaderboard: { tournamentId: string };
  PublicProfile: { username: string };
};

export type TabParamList = {
  Tournament: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ── Tab navigator (authenticated) ─────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Tournament"
        component={TournamentHomeScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🎣</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

// ── Root stack ────────────────────────────────────────────────────────────────

export default function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerBackTitleVisible: false,
        }}
      >
        {/* Auth screens — no header */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />

        {/* Main app with tabs */}
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

        {/* Full-screen stack screens */}
        <Stack.Screen name="Submission" component={SubmissionFlowScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
