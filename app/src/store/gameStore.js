import { create } from 'zustand';
import client from '../api/client';

const useGameStore = create((set, get) => ({
  players: [],
  games: [],
  stats: null,
  rankings: [],
  funStats: null,
  loading: false,
  error: null,

  // Players
  fetchPlayers: async () => {
    set({ loading: true });
    try {
      const { data } = await client.get('/players');
      set({ players: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addPlayer: async (name) => {
    try {
      const { data } = await client.post('/players', { name });
      set((state) => ({ players: [...state.players, data] }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Fehler beim Erstellen' });
      return false;
    }
  },

  deletePlayer: async (id) => {
    try {
      await client.delete(`/players/${id}`);
      set((state) => ({ players: state.players.filter((p) => p.id !== id) }));
    } catch (err) {
      set({ error: err.response?.data?.error || 'Fehler beim Löschen' });
    }
  },

  // Games
  fetchGames: async () => {
    set({ loading: true });
    try {
      const { data } = await client.get('/games');
      set({ games: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createGame: async (gameData) => {
    set({ loading: true });
    try {
      const { data } = await client.post('/games', gameData);
      set((state) => ({ games: [data, ...state.games], loading: false }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Fehler beim Speichern', loading: false });
      return false;
    }
  },

  deleteGame: async (id) => {
    try {
      await client.delete(`/games/${id}`);
      set((state) => ({ games: state.games.filter((g) => g.id !== id) }));
    } catch (err) {
      set({ error: err.response?.data?.error || 'Fehler beim Löschen' });
    }
  },

  // Stats
  fetchStats: async () => {
    set({ loading: true });
    try {
      const [overview, rankings, fun] = await Promise.all([
        client.get('/stats/overview'),
        client.get('/stats/rankings'),
        client.get('/stats/fun'),
      ]);
      set({ stats: overview.data, rankings: rankings.data, funStats: fun.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
}));

export default useGameStore;
