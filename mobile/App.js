import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  const token = useAuthStore(state => state.token);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
