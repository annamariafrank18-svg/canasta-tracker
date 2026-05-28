import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getPlayerStats } from '../api/client';

export default function PlayerDetailScreen({ route }) {
  const { playerId } = route.params;
  const [data, setData] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: stats } = await getPlayerStats(playerId);
      setData(stats);
    } catch (err) {
      console.error(err);
    }
  };

  if (!data) return <View style={styles.container}><Text style={styles.loading}>Lade...</Text></View>;

  const winRate = data.stats?.totalGames > 0
    ? Math.round((data.stats.totalWins / data.stats.totalGames) * 100)
    : 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{data.player.name}</Text>

      {/* Main Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.stats?.totalGames || 0}</Text>
          <Text style={styles.statLabel}>Spiele</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#4caf50' }]}>{winRate}%</Text>
          <Text style={styles.statLabel}>Winrate</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.stats?.bestStreak || 0}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
      </View>

      {/* Recent Form */}
      <Text style={styles.sectionTitle}>Letzte 10 Spiele</Text>
      <View style={styles.formRow}>
        {data.recentForm?.map((game, i) => (
          <View key={i} style={[styles.formDot, game.won ? styles.formWin : styles.formLoss]}>
            <Text style={styles.formText}>{game.won ? 'W' : 'L'}</Text>
          </View>
        ))}
      </View>

      {/* Best Partners */}
      {data.bestPartners?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Beste Partner</Text>
          {data.bestPartners.slice(0, 5).map((partner, i) => (
            <View key={i} style={styles.partnerRow}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.partnerStat}>{partner.winRate}% ({partner.games} Spiele)</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 16 },
  loading: { color: '#888', textAlign: 'center', marginTop: 40 },
  name: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  formRow: { flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  formDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  formWin: { backgroundColor: '#4caf50' },
  formLoss: { backgroundColor: '#e94560' },
  formText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8
  },
  partnerName: { color: '#fff', fontSize: 15 },
  partnerStat: { color: '#4caf50', fontSize: 14 }
});
