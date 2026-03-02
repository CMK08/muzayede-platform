// ---------------------------------------------------------------------------
// @muzayede/api-client — barrel export
// ---------------------------------------------------------------------------

export { BaseApiClient } from './client';
export type { ApiClientConfig } from './client';

export { AuthApi } from './endpoints/auth';
export type {
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  LoginResponse,
  OtpVerifyRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
} from './endpoints/auth';

export { AuctionApi } from './endpoints/auctions';
export type {
  AuctionListParams,
  CreateAuctionPayload,
  UpdateAuctionPayload,
} from './endpoints/auctions';

export { BidApi } from './endpoints/bids';
export type {
  PlaceBidPayload,
  ProxyBidPayload,
  BidListParams,
} from './endpoints/bids';

export { ProductApi } from './endpoints/products';
export type {
  ProductListParams,
  CreateProductPayload,
  UpdateProductPayload,
  BulkUploadPayload,
} from './endpoints/products';

export { UserApi } from './endpoints/users';
export type {
  UserListParams,
  UpdateProfilePayload,
  KycSubmitPayload,
} from './endpoints/users';

export { NotificationApi } from './endpoints/notifications';
export type {
  Notification,
  NotificationType,
  NotificationListParams,
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
  NewsletterSubscribePayload,
} from './endpoints/notifications';

export { PaymentApi } from './endpoints/payments';
export type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentListParams,
  CreatePaymentPayload,
  RefundPayload,
  EscrowReleasePayload,
  EscrowDisputePayload,
} from './endpoints/payments';

export { ShippingApi } from './endpoints/shipping';
export type {
  Shipment,
  ShipmentStatus,
  ShipmentListParams,
  CreateShipmentPayload,
  ShippingRate,
  GetRatesPayload,
  InsurancePayload,
  TrackingEvent,
  Address,
} from './endpoints/shipping';

export { LiveApi } from './endpoints/live';
export type {
  LiveSession,
  LiveSessionStatus,
  LiveSessionListParams,
  CreateLiveSessionPayload,
  ChatMessage,
  SendChatMessagePayload,
  AuctioneerControlPayload,
} from './endpoints/live';

export { SearchApi } from './endpoints/search';
export type {
  SearchParams,
  SearchResult,
  SearchEntity,
  AutocompleteParams,
  AutocompleteSuggestion,
  SearchSuggestion,
  SearchFacets,
  FacetValue,
  ReindexPayload,
} from './endpoints/search';

export { BlockchainApi } from './endpoints/blockchain';
export type {
  NftCertificate,
  BlockchainNetwork,
  MintNftPayload,
  FractionalShare,
  CreateFractionalSharesPayload,
  PurchaseSharesPayload,
  Badge,
  ProvenanceRecord,
  VerificationResult,
} from './endpoints/blockchain';

export { AnalyticsApi } from './endpoints/analytics';
export type {
  DateRange,
  ReportType,
  ExportFormat,
  DashboardMetricsParams,
  DashboardMetrics,
  RevenueChartParams,
  RevenueChartData,
  ReportParams,
  Report,
  ExportParams,
  SellerAnalytics,
  BuyerAnalytics,
} from './endpoints/analytics';

export { CmsApi } from './endpoints/cms';
export type {
  Page,
  CreatePagePayload,
  UpdatePagePayload,
  Banner,
  CreateBannerPayload,
  UpdateBannerPayload,
  BlogPost,
  CreateBlogPostPayload,
  UpdateBlogPostPayload,
  BlogListParams,
  FaqItem,
  FaqCategory,
  CreateFaqPayload,
  UpdateFaqPayload,
  SeoSettings,
  UpdateSeoSettingsPayload,
} from './endpoints/cms';
