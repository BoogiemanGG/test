import { create } from 'zustand';
import { api } from '../services/api';

interface DiaryEntry {
  id: string;
  mealType: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  quantityG: number;
  loggedAt: string;
  food?: { name: string; imageUrl?: string };
  recipe?: { title: string; imageUrl?: string };
  mood?: string;
  notes?: string;
}

interface Totals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
}

interface DiaryStore {
  todayEntries: DiaryEntry[];
  todayTotals: Partial<Totals>;
  isLoading: boolean;

  loadToday: () => Promise<void>;
  addEntry: (entry: Partial<DiaryEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  todayEntries: [],
  todayTotals: {},
  isLoading: false,

  loadToday: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/diary/today');
      set({ todayEntries: data.entries, todayTotals: data.totals, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const { data } = await api.post('/diary/log', entry);
    const current = get().todayEntries;
    const newTotals = calcTotals([...current, data]);
    set({ todayEntries: [...current, data], todayTotals: newTotals });
  },

  deleteEntry: async (id) => {
    await api.delete(`/diary/${id}`);
    const filtered = get().todayEntries.filter(e => e.id !== id);
    set({ todayEntries: filtered, todayTotals: calcTotals(filtered) });
  },
}));

function calcTotals(entries: DiaryEntry[]): Totals {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      proteinG: acc.proteinG + (e.proteinG || 0),
      carbsG: acc.carbsG + (e.carbsG || 0),
      fatG: acc.fatG + (e.fatG || 0),
      fiberG: acc.fiberG + (e.fiberG || 0),
      sodiumMg: acc.sodiumMg + (e.sodiumMg || 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 }
  );
}
