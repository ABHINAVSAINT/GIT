import { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import { AppProviders } from './src/app/providers';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { getDatabase } from './src/storage/database';
import { seedData } from './src/storage/seedData';
import { useSettingsStore } from './src/store/settingsStore';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      await loadSettings();
      await getDatabase();

      const state = useSettingsStore.getState();

      if (state.testMode) {
        await seedData();
      }

      setReady(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to initialize database');
    }
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <Text style={{ color: '#EF4444', fontSize: 16, textAlign: 'center', padding: 20 }}>
          Error: {error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={{ color: '#94A3B8', marginTop: 16, fontSize: 14 }}>Loading FinTrack...</Text>
      </View>
    );
  }

  return (
    <AppProviders>
      <AppNavigator />
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
    </AppProviders>
  );
}
