import { useEffect, useRef } from 'react';

/**
 * Simple websocket hook for real-time backend events.
 *
 * @param {(event: any) => void} onMessage - Callback invoked with parsed event objects.
 * @param {{ url?: string, enabled?: boolean }} options
 */
const useSocket = (onMessage, options = {}) => {
  const { url = 'ws://localhost:8000/ws', enabled = true } = options;
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled || socketRef.current) return;

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (err) {
        console.error('Failed to parse websocket message', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };

    ws.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [url, enabled, onMessage]);
};

export default useSocket;

