// ---------------------------------------------------------------------------
// Order & Payment Domain Types
// ---------------------------------------------------------------------------

import type { Address, BaseEntity, Money } from './common';
import type { UserSummary } from './user';

/** Lifecycle of an order */
export type OrderStatus =
  | 'pending_payment'
  | 'payment_processing'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

/** Supported payment methods */
export type PaymentMethod =
  | 'credit_card'
  | 'bank_transfer'
  | 'crypto'
  | 'escrow'
  | 'installment'
  | 'wallet';

/** Payment processing status */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'chargeback';

/** Individual line item inside an order */
export interface OrderItem {
  id: string;
  productId: string;
  auctionId: string;
  lotId?: string;
  title: string;
  imageUrl?: string;
  hammerPrice: Money;
  buyerPremium: Money;
  vatAmount: Money;
  totalAmount: Money;
}

/** Payment record */
export interface Payment extends BaseEntity {
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  transactionId?: string;
  providerReference?: string;
  gatewayResponse?: Record<string, unknown>;
  paidAt?: string;
  failureReason?: string;
  refundedAmount?: Money;
  installmentCount?: number;
}

/** Invoice generated for an order */
export interface Invoice extends BaseEntity {
  orderId: string;
  invoiceNumber: string;
  buyer: UserSummary;
  seller: UserSummary;
  items: OrderItem[];
  subtotal: Money;
  buyerPremium: Money;
  vatAmount: Money;
  shippingCost: Money;
  totalAmount: Money;
  billingAddress: Address;
  issuedAt: string;
  dueDate: string;
  pdfUrl?: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
}

/** Payout record for seller settlement */
export interface SellerPayout extends BaseEntity {
  sellerId: string;
  orderId: string;
  grossAmount: Money;
  commissionAmount: Money;
  netAmount: Money;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'on_hold';
  bankAccount?: string;
  payoutReference?: string;
  processedAt?: string;
  scheduledAt: string;
}

/** Core order entity */
export interface Order extends BaseEntity {
  orderNumber: string;
  buyer: UserSummary;
  seller: UserSummary;
  items: OrderItem[];
  status: OrderStatus;
  payment?: Payment;
  invoice?: Invoice;
  shippingAddress: Address;
  billingAddress: Address;
  subtotal: Money;
  buyerPremium: Money;
  vatAmount: Money;
  shippingCost: Money;
  totalAmount: Money;
  notes?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}
