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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/leaderboard',
})
export class LeaderboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(LeaderboardGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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
