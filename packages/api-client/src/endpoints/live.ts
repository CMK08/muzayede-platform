// ---------------------------------------------------------------------------
// Live Auction API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export type LiveSessionStatus =
  | 'scheduled'
  | 'lobby'
  | 'live'
  | 'paused'
  | 'ended';

export interface LiveSession {
  id: string;
  auctionId: string;
  status: LiveSessionStatus;
  streamUrl?: string;
  hlsUrl?: string;
  chatEnabled: boolean;
  viewerCount: number;
  startedAt?: string;
  endedAt?: string;
  scheduledAt: string;
  auctioneerId: string;
  currentLotId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveSessionListParams {
  page?: number;
  perPage?: number;
  status?: LiveSessionStatus;
  auctionId?: string;
  auctioneerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateLiveSessionPayload {
  auctionId: string;
  scheduledAt: string;
  streamProvider?: 'internal' | 'youtube' | 'custom';
  externalStreamUrl?: string;
  chatEnabled?: boolean;
  autoStart?: boolean;
  lotOrder?: string[];
  settings?: {
    watermark?: boolean;
    recordSession?: boolean;
    maxViewers?: number;
    language?: string;
  };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  message: string;
  type: 'message' | 'bid' | 'system' | 'moderation';
  createdAt: string;
}

export interface SendChatMessagePayload {
  message: string;
  type?: 'message' | 'bid';
}

export interface AuctioneerControlPayload {
  action:
    | 'start'
    | 'pause'
    | 'resume'
    | 'end'
    | 'next_lot'
    | 'previous_lot'
    | 'set_lot'
    | 'fair_warning'
    | 'going_once'
    | 'going_twice'
    | 'sold';
  lotId?: string;
  metadata?: Record<string, unknown>;
}

export class LiveApi extends BaseApiClient {
  /**
   * Create a new live auction session.
   */
  async create(payload: CreateLiveSessionPayload): Promise<ApiResponse<LiveSession>> {
    return this.post<LiveSession>('/live', payload);
  }

  /**
   * Get a live session by ID.
   */
  async getById(id: string): Promise<ApiResponse<LiveSession>> {
    return this.get<LiveSession>(`/live/${id}`);
  }

  /**
   * List live sessions.
   */
  async list(
    params?: LiveSessionListParams,
  ): Promise<ApiResponse<PaginatedResponse<LiveSession>>> {
    return this.get<PaginatedResponse<LiveSession>>('/live', { params });
  }

  /**
   * Get the live session for a specific auction.
   */
  async getByAuction(auctionId: string): Promise<ApiResponse<LiveSession>> {
    return this.get<LiveSession>(`/auctions/${auctionId}/live`);
  }

  /**
   * Join a live session as a viewer.
   */
  async join(
    sessionId: string,
  ): Promise<ApiResponse<{ sessionToken: string; streamUrl: string; hlsUrl?: string }>> {
    return this.post<{ sessionToken: string; streamUrl: string; hlsUrl?: string }>(
      `/live/${sessionId}/join`,
    );
  }

  /**
   * Leave a live session.
   */
  async leave(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/live/${sessionId}/leave`);
  }

  /**
   * Get stream info (URL, viewer count, status).
   */
  async getStreamInfo(
    sessionId: string,
  ): Promise<
    ApiResponse<{
      streamUrl: string;
      hlsUrl?: string;
      viewerCount: number;
      status: LiveSessionStatus;
      currentLotId?: string;
      isRecording: boolean;
    }>
  > {
    return this.get(`/live/${sessionId}/stream-info`);
  }

  /**
   * Get chat history for a live session.
   */
  async getChatHistory(
    sessionId: string,
    params?: { page?: number; perPage?: number; before?: string },
  ): Promise<ApiResponse<PaginatedResponse<ChatMessage>>> {
    return this.get<PaginatedResponse<ChatMessage>>(
      `/live/${sessionId}/chat`,
      { params },
    );
  }

  /**
   * Send a chat message in a live session.
   */
  async sendChatMessage(
    sessionId: string,
    payload: SendChatMessagePayload,
  ): Promise<ApiResponse<ChatMessage>> {
    return this.post<ChatMessage>(`/live/${sessionId}/chat`, payload);
  }

  /**
   * Delete a chat message (moderation).
   */
  async deleteChatMessage(
    sessionId: string,
    messageId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/live/${sessionId}/chat/${messageId}`);
  }

  /**
   * Mute a user in the chat.
   */
  async muteUser(
    sessionId: string,
    userId: string,
    durationMinutes?: number,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/live/${sessionId}/chat/mute`, {
      userId,
      durationMinutes,
    });
  }

  /**
   * Unmute a user in the chat.
   */
  async unmuteUser(
    sessionId: string,
    userId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/live/${sessionId}/chat/unmute`, { userId });
  }

  // -- Auctioneer controls ------------------------------------------------

  /**
   * Execute an auctioneer control action (start, pause, next lot, sold, etc.).
   */
  async auctioneerControl(
    sessionId: string,
    payload: AuctioneerControlPayload,
  ): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.post<{ message: string; session: LiveSession }>(
      `/live/${sessionId}/control`,
      payload,
    );
  }

  /**
   * Start the live session (convenience for auctioneerControl).
   */
  async start(sessionId: string): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.auctioneerControl(sessionId, { action: 'start' });
  }

  /**
   * Pause the live session.
   */
  async pause(sessionId: string): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.auctioneerControl(sessionId, { action: 'pause' });
  }

  /**
   * Resume the live session.
   */
  async resume(sessionId: string): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.auctioneerControl(sessionId, { action: 'resume' });
  }

  /**
   * End the live session.
   */
  async end(sessionId: string): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.auctioneerControl(sessionId, { action: 'end' });
  }

  /**
   * Move to the next lot in the session.
   */
  async nextLot(sessionId: string): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.auctioneerControl(sessionId, { action: 'next_lot' });
  }

  /**
   * Set a specific lot as current.
   */
  async setLot(
    sessionId: string,
    lotId: string,
  ): Promise<ApiResponse<{ message: string; session: LiveSession }>> {
    return this.auctioneerControl(sessionId, { action: 'set_lot', lotId });
  }

  /**
   * Get the recording/replay for an ended session.
   */
  async getRecording(
    sessionId: string,
  ): Promise<ApiResponse<{ recordingUrl: string; duration: number }>> {
    return this.get<{ recordingUrl: string; duration: number }>(
      `/live/${sessionId}/recording`,
    );
  }
}
