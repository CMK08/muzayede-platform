// ---------------------------------------------------------------------------
// Blockchain / NFT API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface NftCertificate {
  id: string;
  tokenId: string;
  contractAddress: string;
  chain: BlockchainNetwork;
  productId: string;
  auctionId?: string;
  ownerAddress: string;
  metadataUri: string;
  imageUrl: string;
  mintedAt: string;
  transactionHash: string;
}

export type BlockchainNetwork = 'ethereum' | 'polygon' | 'avalanche';

export interface MintNftPayload {
  productId: string;
  auctionId?: string;
  recipientAddress?: string;
  chain?: BlockchainNetwork;
  metadata?: {
    name: string;
    description: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    imageUrl?: string;
  };
}

export interface FractionalShare {
  id: string;
  certificateId: string;
  totalShares: number;
  sharePrice: { amount: number; currency: string };
  availableShares: number;
  ownedShares: number;
  chain: BlockchainNetwork;
  contractAddress: string;
  createdAt: string;
}

export interface CreateFractionalSharesPayload {
  certificateId: string;
  totalShares: number;
  pricePerShare: { amount: number; currency: string };
  chain?: BlockchainNetwork;
}

export interface PurchaseSharesPayload {
  fractionalShareId: string;
  numberOfShares: number;
  paymentMethod: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'achievement' | 'participation' | 'reputation' | 'collector';
  tokenId?: string;
  earnedAt: string;
}

export interface ProvenanceRecord {
  id: string;
  productId: string;
  event: string;
  description: string;
  actor?: string;
  location?: string;
  date: string;
  transactionHash?: string;
  verified: boolean;
  documentUrls?: string[];
}

export interface VerificationResult {
  isValid: boolean;
  certificate?: NftCertificate;
  provenanceChain: ProvenanceRecord[];
  verifiedAt: string;
  blockConfirmations: number;
}

export class BlockchainApi extends BaseApiClient {
  /**
   * Mint an NFT certificate of authenticity for a product.
   */
  async mintNft(payload: MintNftPayload): Promise<ApiResponse<NftCertificate>> {
    return this.post<NftCertificate>('/blockchain/nft/mint', payload);
  }

  /**
   * Get an NFT certificate by ID.
   */
  async getCertificate(id: string): Promise<ApiResponse<NftCertificate>> {
    return this.get<NftCertificate>(`/blockchain/certificates/${id}`);
  }

  /**
   * Get the NFT certificate for a specific product.
   */
  async getCertificateByProduct(productId: string): Promise<ApiResponse<NftCertificate>> {
    return this.get<NftCertificate>(`/products/${productId}/certificate`);
  }

  /**
   * List all certificates owned by the current user.
   */
  async listMyCertificates(
    params?: { page?: number; perPage?: number; chain?: BlockchainNetwork },
  ): Promise<ApiResponse<PaginatedResponse<NftCertificate>>> {
    return this.get<PaginatedResponse<NftCertificate>>(
      '/blockchain/certificates/my',
      { params },
    );
  }

  /**
   * Verify an NFT certificate's authenticity on-chain.
   */
  async verify(
    certificateId: string,
  ): Promise<ApiResponse<VerificationResult>> {
    return this.get<VerificationResult>(`/blockchain/certificates/${certificateId}/verify`);
  }

  /**
   * Verify a certificate by its token ID and contract address.
   */
  async verifyByToken(
    contractAddress: string,
    tokenId: string,
    chain: BlockchainNetwork,
  ): Promise<ApiResponse<VerificationResult>> {
    return this.post<VerificationResult>('/blockchain/verify', {
      contractAddress,
      tokenId,
      chain,
    });
  }

  /**
   * Transfer an NFT certificate to another address.
   */
  async transfer(
    certificateId: string,
    toAddress: string,
  ): Promise<ApiResponse<{ transactionHash: string; message: string }>> {
    return this.post<{ transactionHash: string; message: string }>(
      `/blockchain/certificates/${certificateId}/transfer`,
      { toAddress },
    );
  }

  // -- Fractional shares --------------------------------------------------

  /**
   * Create fractional shares for a certificate.
   */
  async createFractionalShares(
    payload: CreateFractionalSharesPayload,
  ): Promise<ApiResponse<FractionalShare>> {
    return this.post<FractionalShare>('/blockchain/fractional', payload);
  }

  /**
   * Get fractional share details.
   */
  async getFractionalShare(id: string): Promise<ApiResponse<FractionalShare>> {
    return this.get<FractionalShare>(`/blockchain/fractional/${id}`);
  }

  /**
   * List available fractional shares.
   */
  async listFractionalShares(
    params?: { page?: number; perPage?: number; chain?: BlockchainNetwork },
  ): Promise<ApiResponse<PaginatedResponse<FractionalShare>>> {
    return this.get<PaginatedResponse<FractionalShare>>('/blockchain/fractional', { params });
  }

  /**
   * Purchase fractional shares.
   */
  async purchaseShares(
    payload: PurchaseSharesPayload,
  ): Promise<ApiResponse<{ transactionHash: string; sharesOwned: number; message: string }>> {
    const { fractionalShareId, ...body } = payload;
    return this.post(`/blockchain/fractional/${fractionalShareId}/purchase`, body);
  }

  /**
   * Get shares owned by the current user.
   */
  async getMyShares(
    params?: { page?: number; perPage?: number },
  ): Promise<ApiResponse<PaginatedResponse<FractionalShare>>> {
    return this.get<PaginatedResponse<FractionalShare>>('/blockchain/fractional/my', { params });
  }

  // -- Badges -------------------------------------------------------------

  /**
   * Get all badges earned by the current user.
   */
  async getMyBadges(): Promise<ApiResponse<Badge[]>> {
    return this.get<Badge[]>('/blockchain/badges/my');
  }

  /**
   * Get badges earned by a specific user.
   */
  async getUserBadges(userId: string): Promise<ApiResponse<Badge[]>> {
    return this.get<Badge[]>(`/blockchain/badges/user/${userId}`);
  }

  /**
   * Get all available badges.
   */
  async listBadges(): Promise<ApiResponse<Badge[]>> {
    return this.get<Badge[]>('/blockchain/badges');
  }

  /**
   * Claim a badge (if eligible).
   */
  async claimBadge(
    badgeId: string,
  ): Promise<ApiResponse<Badge & { transactionHash?: string }>> {
    return this.post<Badge & { transactionHash?: string }>(
      `/blockchain/badges/${badgeId}/claim`,
    );
  }

  // -- Provenance ---------------------------------------------------------

  /**
   * Get provenance history for a product.
   */
  async getProvenance(productId: string): Promise<ApiResponse<ProvenanceRecord[]>> {
    return this.get<ProvenanceRecord[]>(`/blockchain/provenance/${productId}`);
  }

  /**
   * Add a provenance record for a product.
   */
  async addProvenanceRecord(
    productId: string,
    payload: {
      event: string;
      description: string;
      actor?: string;
      location?: string;
      date: string;
      documentUrls?: string[];
    },
  ): Promise<ApiResponse<ProvenanceRecord>> {
    return this.post<ProvenanceRecord>(
      `/blockchain/provenance/${productId}`,
      payload,
    );
  }

  /**
   * Verify the full provenance chain for a product.
   */
  async verifyProvenance(
    productId: string,
  ): Promise<ApiResponse<{ isValid: boolean; records: ProvenanceRecord[]; verifiedAt: string }>> {
    return this.get(`/blockchain/provenance/${productId}/verify`);
  }
}
