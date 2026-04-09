import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  isPro: boolean;
  language: string;
  dietPlan?: string;
  calorieTarget?: number;
  goal?: string;
  activityLevel?: string;
  weightKg?: number;
  heightCm?: number;
  age?: number;
  allergies?: string[];
  organicMode?: boolean;
}

interface UserStore {
  token: string | null;
  profile: UserProfile | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, language?: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  token: null,
  profile: null,
  isLoading: false,

  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const profileStr = await AsyncStorage.getItem('user_profile');
    if (token) {
      set({ token });
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (profileStr) set({ profile: JSON.parse(profileStr) });
      // Refresh profile from server
      get().refreshProfile().catch(() => {});
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    set({ token: data.token, profile: data.user, isLoading: false });
  },

  register: async (email, password, name, language = 'en') => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/register', { email, password, name, language });
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    set({ token: data.token, profile: data.user, isLoading: false });
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_profile');
    delete api.defaults.headers.common['Authorization'];
    set({ token: null, profile: null });
  },

  refreshProfile: async () => {
    const { data } = await api.get('/auth/me');
    const merged = { ...data, ...data.profile };
    await AsyncStorage.setItem('user_profile', JSON.stringify(merged));
    set({ profile: merged });
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true });
    const { data } = await api.put('/auth/profile', profileData);
    const updated = { ...get().profile, ...data.profile };
    await AsyncStorage.setItem('user_profile', JSON.stringify(updated));
    set({ profile: updated, isLoading: false });
  },
}));
