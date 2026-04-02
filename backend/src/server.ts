import 'dotenv/config';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDB } from './config/db';
import { wsClients } from './utils/wsClients';
import jwt from 'jsonwebtoken';
import app from './app';

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    ws.close();
    return;
  }

  const tokenCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('token='));

  if (!tokenCookie) {
    ws.close();
    return;
  }

  const token = tokenCookie.substring('token='.length);

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    userId = decoded.userId;
  } catch {
    ws.close();
    return;
  }

  if (!wsClients.has(userId)) {
    wsClients.set(userId, new Set());
  }
  wsClients.get(userId)!.add(ws);

  ws.on('close', () => {
    const connections = wsClients.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        wsClients.delete(userId);
      }
    }
  });
});

async function start() {
  try {
    await initDB();
  } catch (err) {
    console.warn('DB unavailable — running with in-memory fallback:', (err as Error).message);
  }
  
  const port = 5000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server on port ${port}`);
  });
}

start();
