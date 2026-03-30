/**
 * OpenDeck — SettingsScreen
 * Configure agent connection, profiles, etc.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { LucideIcon } from '../components/LucideIcon';
import { theme } from '../theme';

interface Props {
  onClose: () => void;
}

export const SettingsScreen: React.FC<Props> = ({ onClose }) => {
  const { connection, updateConnection } = useStore();
  const { connect, disconnect } = useWebSocket();

  const [host, setHost] = useState(connection.host);
  const [port, setPort] = useState(String(connection.port));

  const handleSave = () => {
    updateConnection({ host, port: parseInt(port, 10) || 9001 });
    disconnect();
    setTimeout(connect, 300);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <LucideIcon name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nastavení</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection */}
        <Text style={styles.sectionLabel}>Připojení k agentovi</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>IP adresa / hostname</Text>
            <TextInput
              style={styles.input}
              value={host}
              onChangeText={setHost}
              placeholder="192.168.1.100"
              placeholderTextColor={theme.textFaint}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              placeholder="9001"
              placeholderTextColor={theme.textFaint}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Uložit a znovu připojit</Text>
        </TouchableOpacity>

        {/* Connection status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Stav:</Text>
          <Text style={[
            styles.statusValue,
            {
              color: connection.status === 'connected' ? theme.success
                : connection.status === 'connecting' ? theme.warning
                : theme.error
            }
          ]}>
            {connection.status === 'connected' ? 'Připojeno'
              : connection.status === 'connecting' ? 'Připojování...'
              : connection.status === 'error' ? `Chyba: ${connection.lastError ?? ''}`
              : 'Odpojeno'}
          </Text>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>O aplikaci</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Verze</Text>
            <Text style={styles.fieldValue}>0.1.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Licence</Text>
            <Text style={styles.fieldValue}>GPL-3.0</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.field}>
            <Text style={styles.fieldLabel}>GitHub</Text>
            <LucideIcon name="external-link" size={14} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
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
  content: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
  },
  fieldValue: {
    fontSize: 14,
    color: theme.textMuted,
  },
  input: {
    fontSize: 14,
    color: theme.text,
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.divider,
    marginLeft: 16,
  },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: theme.radiusLg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  statusCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: theme.textMuted,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
