/**
 * OpenDeck — PackBrowserScreen
 * Browse available packs and add buttons to the current profile.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useStore } from '../store/useStore';
import { LucideIcon } from '../components/LucideIcon';
import { theme } from '../theme';
import type { ButtonDef, ButtonLayout, ButtonSize } from '../types';

interface Props {
  onClose: () => void;
}

export const PackBrowserScreen: React.FC<Props> = ({ onClose }) => {
  const { packs, activeProfileId, addButton, profiles } = useStore();
  const [search, setSearch] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const profile = profiles.find((p) => p.id === activeProfileId);

  const filtered = packs.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddButton = (packId: string, btn: ButtonDef) => {
    if (!profile) return;

    const fullId = `${packId}.${btn.id}`;
    if (addedIds.has(fullId)) return;

    // Find a free position
    const existingPositions = new Set(
      profile.buttons.map((b) => `${b.gridX},${b.gridY}`)
    );
    let x = 0, y = 0;
    outer: for (y = 0; y < profile.gridRows; y++) {
      for (x = 0; x < profile.gridCols; x++) {
        if (!existingPositions.has(`${x},${y}`)) break outer;
      }
    }

    const layout: ButtonLayout = {
      id: `${fullId}-${Date.now()}`,
      buttonId: fullId,
      size: btn.defaultSize ?? '1x1',
      gridX: x,
      gridY: y,
    };

    addButton(activeProfileId, layout);
    setAddedIds((prev) => new Set([...prev, fullId]));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <LucideIcon name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Button Packs</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <LucideIcon name="search" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat pack nebo akci..."
          placeholderTextColor={theme.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <LucideIcon name="alert-circle" size={32} color={theme.textFaint} />
            <Text style={styles.emptyText}>Žádné packs k dispozici</Text>
            <Text style={styles.emptySubtext}>Připoj se k agentovi pro načtení packů</Text>
          </View>
        )}

        {filtered.map((pack) => (
          <View key={pack.id} style={styles.packCard}>
            {/* Pack header */}
            <View style={styles.packHeader}>
              <View style={styles.packIconBg}>
                <LucideIcon name="zap" size={18} color={theme.primary} />
              </View>
              <View style={styles.packInfo}>
                <Text style={styles.packName}>{pack.name}</Text>
                <Text style={styles.packDesc}>{pack.description}</Text>
              </View>
              {pack.builtin && (
                <View style={styles.builtinBadge}>
                  <Text style={styles.builtinText}>built-in</Text>
                </View>
              )}
            </View>

            {/* Buttons in pack */}
            <View style={styles.buttonList}>
              {pack.buttons.map((btn) => {
                const fullId = `${pack.id}.${btn.id}`;
                const added = addedIds.has(fullId);
                return (
                  <View key={btn.id} style={styles.buttonRow}>
                    <View style={styles.buttonInfo}>
                      {btn.icon && (
                        <LucideIcon name={btn.icon} size={16} color={theme.textMuted} />
                      )}
                      <View>
                        <Text style={styles.buttonLabel}>{btn.label}</Text>
                        <Text style={styles.buttonSize}>{btn.defaultSize ?? '1×1'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.addBtn, added && styles.addBtnDone]}
                      onPress={() => handleAddButton(pack.id, btn)}
                      disabled={added}
                    >
                      <LucideIcon
                        name={added ? 'check' : 'plus'}
                        size={14}
                        color={added ? theme.success : '#fff'}
                      />
                      <Text style={[styles.addBtnText, added && { color: theme.success }]}>
                        {added ? 'Přidáno' : 'Přidat'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
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
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: theme.radiusSm,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMuted,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.textFaint,
  },
  packCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  packIconBg: {
    width: 38,
    height: 38,
    borderRadius: theme.radiusMd,
    backgroundColor: `${theme.primary}1a`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  packDesc: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 1,
  },
  builtinBadge: {
    backgroundColor: `${theme.primary}22`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  builtinText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.primary,
  },
  buttonList: {
    padding: 8,
    gap: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: theme.radiusMd,
  },
  buttonInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonLabel: {
    fontSize: 14,
    color: theme.text,
  },
  buttonSize: {
    fontSize: 11,
    color: theme.textFaint,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  addBtnDone: {
    backgroundColor: `${theme.success}22`,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
