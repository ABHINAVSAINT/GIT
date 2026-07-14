import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@fintrack_settings';

interface SettingsState {
  currency: string;
  taxYear: string;
  taxRegime: 'old' | 'new';
  onboardingComplete: boolean;
  dbVersion: number;
  testMode: boolean;

  setCurrency: (currency: string) => void;
  setTaxYear: (year: string) => void;
  setTaxRegime: (regime: 'old' | 'new') => void;
  completeOnboarding: () => void;
  setDbVersion: (version: number) => void;
  setTestMode: (enabled: boolean) => void;
  hydrate: (settings: Partial<SettingsState>) => void;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  currency: 'INR',
  taxYear: '2025-26',
  taxRegime: 'new',
  onboardingComplete: false,
  dbVersion: 0,
  testMode: false,

  setCurrency: (currency) => {
    set({ currency });
    get().save();
  },
  setTaxYear: (year) => {
    set({ taxYear: year });
    get().save();
  },
  setTaxRegime: (regime) => {
    set({ taxRegime: regime });
    get().save();
  },
  completeOnboarding: () => {
    set({ onboardingComplete: true });
    get().save();
  },
  setDbVersion: (version) => {
    set({ dbVersion: version });
    get().save();
  },
  setTestMode: (enabled) => {
    set({ testMode: enabled });
    get().save();
  },
  hydrate: (settings) => {
    set((s) => ({ ...s, ...settings }));
    get().save();
  },

  save: async () => {
    try {
      const state = get();
      const data = {
        currency: state.currency,
        taxYear: state.taxYear,
        taxRegime: state.taxRegime,
        onboardingComplete: state.onboardingComplete,
        dbVersion: state.dbVersion,
        testMode: state.testMode,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set((s) => ({ ...s, ...data }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },
}));
