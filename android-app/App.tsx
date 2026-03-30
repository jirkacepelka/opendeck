/**
 * OpenDeck App — Root component
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DeckScreen } from './src/screens/DeckScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PackBrowserScreen } from './src/screens/PackBrowserScreen';
import { useWebSocket } from './src/hooks/useWebSocket';
import { theme } from './src/theme';

type Screen = 'deck' | 'settings' | 'pack-browser';

function AppContent() {
  const [screen, setScreen] = useState<Screen>('deck');

  // Initialize WebSocket connection
  useWebSocket();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {screen === 'deck' && (
        <DeckScreen
          onOpenSettings={() => setScreen('settings')}
          onOpenPackBrowser={() => setScreen('pack-browser')}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen onClose={() => setScreen('deck')} />
      )}
      {screen === 'pack-browser' && (
        <PackBrowserScreen onClose={() => setScreen('deck')} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
});
