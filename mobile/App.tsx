import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StripeProvider } from '@stripe/stripe-react-native';
import {
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import Navigation from './src/navigation';
import { storage } from './src/services/storage';
import { colors } from './src/theme/colors';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    Oswald_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    storage.getToken().then(token => {
      setIsAuthenticated(!!token);
      setAuthLoading(false);
    });
  }, []);

  if (!fontsLoaded || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Image source={require('./assets/icon.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey="pk_test_519z6DcLTGJy3qhJ5lnE3mgKKDRi0ddiykhVA5krbMntqqbElVDYobAgb6atzsYHnJwBs5WVhBbUR9CLIfhkpMdH500BUjEm5DC">
      <StatusBar style="light" />
      <Navigation isAuthenticated={isAuthenticated} />
    </StripeProvider>
  );
}
