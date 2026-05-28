import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

export default function HomeScreen({ navigation }) {
  const { games, overview, fetchGames, fetchOverview } = useGameStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    fetchGames();
    fetchOverview();
  }, []);

  const renderGame = ({ item }) => {
    const teamA = item.players?.filter(p => p.team === 'A').map(p => p.player.name).join(', ');
    const teamB = item.players?.filter(p => p.team === 'B').map(p => p.player.name).join(', ');
    const aWon = item.teamAScore > item.teamBScore;

    return (
      <View style={styles.gameCard}>
        <Text style={styles.gameDate}>{new Date(item.date).toLocaleDateString('de-DE')}</Text>
        <View style={styles.scoreRow}>
          <View style={[styles.teamCol, aWon && styles.winnerCol]}>
            <Text style={styles.teamLabel}>Team A</Text>
            <Text style={styles.teamNames}>{teamA}</Text>
            <Text style={[styles.score, aWon && styles.winnerScore]}>{item.teamAScore}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={[styles.teamCol, !aWon && styles.winnerCol]}>
            <Text style={styles.teamLabel}>Team B</Text>
            <Text style={styles.teamNames}>{teamB}</Text>
            <Text style={[styles.score, !aWon && styles.winnerScore]}>{item.teamBScore}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Quick Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{overview?.totalGames || 0}</Text>
          <Text style={styles.statLabel}>Spiele</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>Hallo, {user?.name}!</Text>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* New Game Button */}
      <TouchableOpacity style={styles.newGameBtn} onPress={() => navigation.navigate('NewGame')}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.newGameText}>Neues Spiel eintragen</Text>
      </TouchableOpacity>

      {/* Recent Games */}
      <Text style={styles.sectionTitle}>Letzte Spiele</Text>
      <FlatList
        data={games}
        keyExtractor={item => item.id}
        renderItem={renderGame}
        ListEmptyComponent={
          <Text style={styles.empty}>Noch keine Spiele. Trag dein erstes ein!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 16 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  statItem: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  logoutText: { color: '#e94560', fontSize: 12, marginTop: 4 },
  newGameBtn: {
    backgroundColor: '#e94560',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8
  },
  newGameText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  gameCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  gameDate: { color: '#888', fontSize: 12, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  teamCol: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 8 },
  winnerCol: { backgroundColor: 'rgba(233, 69, 96, 0.1)' },
  teamLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  teamNames: { color: '#ccc', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  score: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  winnerScore: { color: '#e94560' },
  vs: { color: '#555', fontSize: 14, marginHorizontal: 8 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 15 }
});
