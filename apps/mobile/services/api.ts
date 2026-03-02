import api from '@/lib/api';
import type {
  Order,
  PaginatedResponse,
} from '@/types';

// ─── Orders ─────────────────────────────────────────────────────────────────

export async function fetchMyOrders(): Promise<Order[]> {
  const { data } = await api.get<{ data: Order[] }>('/users/orders');
  return data.data;
}

export async function fetchOrderById(orderId: string): Promise<Order> {
  const { data } = await api.get<{ data: Order }>(`/orders/${orderId}`);
  return data.data;
}

// ─── Payments ───────────────────────────────────────────────────────────────

export interface PaymentIntentRequest {
  orderId: string;
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER';
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret?: string;
  bankDetails?: {
    bankName: string;
    iban: string;
    accountHolder: string;
    referenceCode: string;
  };
  amount: number;
  commission: number;
  vat: number;
  total: number;
}

export async function createPaymentIntent(
  payload: PaymentIntentRequest
): Promise<PaymentIntentResponse> {
  const { data } = await api.post<{ data: PaymentIntentResponse }>(
    '/payments/intent',
    payload
  );
  return data.data;
}

export interface CardPaymentRequest {
  orderId: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
}

export async function processCardPayment(
  payload: CardPaymentRequest
): Promise<PaymentResult> {
  const { data } = await api.post<{ data: PaymentResult }>(
    '/payments/card',
    payload
  );
  return data.data;
}

export async function confirmBankTransfer(orderId: string): Promise<{ success: boolean }> {
  const { data } = await api.post<{ data: { success: boolean } }>(
    '/payments/bank-transfer/confirm',
    { orderId }
  );
  return data.data;
}

// ─── Shipping ───────────────────────────────────────────────────────────────

export interface ShippingEvent {
  date: string;
  status: string;
  location: string;
  description: string;
}

export interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: string;
  events: ShippingEvent[];
}

export async function fetchShippingInfo(orderId: string): Promise<ShippingInfo> {
  const { data } = await api.get<{ data: ShippingInfo }>(
    `/orders/${orderId}/shipping`
  );
  return data.data;
}

// ─── Order Summary (for checkout) ───────────────────────────────────────────

export interface OrderSummary {
  orderId: string;
  auctionTitle: string;
  productImage?: string;
  hammerPrice: number;
  commission: number;
  commissionRate: number;
  vat: number;
  vatRate: number;
  total: number;
}

export async function fetchOrderSummary(orderId: string): Promise<OrderSummary> {
  const { data } = await api.get<{ data: OrderSummary }>(
    `/orders/${orderId}/summary`
  );
  return data.data;
}

// ─── Live Auction ───────────────────────────────────────────────────────────

export interface LiveAuctionLot {
  id: string;
  lotNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  startPrice: number;
  currentPrice: number;
  bidCount: number;
  status: 'PENDING' | 'ACTIVE' | 'SOLD' | 'PASSED';
}

export interface LiveAuctionInfo {
  id: string;
  title: string;
  streamUrl?: string;
  currentLot?: LiveAuctionLot;
  lots: LiveAuctionLot[];
  viewerCount: number;
  isLive: boolean;
}

export async function fetchLiveAuctionInfo(
  auctionId: string
): Promise<LiveAuctionInfo> {
  const { data } = await api.get<{ data: LiveAuctionInfo }>(
    `/auctions/${auctionId}/live`
  );
  return data.data;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export async function fetchLiveChatMessages(
  auctionId: string
): Promise<ChatMessage[]> {
  const { data } = await api.get<{ data: ChatMessage[] }>(
    `/auctions/${auctionId}/chat`
  );
  return data.data;
}

// ─── Products ───────────────────────────────────────────────────────────────

export interface SimilarProduct {
  id: string;
  title: string;
  imageUrl: string;
  estimatedPrice: number;
}

export async function fetchSimilarProducts(
  productId: string
): Promise<SimilarProduct[]> {
  const { data } = await api.get<{ data: SimilarProduct[] }>(
    `/products/${productId}/similar`
  );
  return data.data;
}

// ─── User Settings ──────────────────────────────────────────────────────────

export interface NotificationPreferences {
  bidUpdates: boolean;
  auctionReminders: boolean;
  priceAlerts: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await api.get<{ data: NotificationPreferences }>(
    '/users/notification-preferences'
  );
  return data.data;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data } = await api.put<{ data: NotificationPreferences }>(
    '/users/notification-preferences',
    prefs
  );
  return data.data;
}

export async function updateUserLanguage(
  language: string
): Promise<{ success: boolean }> {
  const { data } = await api.put<{ data: { success: boolean } }>(
    '/users/language',
    { language }
  );
  return data.data;
}
