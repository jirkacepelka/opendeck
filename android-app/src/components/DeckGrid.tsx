/**
 * OpenDeck — DeckGrid
 *
 * The main grid canvas. Renders all buttons at their configured positions.
 * Handles drag-and-drop in edit mode.
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useStore } from '../store/useStore';
import { GridButton } from './GridButton';
import { theme } from '../theme';
import type { ButtonLayout } from '../types';

interface DeckGridProps {
  profileId: string;
  onButtonPress: (buttonId: string, config?: Record<string, any>) => void;
  onButtonHold: (buttonId: string, config?: Record<string, any>) => void;
  onEditButton?: (layout: ButtonLayout) => void;
}

const GAP = 6;
const PADDING = 12;

export const DeckGrid: React.FC<DeckGridProps> = ({
  profileId,
  onButtonPress,
  onButtonHold,
  onEditButton,
}) => {
  const { width } = useWindowDimensions();
  const { profiles, buttonStates, editMode } = useStore();

  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return null;

  const { gridCols, gridRows, buttons } = profile;

  // Cell size: available width divided by columns
  const availableWidth = width - PADDING * 2;
  const cellSize = Math.floor((availableWidth - GAP * (gridCols - 1)) / gridCols);
  const gridHeight = gridRows * cellSize + (gridRows - 1) * GAP;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: PADDING }]}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.grid, { width: availableWidth, height: gridHeight }]}>
        {/* Grid cells (background) */}
        {editMode && renderGridCells(gridCols, gridRows, cellSize)}

        {/* Buttons */}
        {buttons.map((layout) => {
          const state = buttonStates[layout.buttonId];
          return (
            <GridButton
              key={layout.id}
              layout={layout}
              state={state}
              cellSize={cellSize}
              gap={GAP}
              editMode={editMode}
              onPress={() => onButtonPress(layout.buttonId, layout.config)}
              onHold={() => onButtonHold(layout.buttonId, layout.config)}
              onLongPressEdit={() => onEditButton?.(layout)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
};

function renderGridCells(cols: number, rows: number, cellSize: number) {
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push(
        <View
          key={`cell-${col}-${row}`}
          style={[
            styles.gridCell,
            {
              width: cellSize,
              height: cellSize,
              left: col * (cellSize + GAP),
              top: row * (cellSize + GAP),
            },
          ]}
        />
      );
    }
  }
  return cells;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  grid: {
    position: 'relative',
  },
  gridCell: {
    position: 'absolute',
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    backgroundColor: `${theme.surface}44`,
  },
});
