import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import NewGameScreen from '../screens/NewGameScreen';
import StatsScreen from '../screens/StatsScreen';
import PlayersScreen from '../screens/PlayersScreen';
import PlayerDetailScreen from '../screens/PlayerDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#1a1a2e' },
  headerTintColor: '#fff',
  contentStyle: { backgroundColor: '#16213e' }
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Canasta Tracker' }} />
      <Stack.Screen name="NewGame" component={NewGameScreen} options={{ title: 'Neues Spiel' }} />
    </Stack.Navigator>
  );
}

function StatsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="StatsMain" component={StatsScreen} options={{ title: 'Statistiken' }} />
      <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} options={{ title: 'Spieler' }} />
    </Stack.Navigator>
  );
}

function PlayersStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="PlayersMain" component={PlayersScreen} options={{ title: 'Spieler' }} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#0f3460' },
      tabBarActiveTintColor: '#e94560',
      tabBarInactiveTintColor: '#888',
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'Stats') iconName = 'stats-chart';
        else if (route.name === 'Players') iconName = 'people';
        return <Ionicons name={iconName} size={size} color={color} />;
      }
    })}>
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="Stats" component={StatsStack} options={{ title: 'Stats' }} />
      <Tab.Screen name="Players" component={PlayersStack} options={{ title: 'Spieler' }} />
    </Tab.Navigator>
  );
}
