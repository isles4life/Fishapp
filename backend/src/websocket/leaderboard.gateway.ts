import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' },
  namespace: '/leaderboard',
})
export class LeaderboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(LeaderboardGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token as string | undefined ||
      (client.handshake.headers.authorization as string | undefined)?.replace('Bearer ', '');

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        client.data.userId = payload.sub;
        this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
      } catch {
        this.logger.warn(`Client ${client.id} sent invalid token — disconnecting`);
        client.disconnect();
        return;
      }
    } else {
      // No token — allow read-only public leaderboard access
      this.logger.log(`Client connected: ${client.id} (unauthenticated)`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Client subscribes to a specific tournament's leaderboard */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`tournament:${data.tournamentId}`);
    this.logger.log(`Client ${client.id} subscribed to tournament ${data.tournamentId}`);
    return { ok: true };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`tournament:${data.tournamentId}`);
    return { ok: true };
  }

  /** Called by LeaderboardService after every approval */
  broadcastLeaderboardUpdate(tournamentId: string, entries: any[]) {
    this.server.to(`tournament:${tournamentId}`).emit('leaderboard:update', {
      tournamentId,
      entries,
      updatedAt: new Date().toISOString(),
    });
  }
}
