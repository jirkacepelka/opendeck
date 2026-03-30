/**
 * OpenDeck — DeckScreen
 * Main screen with the button grid, profile tabs, and connection status.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { DeckGrid } from '../components/DeckGrid';
import { LucideIcon } from '../components/LucideIcon';
import { theme } from '../theme';

interface Props {
  onOpenSettings: () => void;
  onOpenPackBrowser: () => void;
}

export const DeckScreen: React.FC<Props> = ({ onOpenSettings, onOpenPackBrowser }) => {
  const {
    profiles,
    activeProfileId,
    setActiveProfile,
    connection,
    editMode,
    toggleEditMode,
  } = useStore();

  const { sendButtonPress, sendButtonHold } = useWebSocket();

  const handleButtonPress = useCallback(
    (buttonId: string, config?: Record<string, any>) => {
      sendButtonPress(buttonId, config);
    },
    [sendButtonPress]
  );

  const handleButtonHold = useCallback(
    (buttonId: string, config?: Record<string, any>) => {
      sendButtonHold(buttonId, config);
    },
    [sendButtonHold]
  );

  const statusColor =
    connection.status === 'connected'
      ? theme.success
      : connection.status === 'connecting'
      ? theme.warning
      : theme.error;

  const statusLabel =
    connection.status === 'connected'
      ? `${connection.host}:${connection.port}`
      : connection.status === 'connecting'
      ? 'Připojování...'
      : 'Odpojeno';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        {/* Logo */}
        <Text style={styles.logo}>OpenDeck</Text>

        {/* Connection status */}
        <TouchableOpacity style={styles.statusPill} onPress={onOpenSettings}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, editMode && styles.headerBtnActive]}
            onPress={toggleEditMode}
          >
            <LucideIcon name="edit-2" size={18} color={editMode ? theme.primary : theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={onOpenPackBrowser}>
            <LucideIcon name="plus" size={18} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={onOpenSettings}>
            <LucideIcon name="settings" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.profileBar}
        contentContainerStyle={styles.profileBarContent}
      >
        {profiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={[
              styles.profileTab,
              activeProfileId === profile.id && styles.profileTabActive,
            ]}
            onPress={() => setActiveProfile(profile.id)}
          >
            {profile.icon && (
              <LucideIcon
                name={profile.icon}
                size={14}
                color={activeProfileId === profile.id ? theme.primary : theme.textMuted}
              />
            )}
            <Text
              style={[
                styles.profileTabText,
                activeProfileId === profile.id && styles.profileTabTextActive,
              ]}
            >
              {profile.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main grid */}
      <View style={styles.gridContainer}>
        <DeckGrid
          profileId={activeProfileId}
          onButtonPress={handleButtonPress}
          onButtonHold={handleButtonHold}
        />
      </View>

      {/* Edit mode bar */}
      {editMode && (
        <View style={styles.editBar}>
          <LucideIcon name="edit-2" size={14} color={theme.primary} />
          <Text style={styles.editBarText}>Režim úprav — klepni na tlačítko pro editaci</Text>
          <TouchableOpacity onPress={toggleEditMode}>
            <Text style={styles.editBarDone}>Hotovo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  logo: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: theme.textMuted,
    fontVariant: ['tabular-nums'],
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    padding: 8,
    borderRadius: theme.radiusSm,
  },
  headerBtnActive: {
    backgroundColor: `${theme.primary}22`,
  },
  profileBar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    maxHeight: 40,
  },
  profileBarContent: {
    paddingHorizontal: 12,
    gap: 4,
    alignItems: 'center',
  },
  profileTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radiusSm,
    gap: 5,
  },
  profileTabActive: {
    backgroundColor: `${theme.primary}1a`,
  },
  profileTabText: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '500',
  },
  profileTabTextActive: {
    color: theme.primary,
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
    paddingTop: 8,
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.primary}15`,
    borderTopWidth: 1,
    borderTopColor: `${theme.primary}33`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  editBarText: {
    flex: 1,
    fontSize: 12,
    color: theme.primary,
  },
  editBarDone: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
});
