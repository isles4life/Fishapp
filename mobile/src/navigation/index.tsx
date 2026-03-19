import React, { createContext, useContext, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import TournamentScreen from '../screens/Tournament/TournamentScreen';
import LeaderboardScreen from '../screens/Leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import PublicProfileScreen from '../screens/Profile/PublicProfileScreen';
import SubmissionFlowScreen from '../screens/Submission/SubmissionFlowScreen';
import FishingIntelligenceScreen from '../screens/FishingIntelligence/FishingIntelligenceScreen';
import HotSpotsScreen from '../screens/Map/HotSpotsScreen';
import LegalScreen from '../screens/Legal/LegalScreen';
import TournamentHistoryScreen from '../screens/Tournament/TournamentHistoryScreen';
import CheckInScreen from '../screens/Tournament/CheckInScreen';
import { HomeIcon, LeaderboardIcon, TrophyIcon, ProfileIcon, CameraIcon } from '../components/icons/TabIcons';
import { colors } from '../theme/colors';

// Tournament context — lets leaderboard/submission know the active tournamentId
export const TournamentContext = createContext<{
  tournamentId: string | null;
  setTournamentId: (id: string | null) => void;
  scoringMethod: string;
  setScoringMethod: (m: string) => void;
}>({
  tournamentId: null,
  setTournamentId: () => {},
  scoringMethod: 'LENGTH',
  setScoringMethod: () => {},
});

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Submission: { tournamentId: string; scoringMethod: string };
  PublicProfile: { username: string };
  Forecast: undefined;
  HotSpots: undefined;
  Legal: undefined;
  TournamentHistory: undefined;
  CheckIn: { code?: string } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Submit: undefined;
  Tournaments: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder screen for Submit tab — immediately opens Submission modal
function SubmitPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={tabStyles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isSubmit = route.name === 'Submit';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isSubmit) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={tabStyles.submitBtn} activeOpacity={0.8}>
              <View style={tabStyles.submitCircle}>
                <CameraIcon color={colors.bg} size={24} />
              </View>
            </TouchableOpacity>
          );
        }

        const iconColor = isFocused ? colors.accent : colors.textMuted;
        let Icon: React.FC<{ color: string; size?: number }>;
        if (route.name === 'Home') Icon = HomeIcon;
        else if (route.name === 'Leaderboard') Icon = LeaderboardIcon;
        else if (route.name === 'Tournaments') Icon = TrophyIcon;
        else Icon = ProfileIcon;

        const label = route.name === 'Tournaments' ? 'Compete' : route.name;

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={tabStyles.tab} activeOpacity={0.7}>
            <Icon color={iconColor} size={22} />
            <Text style={[tabStyles.label, { color: iconColor }]}>{label}</Text>
            {isFocused && <View style={tabStyles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.navBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
    paddingTop: 8,
    height: 80,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  submitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  submitCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.navBg,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});

function MainTabs() {
  const { tournamentId, scoringMethod } = useContext(TournamentContext);

  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen
        name="Submit"
        component={SubmitPlaceholder}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            if (tournamentId) {
              navigation.navigate('Submission', { tournamentId, scoringMethod });
            } else {
              Alert.alert('No Active Tournament', 'There is no active tournament right now. Check back when a new week opens.');
            }
          },
        })}
      />
      <Tab.Screen name="Tournaments" component={TournamentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: ['fishleague://'],
  config: {
    screens: {
      MainTabs: '',
      CheckIn: 'check-in',
    },
  },
};

export default function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [scoringMethod, setScoringMethod] = useState('LENGTH');
  return (
    <TournamentContext.Provider value={{ tournamentId, setTournamentId, scoringMethod, setScoringMethod }}>
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Submission" component={SubmissionFlowScreen} />
          <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
          <Stack.Screen name="Forecast" component={FishingIntelligenceScreen} />
          <Stack.Screen name="HotSpots" component={HotSpotsScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} options={{ title: 'Legal' }} />
          <Stack.Screen name="TournamentHistory" component={TournamentHistoryScreen} />
          <Stack.Screen name="CheckIn" component={CheckInScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </TournamentContext.Provider>
  );
}
