import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';

export default function PlayersScreen() {
  const { players, fetchPlayers, addPlayer } = useGameStore();
  const [newName, setNewName] = useState('');

  useEffect(() => { fetchPlayers(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addPlayer(newName.trim());
      setNewName('');
    } catch (err) {
      Alert.alert('Fehler', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Add Player */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Neuer Spieler..."
          placeholderTextColor="#666"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Player List */}
      <FlatList
        data={players}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.playerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Füge Spieler hinzu, um loszulegen!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 16 },
  addRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16
  },
  addBtn: {
    backgroundColor: '#e94560',
    width: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  playerName: { color: '#fff', fontSize: 16 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 15 }
});
