import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import type { LeaderboardUpdate } from '../models';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://api.fishleague.app';

type UpdateCallback = (update: LeaderboardUpdate) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private callbacks: UpdateCallback[] = [];

  connect(tournamentId: string) {
    this.disconnect();

    this.socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 3000,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('subscribe', { tournamentId });
    });

    this.socket.on('leaderboard:update', (data: LeaderboardUpdate) => {
      this.callbacks.forEach(cb => cb(data));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  onUpdate(cb: UpdateCallback) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter(c => c !== cb);
    };
  }
}

export const wsService = new WebSocketService();
