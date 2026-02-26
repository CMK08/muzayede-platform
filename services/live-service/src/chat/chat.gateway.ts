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
import { ChatService } from '../chat-service/chat.service';
import { StreamingService } from '../streaming/streaming.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/live',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<
    string,
    { userId: string; username: string; auctionId?: string }
  >();

  /** Track viewer count per auction for broadcasting */
  private readonly auctionViewers = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly streamingService: StreamingService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Live WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo?.auctionId) {
      const auctionRoom = `auction:${userInfo.auctionId}`;

      // Remove from viewer tracking
      const viewers = this.auctionViewers.get(userInfo.auctionId);
      if (viewers) {
        viewers.delete(client.id);
        this.broadcastViewerCount(userInfo.auctionId, viewers.size);
      }

      this.server.to(auctionRoom).emit('userLeft', {
        userId: userInfo.userId,
        username: userInfo.username,
      });
    }
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join an auction room (covers chat + live events).
   */
  @SubscribeMessage('joinAuction')
  async handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { auctionId: string; userId: string; username: string },
  ) {
    const auctionRoom = `auction:${data.auctionId}`;
    const chatRoom = `chat:${data.auctionId}`;

    client.join(auctionRoom);
    client.join(chatRoom);

    this.connectedUsers.set(client.id, {
      userId: data.userId,
      username: data.username,
      auctionId: data.auctionId,
    });

    // Track viewers
    if (!this.auctionViewers.has(data.auctionId)) {
      this.auctionViewers.set(data.auctionId, new Set());
    }
    this.auctionViewers.get(data.auctionId)!.add(client.id);
    const viewerCount = this.auctionViewers.get(data.auctionId)!.size;

    // Update viewer count in DB
    try {
      const session = await this.streamingService.getSession(data.auctionId);
      if (session?.id) {
        await this.streamingService.updateViewerCount(session.id, viewerCount);
      }
    } catch {
      // Session may not exist yet
    }

    // Notify room
    this.server.to(auctionRoom).emit('userJoined', {
      userId: data.userId,
      username: data.username,
      viewerCount,
    });

    // Send recent messages to the joiner
    const recentMessages = this.chatService.getRecentMessages(data.auctionId, 50);

    client.emit('auctionJoined', {
      auctionId: data.auctionId,
      viewerCount,
      recentMessages,
    });

    this.logger.log(
      `User ${data.username} joined auction ${data.auctionId} (viewers: ${viewerCount})`,
    );
  }

  /**
   * Leave an auction room.
   */
  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const auctionRoom = `auction:${data.auctionId}`;
    const chatRoom = `chat:${data.auctionId}`;

    client.leave(auctionRoom);
    client.leave(chatRoom);

    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo) {
      const viewers = this.auctionViewers.get(data.auctionId);
      if (viewers) {
        viewers.delete(client.id);
        this.broadcastViewerCount(data.auctionId, viewers.size);
      }

      this.server.to(auctionRoom).emit('userLeft', {
        userId: userInfo.userId,
        username: userInfo.username,
      });
      userInfo.auctionId = undefined;
    }
  }

  /**
   * Send a chat message.
   */
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; message: string },
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const chatMessage = await this.chatService.sendMessage(
        data.auctionId,
        userInfo.userId,
        data.message,
      );

      const chatRoom = `chat:${data.auctionId}`;
      this.server.to(chatRoom).emit('chat-message', chatMessage);
    } catch (error) {
      client.emit('messageRejected', { reason: error.message });
    }
  }

  /**
   * Mute a user (admin only).
   */
  @SubscribeMessage('muteUser')
  async handleMuteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      auctionId: string;
      userId: string;
      durationMinutes: number;
    },
  ) {
    const adminInfo = this.connectedUsers.get(client.id);
    if (!adminInfo) return;

    const result = await this.chatService.muteUser(
      data.auctionId,
      data.userId,
      adminInfo.userId,
      data.durationMinutes,
    );

    const auctionRoom = `auction:${data.auctionId}`;
    this.server.to(auctionRoom).emit('user-muted', result);
  }

  // ============================================================
  // Broadcast methods for other services to call
  // ============================================================

  /**
   * Broadcast a new bid event to all connected clients in an auction.
   */
  broadcastNewBid(
    auctionId: string,
    bidData: {
      bidId: string;
      userId: string;
      amount: number;
      type: string;
    },
  ) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('new-bid', {
      ...bidData,
      auctionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast lot opened event.
   */
  broadcastLotOpened(auctionId: string, lotData: any) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('lot-opened', {
      ...lotData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast lot sold event.
   */
  broadcastLotSold(auctionId: string, soldData: any) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('lot-sold', {
      ...soldData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast going once / going twice warnings.
   */
  broadcastAuctioneerCall(
    auctionId: string,
    call: 'going-once' | 'going-twice',
    countdown: number,
  ) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit(call, {
      auctionId,
      countdown,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast stream started event.
   */
  broadcastStreamStarted(auctionId: string, sessionData: any) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('stream-started', {
      ...sessionData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast stream ended event.
   */
  broadcastStreamEnded(auctionId: string, sessionData: any) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('stream-ended', {
      ...sessionData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a system/notification message to chat.
   */
  broadcastSystemMessage(
    auctionId: string,
    message: string,
    type: 'system' | 'bid_notification' | 'auctioneer_call' = 'system',
  ) {
    const chatRoom = `chat:${auctionId}`;
    this.server.to(chatRoom).emit('chat-message', {
      id: `sys_${Date.now()}`,
      auctionId,
      userId: 'system',
      username: 'Sistem',
      message,
      type,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast viewer count update.
   */
  private broadcastViewerCount(auctionId: string, count: number) {
    const room = `auction:${auctionId}`;
    this.server.to(room).emit('viewer-count', {
      auctionId,
      count,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get online count for an auction.
   */
  getOnlineCount(auctionId: string): number {
    return this.auctionViewers.get(auctionId)?.size || 0;
  }
}
