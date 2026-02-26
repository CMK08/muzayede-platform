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
