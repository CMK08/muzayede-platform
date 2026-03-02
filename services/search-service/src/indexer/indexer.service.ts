import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchWrapperService } from '../elasticsearch/elasticsearch.service';

const PRODUCTS_INDEX = 'muzayede-products';
const AUCTIONS_INDEX = 'muzayede-auctions';

/** Batch size for bulk indexing operations */
const BULK_BATCH_SIZE = 500;

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly esService: ElasticsearchWrapperService,
  ) {}

  // ─── Product Indexing ─────────────────────────────────────────────

  /**
   * Index a single product by its ID. Fetches the product from PostgreSQL,
   * transforms it into an ES document, and indexes it.
   */
  async indexProduct(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: {
            id: true,
            profile: {
              select: { displayName: true, firstName: true, lastName: true },
            },
          },
        },
        artist: { select: { id: true, name: true } },
        media: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        tags: {
          include: { tag: { select: { name: true } } },
        },
      },
    });

    if (!product) {
      this.logger.warn(`Product not found for indexing: ${productId}`);
      return false;
    }

    const doc = this.transformProduct(product);
    const result = await this.esService.indexDocument(
      PRODUCTS_INDEX,
      product.id,
      doc,
    );

    if (result) {
      this.logger.debug(`Product indexed: ${product.id} - ${product.title}`);
    }

    return result;
  }

  /**
   * Remove a single product from the ES index.
   */
  async removeProduct(productId: string): Promise<boolean> {
    const result = await this.esService.deleteDocument(
      PRODUCTS_INDEX,
      productId,
    );
    if (result) {
      this.logger.debug(`Product removed from index: ${productId}`);
    }
    return result;
  }

  /**
   * Update a product in the index. Fetches fresh data from DB and re-indexes.
   */
  async updateProduct(productId: string): Promise<boolean> {
    return this.indexProduct(productId);
  }

  // ─── Auction Indexing ─────────────────────────────────────────────

  /**
   * Index a single auction by its ID.
   */
  async indexAuction(auctionId: string): Promise<boolean> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        creator: {
          select: {
            id: true,
            profile: {
              select: { displayName: true, firstName: true, lastName: true },
            },
          },
        },
        lots: {
          include: {
            product: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!auction) {
      this.logger.warn(`Auction not found for indexing: ${auctionId}`);
      return false;
    }

    const doc = this.transformAuction(auction);
    const result = await this.esService.indexDocument(
      AUCTIONS_INDEX,
      auction.id,
      doc,
    );

    if (result) {
      this.logger.debug(`Auction indexed: ${auction.id} - ${auction.title}`);
    }

    return result;
  }

  /**
   * Remove a single auction from the ES index.
   */
  async removeAuction(auctionId: string): Promise<boolean> {
    const result = await this.esService.deleteDocument(
      AUCTIONS_INDEX,
      auctionId,
    );
    if (result) {
      this.logger.debug(`Auction removed from index: ${auctionId}`);
    }
    return result;
  }

  /**
   * Update an auction in the index.
   */
  async updateAuction(auctionId: string): Promise<boolean> {
    return this.indexAuction(auctionId);
  }

  // ─── Bulk Reindex ─────────────────────────────────────────────────

  /**
   * Full reindex of all active products from the database.
   * Recreates the index from scratch, then bulk-indexes all products.
   */
  async reindexAllProducts(
    recreate = false,
  ): Promise<{ indexed: number; total: number; failed: number }> {
    this.logger.log('Starting full product reindex...');

    if (recreate) {
      await this.esService.recreateIndex(PRODUCTS_INDEX);
    }

    const totalCount = await this.prisma.product.count({
      where: { isActive: true },
    });
    this.logger.log(`Found ${totalCount} active products to index`);

    let indexed = 0;
    let failed = 0;
    let skip = 0;

    while (skip < totalCount) {
      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          artist: { select: { id: true, name: true } },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
          tags: {
            include: { tag: { select: { name: true } } },
          },
        },
        skip,
        take: BULK_BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (products.length === 0) break;

      const operations = products.map((product) => ({
        index: PRODUCTS_INDEX,
        id: product.id,
        document: this.transformProduct(product),
      }));

      const result = await this.esService.bulkIndex(operations);
      indexed += result.successful;
      failed += result.failed;
      skip += products.length;

      this.logger.log(
        `Product reindex progress: ${skip}/${totalCount} processed (${indexed} indexed, ${failed} failed)`,
      );
    }

    this.logger.log(
      `Product reindex complete: ${indexed}/${totalCount} indexed, ${failed} failed`,
    );
    return { indexed, total: totalCount, failed };
  }

  /**
   * Full reindex of all auctions from the database.
   */
  async reindexAllAuctions(
    recreate = false,
  ): Promise<{ indexed: number; total: number; failed: number }> {
    this.logger.log('Starting full auction reindex...');

    if (recreate) {
      await this.esService.recreateIndex(AUCTIONS_INDEX);
    }

    const totalCount = await this.prisma.auction.count();
    this.logger.log(`Found ${totalCount} auctions to index`);

    let indexed = 0;
    let failed = 0;
    let skip = 0;

    while (skip < totalCount) {
      const auctions = await this.prisma.auction.findMany({
        include: {
          creator: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          lots: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                },
              },
            },
            take: 1,
          },
        },
        skip,
        take: BULK_BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (auctions.length === 0) break;

      const operations = auctions.map((auction) => ({
        index: AUCTIONS_INDEX,
        id: auction.id,
        document: this.transformAuction(auction),
      }));

      const result = await this.esService.bulkIndex(operations);
      indexed += result.successful;
      failed += result.failed;
      skip += auctions.length;

      this.logger.log(
        `Auction reindex progress: ${skip}/${totalCount} processed (${indexed} indexed, ${failed} failed)`,
      );
    }

    this.logger.log(
      `Auction reindex complete: ${indexed}/${totalCount} indexed, ${failed} failed`,
    );
    return { indexed, total: totalCount, failed };
  }

  /**
   * Full reindex of all indices. Optionally recreates indices from scratch.
   */
  async reindexAll(recreate = false): Promise<{
    products: { indexed: number; total: number; failed: number };
    auctions: { indexed: number; total: number; failed: number };
  }> {
    const [products, auctions] = await Promise.all([
      this.reindexAllProducts(recreate),
      this.reindexAllAuctions(recreate),
    ]);
    return { products, auctions };
  }

  // ─── Transformers ─────────────────────────────────────────────────

  private transformProduct(product: any): Record<string, any> {
    const sellerProfile = product.seller?.profile;
    const sellerName =
      sellerProfile?.displayName ||
      (sellerProfile?.firstName && sellerProfile?.lastName
        ? `${sellerProfile.firstName} ${sellerProfile.lastName}`
        : '');

    const tagNames =
      product.tags?.map((pt: any) => pt.tag?.name).filter(Boolean) || [];

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.shortDescription || product.descriptionHtml || '',
      condition: product.condition,
      categoryId: product.categoryId || null,
      categoryName: product.category?.name || '',
      categorySlug: product.category?.slug || '',
      estimateLow: product.estimateLow ? Number(product.estimateLow) : null,
      estimateHigh: product.estimateHigh ? Number(product.estimateHigh) : null,
      currentPrice: product.estimateLow ? Number(product.estimateLow) : 0,
      sellerId: product.sellerId,
      sellerName,
      artistId: product.artistId || null,
      artistName: product.artist?.name || '',
      imageUrl: product.media?.[0]?.url || '',
      tags: tagNames,
      isActive: product.isActive,
      createdAt: product.createdAt
        ? new Date(product.createdAt).toISOString()
        : null,
      updatedAt: product.updatedAt
        ? new Date(product.updatedAt).toISOString()
        : null,
      suggest: {
        input: this.generateSuggestions(product.title, product.artist?.name),
        weight: 1,
      },
      indexedAt: new Date().toISOString(),
    };
  }

  private transformAuction(auction: any): Record<string, any> {
    const sellerProfile = auction.creator?.profile;
    const sellerName =
      sellerProfile?.displayName ||
      (sellerProfile?.firstName && sellerProfile?.lastName
        ? `${sellerProfile.firstName} ${sellerProfile.lastName}`
        : '');

    const category = auction.lots?.[0]?.product?.category;

    return {
      id: auction.id,
      title: auction.title,
      slug: auction.slug,
      description: auction.description || '',
      type: auction.type,
      status: auction.status,
      currentPrice: auction.currentPrice
        ? Number(auction.currentPrice)
        : Number(auction.startPrice),
      startPrice: Number(auction.startPrice),
      reservePrice: auction.reservePrice
        ? Number(auction.reservePrice)
        : null,
      buyNowPrice: auction.buyNowPrice ? Number(auction.buyNowPrice) : null,
      buyNowEnabled: auction.buyNowEnabled,
      minIncrement: Number(auction.minIncrement),
      currency: auction.currency,
      startDate: auction.startDate
        ? new Date(auction.startDate).toISOString()
        : null,
      endDate: auction.actualEndDate
        ? new Date(auction.actualEndDate).toISOString()
        : auction.endDate
          ? new Date(auction.endDate).toISOString()
          : null,
      categoryName: category?.name || '',
      categorySlug: category?.slug || '',
      createdBy: auction.createdBy,
      sellerName,
      auctionHouseId: auction.auctionHouseId || null,
      bidCount: auction.bidCount || 0,
      viewCount: auction.viewCount || 0,
      imageUrl: auction.coverImageUrl || '',
      isLiveStreaming: auction.isLiveStreaming,
      createdAt: auction.createdAt
        ? new Date(auction.createdAt).toISOString()
        : null,
      updatedAt: auction.updatedAt
        ? new Date(auction.updatedAt).toISOString()
        : null,
      suggest: {
        input: this.generateSuggestions(auction.title),
        weight: auction.bidCount
          ? Math.min(auction.bidCount + 1, 100)
          : 1,
      },
      indexedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate completion suggestion inputs from a title and an optional artist
   * name. Produces prefix tokens for the ES completion suggester.
   */
  private generateSuggestions(title: string, artistName?: string): string[] {
    if (!title) return [];

    const suggestions: string[] = [title];
    const words = title.split(/\s+/).filter((w) => w.length > 2);

    // Individual words
    for (const word of words) {
      if (!suggestions.includes(word)) {
        suggestions.push(word);
      }
    }

    // Two-word combinations for better prefix matching
    for (let i = 0; i < words.length - 1; i++) {
      const twoWords = `${words[i]} ${words[i + 1]}`;
      if (!suggestions.includes(twoWords)) {
        suggestions.push(twoWords);
      }
    }

    // Include artist name in suggestions if available
    if (artistName && artistName.trim().length > 0) {
      if (!suggestions.includes(artistName)) {
        suggestions.push(artistName);
      }
      const artistWords = artistName.split(/\s+/).filter((w) => w.length > 2);
      for (const word of artistWords) {
        if (!suggestions.includes(word)) {
          suggestions.push(word);
        }
      }
    }

    return suggestions.slice(0, 20);
  }
}
