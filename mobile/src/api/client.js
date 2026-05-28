import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your Render URL after deployment
const API_URL = __DEV__ 
  ? 'http://10.0.2.2:3000/api'  // Android emulator
  : 'https://your-app.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (email, password, name) => api.post('/auth/register', { email, password, name });

// Players
export const getPlayers = () => api.get('/players');
export const createPlayer = (name) => api.post('/players', { name });
export const deletePlayer = (id) => api.delete(`/players/${id}`);

// Games
export const getGames = (params) => api.get('/games', { params });
export const getGame = (id) => api.get(`/games/${id}`);
export const createGame = (data) => api.post('/games', data);
export const deleteGame = (id) => api.delete(`/games/${id}`);

// Stats
export const getOverview = () => api.get('/stats/overview');
export const getRankings = () => api.get('/stats/rankings');
export const getPlayerStats = (playerId) => api.get(`/stats/player/${playerId}`);
export const getFunStats = () => api.get('/stats/fun');

// Groups
export const getGroups = () => api.get('/groups');
export const createGroup = (name) => api.post('/groups', { name });

export default api;
