import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, register as apiRegister } from '../api/client';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  initialize: async () => {
    const token = await SecureStore.getItemAsync('token');
    const userJson = await SecureStore.getItemAsync('user');
    if (token && userJson) {
      set({ token, user: JSON.parse(userJson) });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiLogin(email, password);
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login fehlgeschlagen', loading: false });
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiRegister(email, password, name);
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Registrierung fehlgeschlagen', loading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    set({ token: null, user: null });
  }
}));
