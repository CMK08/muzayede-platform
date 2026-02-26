import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { PrismaService } from '../prisma/prisma.service';

interface SearchParams {
  query: string;
  type?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  condition?: string;
  auctionType?: string;
  sort?: string;
  page: number;
  limit: number;
}

interface SearchResult {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    took: number;
  };
  facets: {
    categories: { key: string; count: number }[];
    priceRanges: { key: string; count: number }[];
    statuses: { key: string; count: number }[];
  };
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  private readonly INDICES = {
    auctions: 'muzayede_auctions',
    products: 'muzayede_products',
  };

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.ensureIndices();
  }

  async search(params: SearchParams): Promise<SearchResult> {
    this.logger.log(
      `Search: q="${params.query}", type=${params.type || 'all'}`,
    );

    const index = params.type
      ? this.INDICES[params.type as keyof typeof this.INDICES]
      : Object.values(this.INDICES).join(',');

    if (!index) {
      return {
        data: [],
        meta: {
          total: 0,
          page: params.page,
          limit: params.limit,
          totalPages: 0,
          took: 0,
        },
        facets: { categories: [], priceRanges: [], statuses: [] },
      };
    }

    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search with boosting
    if (params.query && params.query.trim()) {
      must.push({
        multi_match: {
          query: params.query,
          fields: [
            'title^3',
            'title.turkish^2',
            'description^1.5',
            'description.turkish^1',
            'categoryName^2',
            'sellerName^1',
            'artistName^1.5',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
        },
      });
    }

    // Category filter
    if (params.category) {
      filter.push({ term: { 'categoryName.keyword': params.category } });
    }

    // Price range filter
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      const range: any = {};
      if (params.minPrice !== undefined) range.gte = params.minPrice;
      if (params.maxPrice !== undefined) range.lte = params.maxPrice;
      filter.push({ range: { currentPrice: range } });
    }

    // Status filter
    if (params.status) {
      filter.push({ term: { 'status.keyword': params.status } });
    }

    // Condition filter (for products)
    if (params.condition) {
      filter.push({ term: { 'condition.keyword': params.condition } });
    }

    // Auction type filter
    if (params.auctionType) {
      filter.push({ term: { 'type.keyword': params.auctionType } });
    }

    const sort = this.buildSort(params.sort);
    const from = (params.page - 1) * params.limit;

    try {
      const result = await this.elasticsearchService.search({
        index,
        body: {
          from,
          size: params.limit,
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }],
              filter,
            },
          },
          sort,
          aggs: {
            categories: {
              terms: { field: 'categoryName.keyword', size: 30 },
            },
            price_ranges: {
              range: {
                field: 'currentPrice',
                ranges: [
                  { key: '0-100', from: 0, to: 100 },
                  { key: '100-500', from: 100, to: 500 },
                  { key: '500-1000', from: 500, to: 1000 },
                  { key: '1000-5000', from: 1000, to: 5000 },
                  { key: '5000-10000', from: 5000, to: 10000 },
                  { key: '10000-50000', from: 10000, to: 50000 },
                  { key: '50000+', from: 50000 },
                ],
              },
            },
            statuses: {
              terms: { field: 'status.keyword', size: 10 },
            },
          },
          highlight: {
            pre_tags: ['<em>'],
            post_tags: ['</em>'],
            fields: {
              title: { number_of_fragments: 0 },
              description: { fragment_size: 200, number_of_fragments: 2 },
              'title.turkish': { number_of_fragments: 0 },
              'description.turkish': {
                fragment_size: 200,
                number_of_fragments: 2,
              },
            },
          },
        },
      });

      const hits = result.hits.hits;
      const total =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total?.value || 0;

      return {
        data: hits.map((hit: any) => ({
          ...hit._source,
          _id: hit._id,
          _score: hit._score,
          _index: hit._index,
          _highlights: hit.highlight || {},
        })),
        meta: {
          total,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(total / params.limit),
          took: result.took,
        },
        facets: {
          categories:
            (result.aggregations?.categories as any)?.buckets?.map(
              (b: any) => ({
                key: b.key,
                count: b.doc_count,
              }),
            ) || [],
          priceRanges:
            (result.aggregations?.price_ranges as any)?.buckets?.map(
              (b: any) => ({
                key: b.key,
                count: b.doc_count,
              }),
            ) || [],
          statuses:
            (result.aggregations?.statuses as any)?.buckets?.map(
              (b: any) => ({
                key: b.key,
                count: b.doc_count,
              }),
            ) || [],
        },
      };
    } catch (error: any) {
      this.logger.error(`Search failed: ${error.message}`);
      return {
        data: [],
        meta: {
          total: 0,
          page: params.page,
          limit: params.limit,
          totalPages: 0,
          took: 0,
        },
        facets: { categories: [], priceRanges: [], statuses: [] },
      };
    }
  }

  async suggest(prefix: string): Promise<{ suggestions: string[] }> {
    if (!prefix || prefix.trim().length < 1) {
      return { suggestions: [] };
    }

    try {
      const result = await this.elasticsearchService.search({
        index: `${this.INDICES.auctions},${this.INDICES.products}`,
        body: {
          size: 0,
          suggest: {
            title_suggest: {
              prefix: prefix.trim(),
              completion: {
                field: 'suggest',
                size: 10,
                fuzzy: {
                  fuzziness: 'AUTO',
                  prefix_length: 2,
                },
                skip_duplicates: true,
              },
            },
          },
        },
      });

      const suggestions =
        (result.suggest?.title_suggest as any)?.[0]?.options?.map(
          (opt: any) => opt.text,
        ) || [];

      return { suggestions: [...new Set(suggestions)].slice(0, 10) };
    } catch (error: any) {
      this.logger.error(`Suggest failed: ${error.message}`);
      return { suggestions: [] };
    }
  }

  async indexAuction(auction: any): Promise<{ indexed: boolean }> {
    const doc = {
      id: auction.id,
      title: auction.title,
      description: auction.description || '',
      type: auction.type,
      status: auction.status,
      currentPrice: auction.currentPrice
        ? Number(auction.currentPrice)
        : Number(auction.startPrice),
      startPrice: Number(auction.startPrice),
      startDate: auction.startDate,
      endDate: auction.actualEndDate || auction.endDate,
      categoryName: auction.categoryName || '',
      sellerName: auction.sellerName || '',
      bidCount: auction.bidCount || 0,
      imageUrl: auction.coverImageUrl || '',
      currency: auction.currency || 'TRY',
      suggest: {
        input: this.generateSuggestions(auction.title),
        weight: auction.bidCount ? Math.min(auction.bidCount + 1, 100) : 1,
      },
      indexedAt: new Date().toISOString(),
    };

    try {
      await this.elasticsearchService.index({
        index: this.INDICES.auctions,
        id: auction.id,
        body: doc,
      });

      this.logger.debug(`Auction indexed: ${auction.id} - ${auction.title}`);
      return { indexed: true };
    } catch (error: any) {
      this.logger.error(`Failed to index auction ${auction.id}: ${error.message}`);
      return { indexed: false };
    }
  }

  async indexProduct(product: any): Promise<{ indexed: boolean }> {
    const doc = {
      id: product.id,
      title: product.title,
      description: product.shortDescription || product.descriptionHtml || '',
      condition: product.condition,
      categoryName: product.categoryName || '',
      estimateLow: product.estimateLow ? Number(product.estimateLow) : null,
      estimateHigh: product.estimateHigh ? Number(product.estimateHigh) : null,
      currentPrice: product.estimateLow ? Number(product.estimateLow) : 0,
      sellerName: product.sellerName || '',
      imageUrl: product.imageUrl || '',
      artistName: product.artistName || '',
      suggest: {
        input: this.generateSuggestions(product.title),
        weight: 1,
      },
      indexedAt: new Date().toISOString(),
    };

    try {
      await this.elasticsearchService.index({
        index: this.INDICES.products,
        id: product.id,
        body: doc,
      });

      this.logger.debug(`Product indexed: ${product.id} - ${product.title}`);
      return { indexed: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to index product ${product.id}: ${error.message}`,
      );
      return { indexed: false };
    }
  }

  async removeFromIndex(
    index: string,
    id: string,
  ): Promise<{ removed: boolean }> {
    const indexName =
      this.INDICES[index as keyof typeof this.INDICES] || index;

    try {
      await this.elasticsearchService.delete({
        index: indexName,
        id,
      });
      this.logger.debug(`Document removed from index: ${indexName}/${id}`);
      return { removed: true };
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        this.logger.debug(`Document not found in index: ${indexName}/${id}`);
        return { removed: false };
      }
      this.logger.error(
        `Failed to remove document from ${indexName}/${id}: ${error.message}`,
      );
      return { removed: false };
    }
  }

  async reindex(
    index?: string,
  ): Promise<{ message: string; auctions?: { indexed: number; total: number }; products?: { indexed: number; total: number } }> {
    this.logger.log(`Starting full reindex${index ? ` for: ${index}` : ''}`);

    const result: any = { message: 'Reindex completed' };

    if (!index || index === 'auctions') {
      result.auctions = await this.reindexAuctions();
    }

    if (!index || index === 'products') {
      result.products = await this.reindexProducts();
    }

    return result;
  }

  private async reindexAuctions(): Promise<{ indexed: number; total: number }> {
    const auctions = await this.prisma.auction.findMany({
      include: {
        creator: {
          select: {
            profile: {
              select: { displayName: true, firstName: true, lastName: true },
            },
          },
        },
        lots: {
          include: {
            product: {
              include: {
                category: { select: { name: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    const total = auctions.length;
    let indexed = 0;

    // Use bulk API for performance
    if (total === 0) {
      return { indexed: 0, total: 0 };
    }

    const bulkBody: any[] = [];

    for (const auction of auctions) {
      const sellerProfile = auction.creator?.profile;
      const sellerName =
        sellerProfile?.displayName ||
        (sellerProfile?.firstName && sellerProfile?.lastName
          ? `${sellerProfile.firstName} ${sellerProfile.lastName}`
          : '');

      const categoryName =
        auction.lots?.[0]?.product?.category?.name || '';

      const doc = {
        id: auction.id,
        title: auction.title,
        description: auction.description || '',
        type: auction.type,
        status: auction.status,
        currentPrice: auction.currentPrice
          ? Number(auction.currentPrice)
          : Number(auction.startPrice),
        startPrice: Number(auction.startPrice),
        startDate: auction.startDate.toISOString(),
        endDate: (auction.actualEndDate || auction.endDate).toISOString(),
        categoryName,
        sellerName,
        bidCount: auction.bidCount,
        imageUrl: auction.coverImageUrl || '',
        currency: auction.currency,
        suggest: {
          input: this.generateSuggestions(auction.title),
          weight: auction.bidCount
            ? Math.min(auction.bidCount + 1, 100)
            : 1,
        },
        indexedAt: new Date().toISOString(),
      };

      bulkBody.push({
        index: { _index: this.INDICES.auctions, _id: auction.id },
      });
      bulkBody.push(doc);
    }

    try {
      const bulkResponse = await this.elasticsearchService.bulk({
        body: bulkBody,
        refresh: true,
      });

      if (bulkResponse.errors) {
        const errorItems = bulkResponse.items.filter(
          (item: any) => item.index?.error,
        );
        this.logger.error(
          `Bulk index auctions had ${errorItems.length} errors`,
        );
        indexed = total - errorItems.length;
      } else {
        indexed = total;
      }

      this.logger.log(`Auctions reindexed: ${indexed}/${total}`);
    } catch (error: any) {
      this.logger.error(`Bulk index auctions failed: ${error.message}`);
    }

    return { indexed, total };
  }

  private async reindexProducts(): Promise<{
    indexed: number;
    total: number;
  }> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        seller: {
          select: {
            profile: {
              select: { displayName: true, firstName: true, lastName: true },
            },
          },
        },
        artist: { select: { name: true } },
        media: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    const total = products.length;
    let indexed = 0;

    if (total === 0) {
      return { indexed: 0, total: 0 };
    }

    const bulkBody: any[] = [];

    for (const product of products) {
      const sellerProfile = product.seller?.profile;
      const sellerName =
        sellerProfile?.displayName ||
        (sellerProfile?.firstName && sellerProfile?.lastName
          ? `${sellerProfile.firstName} ${sellerProfile.lastName}`
          : '');

      const doc = {
        id: product.id,
        title: product.title,
        description: product.shortDescription || product.descriptionHtml || '',
        condition: product.condition,
        categoryName: product.category?.name || '',
        estimateLow: product.estimateLow
          ? Number(product.estimateLow)
          : null,
        estimateHigh: product.estimateHigh
          ? Number(product.estimateHigh)
          : null,
        currentPrice: product.estimateLow ? Number(product.estimateLow) : 0,
        sellerName,
        imageUrl: product.media?.[0]?.url || '',
        artistName: product.artist?.name || '',
        suggest: {
          input: this.generateSuggestions(product.title),
          weight: 1,
        },
        indexedAt: new Date().toISOString(),
      };

      bulkBody.push({
        index: { _index: this.INDICES.products, _id: product.id },
      });
      bulkBody.push(doc);
    }

    try {
      const bulkResponse = await this.elasticsearchService.bulk({
        body: bulkBody,
        refresh: true,
      });

      if (bulkResponse.errors) {
        const errorItems = bulkResponse.items.filter(
          (item: any) => item.index?.error,
        );
        this.logger.error(
          `Bulk index products had ${errorItems.length} errors`,
        );
        indexed = total - errorItems.length;
      } else {
        indexed = total;
      }

      this.logger.log(`Products reindexed: ${indexed}/${total}`);
    } catch (error: any) {
      this.logger.error(`Bulk index products failed: ${error.message}`);
    }

    return { indexed, total };
  }

  /**
   * Legacy method maintained for backward compatibility.
   */
  async indexDocument(
    index: string,
    id: string,
    document: any,
  ): Promise<{ indexed: boolean }> {
    const indexName =
      this.INDICES[index as keyof typeof this.INDICES] || index;

    try {
      await this.elasticsearchService.index({
        index: indexName,
        id,
        body: {
          ...document,
          suggest: document.title
            ? {
                input: this.generateSuggestions(document.title),
                weight: 1,
              }
            : undefined,
          indexedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Document indexed: ${indexName}/${id}`);
      return { indexed: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to index document ${indexName}/${id}: ${error.message}`,
      );
      return { indexed: false };
    }
  }

  private buildSort(sort?: string): any[] {
    switch (sort) {
      case 'price_asc':
        return [{ currentPrice: { order: 'asc', missing: '_last' } }];
      case 'price_desc':
        return [{ currentPrice: { order: 'desc', missing: '_last' } }];
      case 'ending_soon':
        return [{ endDate: { order: 'asc', missing: '_last' } }];
      case 'newest':
        return [{ startDate: { order: 'desc', missing: '_last' } }];
      case 'most_bids':
        return [{ bidCount: { order: 'desc', missing: '_last' } }];
      case 'relevance':
      default:
        return [{ _score: 'desc' }];
    }
  }

  private generateSuggestions(title: string): string[] {
    if (!title) return [];

    const suggestions: string[] = [title];
    const words = title.split(/\s+/).filter((w) => w.length > 2);

    // Add each word as a suggestion for prefix matching
    for (const word of words) {
      if (!suggestions.includes(word)) {
        suggestions.push(word);
      }
    }

    // Add 2-word and 3-word combinations
    for (let i = 0; i < words.length - 1; i++) {
      const twoWords = `${words[i]} ${words[i + 1]}`;
      if (!suggestions.includes(twoWords)) {
        suggestions.push(twoWords);
      }
    }

    return suggestions.slice(0, 15);
  }

  private async ensureIndices() {
    for (const [name, indexName] of Object.entries(this.INDICES)) {
      try {
        const exists = await this.elasticsearchService.indices.exists({
          index: indexName,
        });
        if (!exists) {
          await this.createIndex(indexName, name);
          this.logger.log(`Index created: ${indexName}`);
        } else {
          this.logger.log(`Index already exists: ${indexName}`);
        }
      } catch (error: any) {
        this.logger.warn(
          `Could not check/create index ${indexName}: ${error.message}`,
        );
      }
    }
  }

  private async createIndex(indexName: string, type: string) {
    const baseSettings = {
      number_of_shards: 1,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          turkish_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: [
              'lowercase',
              'turkish_asciifold',
              'turkish_stop',
              'turkish_stemmer',
            ],
          },
          turkish_search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'turkish_asciifold', 'turkish_stop'],
          },
        },
        filter: {
          turkish_stop: {
            type: 'stop',
            stopwords: '_turkish_',
          },
          turkish_stemmer: {
            type: 'stemmer',
            language: 'turkish',
          },
          turkish_asciifold: {
            type: 'asciifolding',
            preserve_original: true,
          },
        },
      },
    };

    const auctionMappings = {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: {
            keyword: { type: 'keyword' },
            turkish: {
              type: 'text',
              analyzer: 'turkish_analyzer',
            },
          },
        },
        description: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: {
            turkish: {
              type: 'text',
              analyzer: 'turkish_analyzer',
            },
          },
        },
        type: { type: 'keyword' },
        status: { type: 'keyword' },
        currentPrice: { type: 'float' },
        startPrice: { type: 'float' },
        startDate: { type: 'date' },
        endDate: { type: 'date' },
        categoryName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        sellerName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        bidCount: { type: 'integer' },
        imageUrl: { type: 'keyword', index: false },
        currency: { type: 'keyword' },
        suggest: {
          type: 'completion',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
        },
        indexedAt: { type: 'date' },
      },
    };

    const productMappings = {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: {
            keyword: { type: 'keyword' },
            turkish: {
              type: 'text',
              analyzer: 'turkish_analyzer',
            },
          },
        },
        description: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: {
            turkish: {
              type: 'text',
              analyzer: 'turkish_analyzer',
            },
          },
        },
        condition: { type: 'keyword' },
        categoryName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        estimateLow: { type: 'float' },
        estimateHigh: { type: 'float' },
        currentPrice: { type: 'float' },
        sellerName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        imageUrl: { type: 'keyword', index: false },
        artistName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        suggest: {
          type: 'completion',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
        },
        indexedAt: { type: 'date' },
      },
    };

    const mappings =
      type === 'auctions' ? auctionMappings : productMappings;

    await this.elasticsearchService.indices.create({
      index: indexName,
      body: {
        settings: baseSettings,
        mappings,
      },
    });
  }
}
