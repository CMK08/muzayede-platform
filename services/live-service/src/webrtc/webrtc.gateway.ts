import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';

/**
 * WebRTC Signaling Gateway
 *
 * Handles WebRTC signaling for live auction video streaming.
 * Architecture:
 * - Auctioneer (broadcaster) connects and publishes SDP offer
 * - Viewers (consumers) request the stream and exchange ICE candidates
 * - This gateway acts as the signaling relay (SDP offers/answers, ICE candidates)
 *
 * For production scale, integrate with MediaSoup SFU or Janus.
 * This implementation supports 1 broadcaster → N viewers via mesh/relay.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/webrtc',
  transports: ['websocket', 'polling'],
})
export class WebRtcGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRtcGateway.name);
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'muzayede-secret-key',
    );
  }

  /**
   * Track broadcasters per auction: auctionId → socketId
   */
  private readonly broadcasters = new Map<string, string>();

  /**
   * Track viewers per auction: auctionId → Set<socketId>
   */
  private readonly viewers = new Map<string, Set<string>>();

  /**
   * Map socketId → { auctionId, role }
   */
  private readonly peers = new Map<
    string,
    { auctionId: string; role: 'broadcaster' | 'viewer'; userId: string }
  >();

  afterInit() {
    this.logger.log('WebRTC Signaling Gateway initialized on /webrtc');
  }

  handleConnection(client: Socket) {
    // Verify JWT token from handshake auth or query param
    const token =
      client.handshake.auth?.token ||
      (client.handshake.query?.token as string);

    if (!token) {
      this.logger.warn(`WebRTC connection rejected: no token (${client.id})`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    try {
      const payload = this.verifyJwt(token);
      (client as any).user = payload;
      this.logger.debug(
        `WebRTC peer connected: ${client.id} (user: ${payload.sub})`,
      );
    } catch {
      this.logger.warn(
        `WebRTC connection rejected: invalid token (${client.id})`,
      );
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  private verifyJwt(token: string): {
    sub: string;
    email: string;
    role: string;
  } {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSig) throw new Error('Invalid signature');

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    );

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    return { sub: payload.sub, email: payload.email, role: payload.role };
  }

  handleDisconnect(client: Socket) {
    const peerInfo = this.peers.get(client.id);
    if (!peerInfo) return;

    const { auctionId, role } = peerInfo;

    if (role === 'broadcaster') {
      this.broadcasters.delete(auctionId);
      // Notify all viewers that the stream ended
      const room = `webrtc:${auctionId}`;
      this.server.to(room).emit('broadcaster-disconnected', { auctionId });
      this.logger.log(`Broadcaster left auction ${auctionId}`);
    } else {
      const viewerSet = this.viewers.get(auctionId);
      if (viewerSet) {
        viewerSet.delete(client.id);
        if (viewerSet.size === 0) {
          this.viewers.delete(auctionId);
        }
      }
      // Notify broadcaster that a viewer left
      const broadcasterId = this.broadcasters.get(auctionId);
      if (broadcasterId) {
        this.server.to(broadcasterId).emit('viewer-left', {
          viewerId: client.id,
          viewerCount: this.viewers.get(auctionId)?.size || 0,
        });
      }
    }

    this.peers.delete(client.id);
    this.logger.debug(`WebRTC peer disconnected: ${client.id} (${role})`);
  }

  // ====================================================================
  // Broadcaster (Auctioneer) Events
  // ====================================================================

  /**
   * Auctioneer registers as broadcaster for an auction.
   * Only one broadcaster per auction allowed.
   */
  @SubscribeMessage('register-broadcaster')
  handleRegisterBroadcaster(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; userId: string },
  ) {
    const { auctionId, userId } = data;

    if (this.broadcasters.has(auctionId)) {
      client.emit('error', {
        message: 'A broadcaster is already active for this auction',
      });
      return;
    }

    const room = `webrtc:${auctionId}`;
    client.join(room);

    this.broadcasters.set(auctionId, client.id);
    this.peers.set(client.id, { auctionId, role: 'broadcaster', userId });

    this.logger.log(
      `Broadcaster registered: ${client.id} for auction ${auctionId}`,
    );

    client.emit('broadcaster-registered', {
      auctionId,
      viewerCount: this.viewers.get(auctionId)?.size || 0,
    });

    // Notify existing viewers that broadcaster is available
    this.server.to(room).emit('broadcaster-available', { auctionId });
  }

  /**
   * Broadcaster sends SDP offer to a specific viewer.
   */
  @SubscribeMessage('broadcaster-offer')
  handleBroadcasterOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      viewerId: string;
      sdp: RTCSessionDescriptionInit;
    },
  ) {
    this.server.to(data.viewerId).emit('offer', {
      broadcasterId: client.id,
      sdp: data.sdp,
    });
  }

  /**
   * Broadcaster sends ICE candidate to a specific viewer.
   */
  @SubscribeMessage('broadcaster-ice-candidate')
  handleBroadcasterIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      viewerId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    this.server.to(data.viewerId).emit('ice-candidate', {
      from: client.id,
      candidate: data.candidate,
    });
  }

  // ====================================================================
  // Viewer (Consumer) Events
  // ====================================================================

  /**
   * Viewer joins an auction stream.
   * If broadcaster is already active, initiate signaling.
   */
  @SubscribeMessage('register-viewer')
  handleRegisterViewer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string; userId: string },
  ) {
    const { auctionId, userId } = data;
    const room = `webrtc:${auctionId}`;
    client.join(room);

    if (!this.viewers.has(auctionId)) {
      this.viewers.set(auctionId, new Set());
    }
    this.viewers.get(auctionId)!.add(client.id);

    this.peers.set(client.id, { auctionId, role: 'viewer', userId });

    const broadcasterId = this.broadcasters.get(auctionId);
    const viewerCount = this.viewers.get(auctionId)!.size;

    this.logger.log(
      `Viewer registered: ${client.id} for auction ${auctionId} (total: ${viewerCount})`,
    );

    if (broadcasterId) {
      // Tell broadcaster to create an offer for this viewer
      this.server.to(broadcasterId).emit('new-viewer', {
        viewerId: client.id,
        viewerCount,
      });

      client.emit('viewer-registered', {
        auctionId,
        broadcasterActive: true,
        viewerCount,
      });
    } else {
      client.emit('viewer-registered', {
        auctionId,
        broadcasterActive: false,
        viewerCount,
      });
    }
  }

  /**
   * Viewer sends SDP answer back to broadcaster.
   */
  @SubscribeMessage('viewer-answer')
  handleViewerAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      broadcasterId: string;
      sdp: RTCSessionDescriptionInit;
    },
  ) {
    this.server.to(data.broadcasterId).emit('answer', {
      viewerId: client.id,
      sdp: data.sdp,
    });
  }

  /**
   * Viewer sends ICE candidate to broadcaster.
   */
  @SubscribeMessage('viewer-ice-candidate')
  handleViewerIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      broadcasterId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    this.server.to(data.broadcasterId).emit('ice-candidate', {
      from: client.id,
      candidate: data.candidate,
    });
  }

  // ====================================================================
  // Utility
  // ====================================================================

  /**
   * Get stream info for an auction.
   */
  @SubscribeMessage('get-stream-info')
  handleGetStreamInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const { auctionId } = data;
    const broadcasterId = this.broadcasters.get(auctionId);
    const viewerCount = this.viewers.get(auctionId)?.size || 0;

    client.emit('stream-info', {
      auctionId,
      broadcasterActive: !!broadcasterId,
      viewerCount,
    });
  }

  /**
   * Check if broadcaster is active for an auction.
   */
  isBroadcasterActive(auctionId: string): boolean {
    return this.broadcasters.has(auctionId);
  }

  /**
   * Get viewer count for an auction.
   */
  getViewerCount(auctionId: string): number {
    return this.viewers.get(auctionId)?.size || 0;
  }
}
