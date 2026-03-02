// ---------------------------------------------------------------------------
// Shipping API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export type ShipmentStatus =
  | 'pending'
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'exception';

export interface Address {
  name: string;
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface Shipment {
  id: string;
  paymentId: string;
  auctionId: string;
  trackingNumber?: string;
  carrier: string;
  status: ShipmentStatus;
  fromAddress: Address;
  toAddress: Address;
  weight?: { value: number; unit: 'kg' | 'lb' };
  dimensions?: { width: number; height: number; depth: number; unit: 'cm' | 'in' };
  labelUrl?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  insuranceAmount?: { amount: number; currency: string };
  isWhiteGlove: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentListParams {
  page?: number;
  perPage?: number;
  status?: ShipmentStatus;
  auctionId?: string;
  carrier?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateShipmentPayload {
  paymentId: string;
  auctionId: string;
  lotId?: string;
  carrier: string;
  serviceLevel: string;
  fromAddress: Address;
  toAddress: Address;
  weight?: { value: number; unit: 'kg' | 'lb' };
  dimensions?: { width: number; height: number; depth: number; unit: 'cm' | 'in' };
  declaredValue?: { amount: number; currency: string };
  requireSignature?: boolean;
  isWhiteGlove?: boolean;
  specialInstructions?: string;
}

export interface ShippingRate {
  carrier: string;
  serviceLevel: string;
  serviceName: string;
  estimatedDays: number;
  rate: { amount: number; currency: string };
  isGuaranteed: boolean;
}

export interface GetRatesPayload {
  fromAddress: Address;
  toAddress: Address;
  weight: { value: number; unit: 'kg' | 'lb' };
  dimensions?: { width: number; height: number; depth: number; unit: 'cm' | 'in' };
  declaredValue?: { amount: number; currency: string };
  isWhiteGlove?: boolean;
}

export interface InsurancePayload {
  shipmentId: string;
  coverageAmount: { amount: number; currency: string };
  itemDescription: string;
  itemCategory?: string;
}

export interface TrackingEvent {
  timestamp: string;
  status: ShipmentStatus;
  location?: string;
  description: string;
}

export class ShippingApi extends BaseApiClient {
  /**
   * Create a new shipment.
   */
  async create(payload: CreateShipmentPayload): Promise<ApiResponse<Shipment>> {
    return this.post<Shipment>('/shipping', payload);
  }

  /**
   * Get a shipment by ID.
   */
  async getById(id: string): Promise<ApiResponse<Shipment>> {
    return this.get<Shipment>(`/shipping/${id}`);
  }

  /**
   * List shipments for the current user.
   */
  async list(
    params?: ShipmentListParams,
  ): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
    return this.get<PaginatedResponse<Shipment>>('/shipping', { params });
  }

  /**
   * Track a shipment by ID.
   */
  async track(
    id: string,
  ): Promise<ApiResponse<{ shipment: Shipment; events: TrackingEvent[] }>> {
    return this.get<{ shipment: Shipment; events: TrackingEvent[] }>(
      `/shipping/${id}/track`,
    );
  }

  /**
   * Track a shipment by tracking number and carrier.
   */
  async trackByNumber(
    trackingNumber: string,
    carrier: string,
  ): Promise<ApiResponse<{ events: TrackingEvent[]; estimatedDelivery?: string }>> {
    return this.get<{ events: TrackingEvent[]; estimatedDelivery?: string }>(
      '/shipping/track',
      { params: { trackingNumber, carrier } },
    );
  }

  /**
   * Get available shipping rates.
   */
  async getRates(payload: GetRatesPayload): Promise<ApiResponse<ShippingRate[]>> {
    return this.post<ShippingRate[]>('/shipping/rates', payload);
  }

  /**
   * Generate a shipping label for a shipment.
   */
  async getLabel(
    shipmentId: string,
    format: 'pdf' | 'png' | 'zpl' = 'pdf',
  ): Promise<ApiResponse<{ labelUrl: string; format: string }>> {
    return this.get<{ labelUrl: string; format: string }>(
      `/shipping/${shipmentId}/label`,
      { params: { format } },
    );
  }

  /**
   * Purchase shipping insurance for a shipment.
   */
  async addInsurance(
    payload: InsurancePayload,
  ): Promise<
    ApiResponse<{
      insuranceId: string;
      coverageAmount: { amount: number; currency: string };
      premium: { amount: number; currency: string };
    }>
  > {
    const { shipmentId, ...body } = payload;
    return this.post(`/shipping/${shipmentId}/insurance`, body);
  }

  /**
   * File an insurance claim for a shipment.
   */
  async fileInsuranceClaim(
    shipmentId: string,
    payload: {
      reason: string;
      description: string;
      evidenceUrls?: string[];
      claimedAmount: { amount: number; currency: string };
    },
  ): Promise<ApiResponse<{ claimId: string; status: string }>> {
    return this.post<{ claimId: string; status: string }>(
      `/shipping/${shipmentId}/insurance/claim`,
      payload,
    );
  }

  /**
   * Request white-glove delivery service for a shipment.
   */
  async requestWhiteGlove(
    shipmentId: string,
    payload: {
      preferredDate?: string;
      preferredTimeSlot?: string;
      specialInstructions?: string;
      installationRequired?: boolean;
    },
  ): Promise<
    ApiResponse<{
      whiteGloveId: string;
      scheduledDate?: string;
      additionalCost: { amount: number; currency: string };
    }>
  > {
    return this.post(`/shipping/${shipmentId}/white-glove`, payload);
  }

  /**
   * Get white-glove service availability and pricing.
   */
  async getWhiteGloveRates(
    toAddress: Address,
    weight: { value: number; unit: 'kg' | 'lb' },
  ): Promise<
    ApiResponse<{
      available: boolean;
      baseRate: { amount: number; currency: string };
      installationRate?: { amount: number; currency: string };
      availableDates?: string[];
    }>
  > {
    return this.post('/shipping/white-glove/rates', { toAddress, weight });
  }

  /**
   * Confirm delivery of a shipment (buyer side).
   */
  async confirmDelivery(
    shipmentId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/shipping/${shipmentId}/confirm-delivery`);
  }

  /**
   * Report a problem with a shipment.
   */
  async reportProblem(
    shipmentId: string,
    payload: { type: 'damaged' | 'lost' | 'wrong_item' | 'other'; description: string },
  ): Promise<ApiResponse<{ ticketId: string; message: string }>> {
    return this.post<{ ticketId: string; message: string }>(
      `/shipping/${shipmentId}/report-problem`,
      payload,
    );
  }
}
