import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import TournamentHomeScreen from '../screens/Tournament/TournamentHomeScreen';
import SubmissionFlowScreen from '../screens/Submission/SubmissionFlowScreen';
import LeaderboardScreen from '../screens/Leaderboard/LeaderboardScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  TournamentHome: undefined;
  Submission: { tournamentId: string };
  Leaderboard: { tournamentId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="TournamentHome" component={TournamentHomeScreen} />
            <Stack.Screen name="Submission" component={SubmissionFlowScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
