import { create } from 'zustand';
import { getPlayers, createPlayer as apiCreatePlayer, getGames, createGame as apiCreateGame, getOverview, getRankings, getFunStats } from '../api/client';

export const useGameStore = create((set, get) => ({
  players: [],
  games: [],
  overview: null,
  rankings: [],
  funStats: null,
  loading: false,

  fetchPlayers: async () => {
    try {
      const { data } = await getPlayers();
      set({ players: data });
    } catch (err) {
      console.error('fetchPlayers error:', err);
    }
  },

  addPlayer: async (name) => {
    try {
      const { data } = await apiCreatePlayer(name);
      set(state => ({ players: [...state.players, data] }));
      return data;
    } catch (err) {
      throw err.response?.data?.error || 'Fehler';
    }
  },

  fetchGames: async () => {
    try {
      const { data } = await getGames();
      set({ games: data });
    } catch (err) {
      console.error('fetchGames error:', err);
    }
  },

  addGame: async (gameData) => {
    set({ loading: true });
    try {
      const { data } = await apiCreateGame(gameData);
      set(state => ({ games: [data, ...state.games], loading: false }));
      // Refresh stats
      get().fetchOverview();
      get().fetchRankings();
      return data;
    } catch (err) {
      set({ loading: false });
      throw err.response?.data?.error || 'Fehler';
    }
  },

  fetchOverview: async () => {
    try {
      const { data } = await getOverview();
      set({ overview: data });
    } catch (err) {
      console.error('fetchOverview error:', err);
    }
  },

  fetchRankings: async () => {
    try {
      const { data } = await getRankings();
      set({ rankings: data });
    } catch (err) {
      console.error('fetchRankings error:', err);
    }
  },

  fetchFunStats: async () => {
    try {
      const { data } = await getFunStats();
      set({ funStats: data });
    } catch (err) {
      console.error('fetchFunStats error:', err);
    }
  }
}));
