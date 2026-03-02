import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchWrapperService } from '../elasticsearch/elasticsearch.service';

const PRODUCTS_INDEX = 'muzayede-products';
const AUCTIONS_INDEX = 'muzayede-auctions';

// ─── Interfaces ─────────────────────────────────────────────────────

export interface SearchParams {
  query?: string;
  type?: string;        // 'products' | 'auctions' | undefined (both)
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

export interface SearchResult {
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
    conditions: { key: string; count: number }[];
    priceRanges: { key: string; count: number }[];
    statuses: { key: string; count: number }[];
    auctionTypes: { key: string; count: number }[];
  };
}

export interface SuggestionResult {
  suggestions: Array<{
    text: string;
    score: number;
    index: string;
  }>;
}

export interface AutocompleteResult {
  items: Array<{
    id: string;
    title: string;
    type: string;
    imageUrl?: string;
    price?: number;
    category?: string;
  }>;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly esService: ElasticsearchWrapperService,
  ) {}

  // ─── Full-text Search ─────────────────────────────────────────────

  async search(params: SearchParams): Promise<SearchResult> {
    this.logger.log(
      `Search: q="${params.query || ''}", type=${params.type || 'all'}, page=${params.page}`,
    );

    const indices = this.resolveIndices(params.type);

    if (!indices) {
      return this.emptyResult(params);
    }

    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search with field boosting
    if (params.query && params.query.trim()) {
      must.push({
        multi_match: {
          query: params.query.trim(),
          fields: [
            'title^3',
            'title.autocomplete^1',
            'description^1.5',
            'categoryName^2',
            'sellerName^1',
            'artistName^2',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
          minimum_should_match: '70%',
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

    // Status filter (auctions)
    if (params.status) {
      filter.push({ term: { status: params.status } });
    }

    // Condition filter (products)
    if (params.condition) {
      filter.push({ term: { condition: params.condition } });
    }

    // Auction type filter
    if (params.auctionType) {
      filter.push({ term: { type: params.auctionType } });
    }

    const sort = this.buildSort(params.sort);
    const from = (params.page - 1) * params.limit;

    const queryBody: any = {
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
        conditions: {
          terms: { field: 'condition', size: 10 },
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
          terms: { field: 'status', size: 10 },
        },
        auction_types: {
          terms: { field: 'type', size: 10 },
        },
      },
      highlight: {
        pre_tags: ['<em>'],
        post_tags: ['</em>'],
        fields: {
          title: { number_of_fragments: 0 },
          description: { fragment_size: 200, number_of_fragments: 2 },
          artistName: { number_of_fragments: 0 },
        },
      },
    };

    try {
      const result = await this.esService.search(indices, queryBody);

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
          categories: this.extractBuckets(result.aggregations?.categories),
          conditions: this.extractBuckets(result.aggregations?.conditions),
          priceRanges: this.extractBuckets(result.aggregations?.price_ranges),
          statuses: this.extractBuckets(result.aggregations?.statuses),
          auctionTypes: this.extractBuckets(result.aggregations?.auction_types),
        },
      };
    } catch (error: any) {
      this.logger.error(`Search failed: ${error.message}`);
      return this.emptyResult(params);
    }
  }

  // ─── Suggestions (Completion Suggester) ──────────────────────────

  /**
   * Returns completion suggestions based on a prefix, using the ES
   * completion suggester on the "suggest" field.
   */
  async suggestions(prefix: string): Promise<SuggestionResult> {
    if (!prefix || prefix.trim().length < 1) {
      return { suggestions: [] };
    }

    const queryBody = {
      size: 0,
      suggest: {
        product_suggestions: {
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
    };

    try {
      const result = await this.esService.search(
        [PRODUCTS_INDEX, AUCTIONS_INDEX],
        queryBody,
      );

      const options =
        (result.suggest?.product_suggestions as any)?.[0]?.options || [];

      const seen = new Set<string>();
      const suggestions: SuggestionResult['suggestions'] = [];

      for (const opt of options) {
        const text = opt.text?.toLowerCase();
        if (text && !seen.has(text)) {
          seen.add(text);
          suggestions.push({
            text: opt.text,
            score: opt._score || 0,
            index: opt._index || '',
          });
        }
      }

      return { suggestions: suggestions.slice(0, 10) };
    } catch (error: any) {
      this.logger.error(`Suggestions failed: ${error.message}`);
      return { suggestions: [] };
    }
  }

  // ─── Autocomplete (Search-as-you-type) ───────────────────────────

  /**
   * Returns structured autocomplete results with document data,
   * using the title.autocomplete field with edge ngrams.
   */
  async autocomplete(prefix: string): Promise<AutocompleteResult> {
    if (!prefix || prefix.trim().length < 2) {
      return { items: [] };
    }

    const queryBody = {
      size: 8,
      _source: [
        'id',
        'title',
        'imageUrl',
        'currentPrice',
        'categoryName',
        'condition',
        'type',
        'status',
      ],
      query: {
        bool: {
          should: [
            {
              match: {
                'title.autocomplete': {
                  query: prefix.trim(),
                  operator: 'and',
                },
              },
            },
            {
              match_phrase_prefix: {
                title: {
                  query: prefix.trim(),
                  max_expansions: 10,
                },
              },
            },
            {
              match: {
                'artistName': {
                  query: prefix.trim(),
                  fuzziness: 'AUTO',
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      highlight: {
        pre_tags: ['<em>'],
        post_tags: ['</em>'],
        fields: {
          'title.autocomplete': { number_of_fragments: 0 },
        },
      },
    };

    try {
      const result = await this.esService.search(
        [PRODUCTS_INDEX, AUCTIONS_INDEX],
        queryBody,
      );

      const hits = result.hits.hits || [];

      const items: AutocompleteResult['items'] = hits.map((hit: any) => {
        const source = hit._source;
        const isAuction = hit._index === AUCTIONS_INDEX;

        return {
          id: source.id,
          title: source.title,
          type: isAuction ? 'auction' : 'product',
          imageUrl: source.imageUrl || undefined,
          price: source.currentPrice || undefined,
          category: source.categoryName || undefined,
        };
      });

      return { items };
    } catch (error: any) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return { items: [] };
    }
  }

  // ─── Legacy compatibility methods ─────────────────────────────────

  /**
   * Legacy suggest method preserved for backward compatibility with
   * the old controller endpoint.
   */
  async suggest(prefix: string): Promise<{ suggestions: string[] }> {
    const result = await this.suggestions(prefix);
    return {
      suggestions: result.suggestions.map((s) => s.text),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private resolveIndices(type?: string): string | string[] | null {
    switch (type) {
      case 'products':
        return PRODUCTS_INDEX;
      case 'auctions':
        return AUCTIONS_INDEX;
      case undefined:
      case null:
      case '':
        return [PRODUCTS_INDEX, AUCTIONS_INDEX];
      default:
        this.logger.warn(`Unknown search type: ${type}`);
        return null;
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
        return [{ createdAt: { order: 'desc', missing: '_last' } }];
      case 'date':
        return [{ createdAt: { order: 'desc', missing: '_last' } }];
      case 'most_bids':
        return [{ bidCount: { order: 'desc', missing: '_last' } }];
      case 'relevance':
      default:
        return [{ _score: 'desc' }];
    }
  }

  private extractBuckets(
    aggregation: any,
  ): Array<{ key: string; count: number }> {
    if (!aggregation?.buckets) return [];
    return aggregation.buckets.map((b: any) => ({
      key: b.key,
      count: b.doc_count,
    }));
  }

  private emptyResult(params: SearchParams): SearchResult {
    return {
      data: [],
      meta: {
        total: 0,
        page: params.page,
        limit: params.limit,
        totalPages: 0,
        took: 0,
      },
      facets: {
        categories: [],
        conditions: [],
        priceRanges: [],
        statuses: [],
        auctionTypes: [],
      },
    };
  }
}
