import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface BidUpdate {
  bidId: string;
  amount: number;
  bidderId: string;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/bids',
  transports: ['websocket', 'polling'],
})
export class BidGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BidGateway.name);
  private readonly connectedClients = new Map<string, { userId?: string; rooms: Set<string> }>();

  afterInit(_server: Server) {
    this.logger.log('Bid WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, { rooms: new Set() });
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; userId?: string },
  ) {
    const room = `auction:${data.auctionId}`;
    client.join(room);

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.userId = data.userId;
      clientInfo.rooms.add(room);
    }

    this.logger.log(`Client ${client.id} joined auction room: ${data.auctionId}`);

    client.emit('joinedAuction', {
      auctionId: data.auctionId,
      message: 'Successfully joined auction room',
    });
  }

  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const room = `auction:${data.auctionId}`;
    client.leave(room);

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.rooms.delete(room);
    }

    this.logger.log(`Client ${client.id} left auction room: ${data.auctionId}`);
  }

  /**
   * Broadcast a new bid to all clients watching an auction.
   * Called by BidService when a bid is successfully placed.
   */
  broadcastBid(auctionId: string, bid: BidUpdate) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('newBid', {
      auctionId,
      ...bid,
    });
    this.logger.debug(`Broadcast bid to room ${room}: ${bid.amount}`);
  }

  /**
   * Broadcast auction state change (extended, ended, etc.)
   */
  broadcastAuctionUpdate(auctionId: string, update: Record<string, any>) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('auctionUpdate', {
      auctionId,
      ...update,
    });
  }

  /**
   * Send a notification to a specific user across all their connected clients.
   */
  notifyUser(userId: string, event: string, data: any) {
    for (const [clientId, info] of this.connectedClients.entries()) {
      if (info.userId === userId) {
        this.server.to(clientId).emit(event, data);
      }
    }
  }

  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  getAuctionViewerCount(auctionId: string): number {
    const room = `auction:${auctionId}`;
    return this.server?.sockets?.adapter?.rooms?.get(room)?.size || 0;
  }
}
