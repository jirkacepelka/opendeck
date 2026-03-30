/**
 * OpenDeck — WebSocket hook
 * Manages connection to the desktop agent.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { AgentMessage, AppMessage } from '../types';

let ws: WebSocket | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export function useWebSocket() {
  const { connection, setConnectionStatus, updateButtonState, applyStateSnapshot, setPacks, setActiveProfile } =
    useStore();

  const connect = useCallback(() => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus('connecting');

    const url = `ws://${connection.host}:${connection.port}`;
    console.log('[WS] Connecting to', url);

    ws = new WebSocket(url);

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('[WS] Connected');

      // Request packs list
      send({ type: 'get_packs' });

      // Heartbeat
      pingInterval = setInterval(() => {
        send({ type: 'ping' });
      }, 15000);
    };

    ws.onmessage = (event) => {
      let msg: AgentMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        console.warn('[WS] Invalid JSON:', event.data);
        return;
      }

      handleMessage(msg);
    };

    ws.onerror = (e) => {
      console.warn('[WS] Error', e);
      setConnectionStatus('error', 'Connection failed');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('[WS] Disconnected, retrying in 3s...');

      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      reconnectTimeout = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [connection.host, connection.port]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (pingInterval) clearInterval(pingInterval);
    ws?.close();
    ws = null;
    setConnectionStatus('disconnected');
  }, []);

  const send = useCallback((msg: AppMessage) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] Cannot send, not connected');
    }
  }, []);

  const sendButtonPress = useCallback(
    (buttonId: string, payload?: Record<string, any>) => {
      send({ type: 'button_press', buttonId, payload });
    },
    [send]
  );

  const sendButtonHold = useCallback(
    (buttonId: string, payload?: Record<string, any>) => {
      send({ type: 'button_hold', buttonId, payload });
    },
    [send]
  );

  function handleMessage(msg: AgentMessage) {
    switch (msg.type) {
      case 'state_snapshot':
        applyStateSnapshot(msg.profiles);
        setActiveProfile(msg.activeProfile);
        break;

      case 'button_state':
        updateButtonState(msg.buttonId, msg.state);
        break;

      case 'active_profile_changed':
        setActiveProfile(msg.profileId);
        break;

      case 'packs_list':
        setPacks(msg.packs);
        break;

      case 'pong':
        // heartbeat OK
        break;
    }
  }

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      ws?.close();
    };
  }, [connection.host, connection.port]);

  return { send, sendButtonPress, sendButtonHold, connect, disconnect };
}
