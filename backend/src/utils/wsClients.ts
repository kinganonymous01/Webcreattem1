import { WebSocket } from 'ws';

export const wsClients = new Map<string, Set<WebSocket>>();

export function sendToClient(userId: string, message: object): void {
  const connections = wsClients.get(userId);
  if (!connections) return;

  const data = JSON.stringify(message);
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}
