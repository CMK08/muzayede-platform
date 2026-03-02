export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  surname: string;
  avatar?: string;
  isVerified: boolean;
  role: 'USER' | 'ADMIN' | 'SELLER';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  _count?: {
    products: number;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  images: ProductImage[];
  categoryId: string;
  category?: Category;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  sellerId: string;
  seller?: User;
  createdAt: string;
  updatedAt: string;
}

export type AuctionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'ENDING_SOON'
  | 'ENDED'
  | 'SOLD'
  | 'CANCELLED';

export interface Auction {
  id: string;
  title: string;
  description: string;
  productId: string;
  product?: Product;
  startPrice: number;
  currentPrice: number;
  minBidIncrement: number;
  buyNowPrice?: number;
  startTime: string;
  endTime: string;
  status: AuctionStatus;
  sellerId: string;
  seller?: User;
  winnerId?: string;
  winner?: User;
  bidCount: number;
  viewCount: number;
  watchCount: number;
  isFeatured: boolean;
  images: ProductImage[];
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  amount: number;
  auctionId: string;
  auction?: Auction;
  userId: string;
  user?: User;
  isAutoBid: boolean;
  isWinning: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type:
    | 'BID_PLACED'
    | 'BID_OUTBID'
    | 'AUCTION_WON'
    | 'AUCTION_ENDING'
    | 'AUCTION_STARTED'
    | 'ORDER_STATUS'
    | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  userId: string;
  createdAt: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Order {
  id: string;
  auctionId: string;
  auction?: Auction;
  buyerId: string;
  buyer?: User;
  sellerId: string;
  seller?: User;
  amount: number;
  status: OrderStatus;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  name: string;
  surname: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuctionFilters {
  search?: string;
  categoryId?: string;
  status?: AuctionStatus;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'currentPrice' | 'endTime' | 'bidCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BidRequest {
  auctionId: string;
  amount: number;
  isAutoBid?: boolean;
  maxAutoBidAmount?: number;
}

export interface SocketBidEvent {
  auctionId: string;
  bid: Bid;
  currentPrice: number;
  bidCount: number;
}

export interface SocketAuctionEvent {
  auctionId: string;
  status: AuctionStatus;
  winnerId?: string;
}
