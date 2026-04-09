import { create } from 'zustand';
import { api } from '../services/api';

interface PantryItem {
  id: string;
  itemName: string;
  quantityG: number;
  unit: string;
  expiryDate: string | null;
  freshnessScore: number;
  photoUrl?: string;
  addedAt: string;
}

interface PantryStore {
  items: PantryItem[];
  expiringItems: PantryItem[];
  isLoading: boolean;

  loadPantry: () => Promise<void>;
  addItem: (item: Partial<PantryItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  scanFridge: (photoUri: string) => Promise<{ added: number; items: PantryItem[] }>;
}

export const usePantryStore = create<PantryStore>((set, get) => ({
  items: [],
  expiringItems: [],
  isLoading: false,

  loadPantry: async () => {
    set({ isLoading: true });
    try {
      const [allRes, expiringRes] = await Promise.all([
        api.get('/pantry'),
        api.get('/pantry/expiring'),
      ]);
      set({ items: allRes.data, expiringItems: expiringRes.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    const { data } = await api.post('/pantry', item);
    set({ items: [data, ...get().items] });
  },

  removeItem: async (id) => {
    await api.delete(`/pantry/${id}`);
    set({
      items: get().items.filter(i => i.id !== id),
      expiringItems: get().expiringItems.filter(i => i.id !== id),
    });
  },

  scanFridge: async (photoUri: string) => {
    const formData = new FormData();
    formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'fridge.jpg' } as any);
    const { data } = await api.post('/pantry/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    set({ items: [...data.items, ...get().items] });
    return data;
  },
}));
