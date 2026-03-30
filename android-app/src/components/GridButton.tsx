/**
 * OpenDeck — GridButton
 *
 * A single button on the deck grid. Supports:
 * - Variable sizes (1x1, 2x1, 5x1, etc.)
 * - Live state (label, icon, color, badge, progress, active)
 * - Press + long-press (hold) interactions
 * - Edit mode overlay
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';
import type { ButtonLayout, ButtonState } from '../types';
import { SIZE_DIMENSIONS } from '../types';
import { LucideIcon } from './LucideIcon';

interface GridButtonProps {
  layout: ButtonLayout;
  state?: ButtonState;
  cellSize: number;   // pixel size of one grid cell
  gap: number;
  editMode: boolean;
  onPress: () => void;
  onHold: () => void;
  onLongPressEdit?: () => void;
}

export const GridButton: React.FC<GridButtonProps> = ({
  layout,
  state,
  cellSize,
  gap,
  editMode,
  onPress,
  onHold,
  onLongPressEdit,
}) => {
  const { cols, rows } = SIZE_DIMENSIONS[layout.size ?? '1x1'];

  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  const scale = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHolding = useRef(false);

  // Resolved values: state overrides layout overrides defaults
  const label = state?.label ?? layout.label ?? layout.buttonId.split('.').pop() ?? '';
  const sublabel = state?.sublabel;
  const icon = state?.icon ?? layout.icon;
  const bgColor = state?.color ?? layout.color ?? theme.buttonBg;
  const textColor = state?.textColor ?? theme.text;
  const isActive = state?.active ?? false;
  const isDisabled = state?.disabled ?? false;
  const progress = state?.progress;
  const badge = state?.badge;

  const animatePress = (pressed: boolean) => {
    Animated.spring(scale, {
      toValue: pressed ? 0.93 : 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressIn = useCallback(() => {
    if (editMode) return;
    animatePress(true);

    // Long press → hold action
    holdTimer.current = setTimeout(() => {
      isHolding.current = true;
      onHold();
    }, 500);
  }, [editMode, onHold]);

  const handlePressOut = useCallback(() => {
    if (editMode) return;
    animatePress(false);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, [editMode]);

  const handlePress = useCallback(() => {
    if (editMode) {
      onLongPressEdit?.();
      return;
    }
    if (!isHolding.current) {
      onPress();
    }
    isHolding.current = false;
  }, [editMode, onPress, onLongPressEdit]);

  const containerStyle: ViewStyle = {
    width,
    height,
    position: 'absolute',
    left: layout.gridX * (cellSize + gap),
    top: layout.gridY * (cellSize + gap),
  };

  const buttonBg = isActive
    ? `${bgColor}cc`
    : bgColor;

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          styles.button,
          {
            backgroundColor: buttonBg,
            borderColor: isActive ? theme.primary : theme.buttonBorder,
            borderWidth: isActive ? 1.5 : 1,
            width,
            height,
          },
        ]}
      >
        {/* Progress bar (bottom) */}
        {progress !== undefined && progress > 0 && (
          <View style={[styles.progressBg, { width }]}>
            <View
              style={[
                styles.progressFill,
                { width: (progress / 100) * width, backgroundColor: theme.primary },
              ]}
            />
          </View>
        )}

        {/* Icon */}
        {icon && (
          <View style={styles.iconWrapper}>
            <LucideIcon
              name={icon}
              size={rows > 1 ? 28 : cols > 2 ? 22 : 20}
              color={isActive ? theme.primary : textColor}
            />
          </View>
        )}

        {/* Label */}
        {label ? (
          <Text
            style={[
              styles.label,
              {
                color: isActive ? theme.primary : textColor,
                fontSize: cols >= 4 ? theme.fontSizeLg : theme.fontSizeSm,
                fontWeight: isActive ? '700' : '600',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {label}
          </Text>
        ) : null}

        {/* Sublabel */}
        {sublabel ? (
          <Text style={styles.sublabel} numberOfLines={1} ellipsizeMode="tail">
            {sublabel}
          </Text>
        ) : null}

        {/* Badge */}
        {badge !== undefined && badge !== null && badge !== '' ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        {/* Edit mode overlay */}
        {editMode && (
          <View style={styles.editOverlay}>
            <Text style={styles.editIcon}>✎</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: theme.space2,
  },
  iconWrapper: {
    marginBottom: 2,
  },
  label: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sublabel: {
    fontSize: theme.fontSizeXs,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  progressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: `${theme.primary}33`,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(79, 158, 255, 0.12)',
    borderRadius: theme.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 18,
    color: theme.primary,
    opacity: 0.7,
  },
});
