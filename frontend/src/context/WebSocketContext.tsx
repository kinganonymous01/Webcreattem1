import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';

interface WebSocketContextType {
  ws:               WebSocket | null;
  initWS:           () => void;
  closeWS:          () => void;
  reconnect:        () => void;
  registerHandler:  (id: string, handler: (msg: any) => void) => void;
  unregisterHandler:(id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [ws, setWs]     = useState<WebSocket | null>(null);
  const handlers        = useRef(new Map<string, (msg: any) => void>());

  const initWS = useCallback(() => {
    const defaultWsUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/ws`
      : `ws://${window.location.host}/ws`;
    const wsUrl = (import.meta.env.VITE_WS_URL || defaultWsUrl) + '';

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handlers.current.forEach(handler => handler(msg));
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => { setWs(null); };
    socket.onerror = () => { /* Error logged; onclose fires after */ };

    setWs(socket);
  }, []);

  const closeWS = useCallback(() => {
    if (ws) ws.close();
    setWs(null);
  }, [ws]);

  const reconnect = useCallback(() => {
    if (ws) ws.close();
    initWS();
  }, [ws, initWS]);

  const registerHandler = useCallback((id: string, handler: (msg: any) => void) => {
    handlers.current.set(id, handler);
  }, []);

  const unregisterHandler = useCallback((id: string) => {
    handlers.current.delete(id);
  }, []);

  return (
    <WebSocketContext.Provider value={{ ws, initWS, closeWS, reconnect, registerHandler, unregisterHandler }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextType {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be inside WebSocketProvider');
  return ctx;
}
