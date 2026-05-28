import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';

export default function StatsScreen({ navigation }) {
  const { rankings, funStats, fetchRankings, fetchFunStats } = useGameStore();

  useEffect(() => {
    fetchRankings();
    fetchFunStats();
  }, []);

  const renderPlayer = ({ item, index }) => (
    <TouchableOpacity
      style={styles.rankCard}
      onPress={() => navigation.navigate('PlayerDetail', { playerId: item.id })}
    >
      <Text style={styles.rank}>#{index + 1}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{item.name}</Text>
        <Text style={styles.rankSub}>{item.totalGames} Spiele • ∅ {item.avgPoints} Punkte</Text>
      </View>
      <View style={styles.rankRight}>
        <Text style={styles.winRate}>{item.winRate}%</Text>
        <Text style={styles.winRateLabel}>Winrate</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Fun Stats */}
      {funStats && (
        <View style={styles.funSection}>
          {funStats.goat && (
            <View style={styles.funCard}>
              <Text style={styles.funEmoji}>🐐</Text>
              <Text style={styles.funTitle}>GOAT</Text>
              <Text style={styles.funName}>{funStats.goat.name}</Text>
              <Text style={styles.funStat}>{funStats.goat.winRate}% Winrate</Text>
            </View>
          )}
          {funStats.streakKing && (
            <View style={styles.funCard}>
              <Text style={styles.funEmoji}>🔥</Text>
              <Text style={styles.funTitle}>Streak King</Text>
              <Text style={styles.funName}>{funStats.streakKing.name}</Text>
              <Text style={styles.funStat}>{funStats.streakKing.bestStreak}x in Folge</Text>
            </View>
          )}
          {funStats.pointMachine && (
            <View style={styles.funCard}>
              <Text style={styles.funEmoji}>💰</Text>
              <Text style={styles.funTitle}>Point Machine</Text>
              <Text style={styles.funName}>{funStats.pointMachine.name}</Text>
              <Text style={styles.funStat}>∅ {funStats.pointMachine.avgPoints}</Text>
            </View>
          )}
        </View>
      )}

      {/* Rankings */}
      <Text style={styles.sectionTitle}>Ranking</Text>
      <FlatList
        data={rankings}
        keyExtractor={item => item.id}
        renderItem={renderPlayer}
        ListEmptyComponent={
          <Text style={styles.empty}>Noch keine Daten. Spielt ein paar Runden!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 16 },
  funSection: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  funCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center'
  },
  funEmoji: { fontSize: 24, marginBottom: 4 },
  funTitle: { color: '#888', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  funName: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  funStat: { color: '#e94560', fontSize: 11, marginTop: 2 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  rank: { color: '#e94560', fontSize: 18, fontWeight: 'bold', width: 36 },
  rankInfo: { flex: 1 },
  rankName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rankSub: { color: '#888', fontSize: 12, marginTop: 2 },
  rankRight: { alignItems: 'center' },
  winRate: { color: '#4caf50', fontSize: 20, fontWeight: 'bold' },
  winRateLabel: { color: '#888', fontSize: 10 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 15 }
});
