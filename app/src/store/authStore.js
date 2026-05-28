import { create } from 'zustand';
import client from '../api/client';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await client.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login fehlgeschlagen', loading: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await client.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Registrierung fehlgeschlagen', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}));

export default useAuthStore;
