// ---------------------------------------------------------------------------
// Shipping Domain Types
// ---------------------------------------------------------------------------

import type { Address, BaseEntity, Money } from './common';

/** Lifecycle of a shipment */
export type ShipmentStatus =
  | 'pending'
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returned'
  | 'lost';

/** Supported carriers */
export interface Carrier extends BaseEntity {
  name: string;
  code: string;
  logoUrl?: string;
  trackingUrlTemplate?: string;
  supportedCountries: string[];
  isActive: boolean;
}

/** Individual tracking event */
export interface TrackingEvent {
  status: ShipmentStatus;
  description: string;
  location?: string;
  timestamp: string;
}

/** Insurance details for high-value shipments */
export interface ShipmentInsurance {
  isInsured: boolean;
  coverageAmount?: Money;
  provider?: string;
  policyNumber?: string;
}

/** Core shipment entity */
export interface Shipment extends BaseEntity {
  orderId: string;
  carrier: Carrier;
  trackingNumber?: string;
  status: ShipmentStatus;
  fromAddress: Address;
  toAddress: Address;
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  shippingCost: Money;
  insurance: ShipmentInsurance;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingEvents: TrackingEvent[];
  signatureRequired: boolean;
  signatureUrl?: string;
  labelUrl?: string;
  notes?: string;
}

/** Shipping rate quote */
export interface ShippingRate {
  carrierId: string;
  carrierName: string;
  serviceName: string;
  cost: Money;
  estimatedDays: number;
  isInsured: boolean;
}
