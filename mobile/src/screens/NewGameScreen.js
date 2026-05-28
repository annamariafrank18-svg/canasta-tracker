import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';

export default function NewGameScreen({ navigation }) {
  const { players, fetchPlayers, addGame, loading } = useGameStore();
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [teamAScore, setTeamAScore] = useState('');
  const [teamBScore, setTeamBScore] = useState('');

  useEffect(() => { fetchPlayers(); }, []);

  const togglePlayer = (playerId, team) => {
    if (team === 'A') {
      // Remove from B if there
      setTeamBPlayers(prev => prev.filter(id => id !== playerId));
      setTeamAPlayers(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
    } else {
      // Remove from A if there
      setTeamAPlayers(prev => prev.filter(id => id !== playerId));
      setTeamBPlayers(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
    }
  };

  const handleSave = async () => {
    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      Alert.alert('Fehler', 'Beide Teams brauchen mindestens einen Spieler');
      return;
    }
    if (!teamAScore || !teamBScore) {
      Alert.alert('Fehler', 'Bitte Punkte eingeben');
      return;
    }

    try {
      await addGame({
        teamAPlayers,
        teamBPlayers,
        teamAScore: parseInt(teamAScore),
        teamBScore: parseInt(teamBScore)
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Fehler', err);
    }
  };

  const getPlayerTeam = (id) => {
    if (teamAPlayers.includes(id)) return 'A';
    if (teamBPlayers.includes(id)) return 'B';
    return null;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Player Selection */}
      <Text style={styles.sectionTitle}>Spieler zuordnen</Text>
      <Text style={styles.hint}>Tippe links für Team A, rechts für Team B</Text>

      {players.map(player => {
        const team = getPlayerTeam(player.id);
        return (
          <View key={player.id} style={styles.playerRow}>
            <TouchableOpacity
              style={[styles.teamBtn, team === 'A' && styles.teamAActive]}
              onPress={() => togglePlayer(player.id, 'A')}
            >
              <Text style={styles.teamBtnText}>A</Text>
            </TouchableOpacity>
            <Text style={[styles.playerName, team && styles.playerSelected]}>{player.name}</Text>
            <TouchableOpacity
              style={[styles.teamBtn, team === 'B' && styles.teamBActive]}
              onPress={() => togglePlayer(player.id, 'B')}
            >
              <Text style={styles.teamBtnText}>B</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {players.length === 0 && (
        <Text style={styles.empty}>Noch keine Spieler angelegt. Geh zu "Spieler" Tab.</Text>
      )}

      {/* Score Input */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Endstand</Text>
      <View style={styles.scoreRow}>
        <View style={styles.scoreCol}>
          <Text style={styles.teamHeader}>Team A</Text>
          <TextInput
            style={styles.scoreInput}
            placeholder="0"
            placeholderTextColor="#555"
            value={teamAScore}
            onChangeText={setTeamAScore}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.vs}>:</Text>
        <View style={styles.scoreCol}>
          <Text style={styles.teamHeader}>Team B</Text>
          <TextInput
            style={styles.scoreInput}
            placeholder="0"
            placeholderTextColor="#555"
            value={teamBScore}
            onChangeText={setTeamBScore}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
        <Ionicons name="checkmark-circle" size={22} color="#fff" />
        <Text style={styles.saveBtnText}>{loading ? 'Speichern...' : 'Spiel speichern'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  hint: { color: '#888', fontSize: 13, marginBottom: 16 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8
  },
  teamBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  teamAActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  teamBActive: { backgroundColor: '#0f3460', borderColor: '#0f3460' },
  teamBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  playerName: { flex: 1, color: '#ccc', fontSize: 16, textAlign: 'center' },
  playerSelected: { color: '#fff', fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  scoreCol: { flex: 1, alignItems: 'center' },
  teamHeader: { color: '#888', fontSize: 14, marginBottom: 8 },
  scoreInput: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '80%'
  },
  vs: { color: '#555', fontSize: 24, marginHorizontal: 12 },
  saveBtn: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 40,
    gap: 8
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  empty: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 14 }
});
