import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import Navigation from './src/navigation';
import { storage } from './src/services/storage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getToken().then(token => {
      setIsAuthenticated(!!token);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a5276" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Navigation isAuthenticated={isAuthenticated} />
    </>
  );
}
