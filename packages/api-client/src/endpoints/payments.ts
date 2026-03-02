// ---------------------------------------------------------------------------
// Payment API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export type PaymentMethod =
  | 'credit_card'
  | 'bank_transfer'
  | 'wire_transfer'
  | 'crypto'
  | 'escrow';

export interface Payment {
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: { amount: number; currency: string };
  fee: { amount: number; currency: string };
  netAmount: { amount: number; currency: string };
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListParams {
  page?: number;
  perPage?: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  auctionId?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CreatePaymentPayload {
  auctionId: string;
  lotId?: string;
  method: PaymentMethod;
  amount: { amount: number; currency: string };
  returnUrl?: string;
  billingAddress?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  cardToken?: string;
  savePaymentMethod?: boolean;
}

export interface RefundPayload {
  paymentId: string;
  amount?: { amount: number; currency: string };
  reason: string;
}

export interface EscrowReleasePayload {
  paymentId: string;
  releaseNote?: string;
}

export interface EscrowDisputePayload {
  paymentId: string;
  reason: string;
  evidence?: string[];
}

export class PaymentApi extends BaseApiClient {
  /**
   * Create a new payment for a won auction.
   */
  async create(
    payload: CreatePaymentPayload,
  ): Promise<ApiResponse<Payment & { checkoutUrl?: string }>> {
    return this.post<Payment & { checkoutUrl?: string }>('/payments', payload);
  }

  /**
   * Get a payment by ID.
   */
  async getById(id: string): Promise<ApiResponse<Payment>> {
    return this.get<Payment>(`/payments/${id}`);
  }

  /**
   * Get the status of a payment.
   */
  async getStatus(id: string): Promise<ApiResponse<{ status: PaymentStatus; updatedAt: string }>> {
    return this.get<{ status: PaymentStatus; updatedAt: string }>(`/payments/${id}/status`);
  }

  /**
   * List payments for the current user.
   */
  async list(
    params?: PaymentListParams,
  ): Promise<ApiResponse<PaginatedResponse<Payment>>> {
    return this.get<PaginatedResponse<Payment>>('/payments', { params });
  }

  /**
   * Get payment history for a specific auction.
   */
  async getByAuction(auctionId: string): Promise<ApiResponse<Payment[]>> {
    return this.get<Payment[]>(`/auctions/${auctionId}/payments`);
  }

  /**
   * Process a refund (full or partial).
   */
  async refund(
    payload: RefundPayload,
  ): Promise<ApiResponse<Payment>> {
    const { paymentId, ...body } = payload;
    return this.post<Payment>(`/payments/${paymentId}/refund`, body);
  }

  /**
   * Get saved payment methods for the current user.
   */
  async getSavedMethods(): Promise<
    ApiResponse<
      Array<{
        id: string;
        type: PaymentMethod;
        last4?: string;
        brand?: string;
        expiryMonth?: number;
        expiryYear?: number;
        isDefault: boolean;
      }>
    >
  > {
    return this.get('/payments/methods');
  }

  /**
   * Delete a saved payment method.
   */
  async deleteSavedMethod(methodId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/payments/methods/${methodId}`);
  }

  /**
   * Set a saved payment method as default.
   */
  async setDefaultMethod(methodId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/payments/methods/${methodId}/default`);
  }

  // -- Escrow operations --------------------------------------------------

  /**
   * Get escrow details for a payment.
   */
  async getEscrowDetails(
    paymentId: string,
  ): Promise<
    ApiResponse<{
      paymentId: string;
      status: 'held' | 'released' | 'disputed' | 'refunded';
      heldAmount: { amount: number; currency: string };
      heldAt: string;
      releaseDate?: string;
    }>
  > {
    return this.get(`/payments/${paymentId}/escrow`);
  }

  /**
   * Release escrow funds to the seller.
   */
  async releaseEscrow(
    payload: EscrowReleasePayload,
  ): Promise<ApiResponse<{ message: string }>> {
    const { paymentId, ...body } = payload;
    return this.post<{ message: string }>(`/payments/${paymentId}/escrow/release`, body);
  }

  /**
   * Dispute an escrow payment.
   */
  async disputeEscrow(
    payload: EscrowDisputePayload,
  ): Promise<ApiResponse<{ disputeId: string; message: string }>> {
    const { paymentId, ...body } = payload;
    return this.post<{ disputeId: string; message: string }>(
      `/payments/${paymentId}/escrow/dispute`,
      body,
    );
  }

  /**
   * Get invoice/receipt for a payment.
   */
  async getInvoice(paymentId: string): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.get<{ downloadUrl: string }>(`/payments/${paymentId}/invoice`);
  }
}
