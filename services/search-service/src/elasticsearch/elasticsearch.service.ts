import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

/**
 * Index mapping definitions for the Muzayede platform.
 * Each index has its own settings and mappings optimized for Turkish-language
 * full-text search, faceted filtering, and completion suggestions.
 */
const INDEX_DEFINITIONS: Record<
  string,
  { settings: Record<string, any>; mappings: Record<string, any> }
> = {
  'muzayede-products': {
    settings: {
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
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'turkish_asciifold', 'edge_ngram_filter'],
          },
          autocomplete_search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'turkish_asciifold'],
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
          edge_ngram_filter: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 15,
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: {
            keyword: { type: 'keyword' },
            autocomplete: {
              type: 'text',
              analyzer: 'autocomplete_analyzer',
              search_analyzer: 'autocomplete_search_analyzer',
            },
          },
        },
        slug: { type: 'keyword' },
        description: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
        },
        condition: { type: 'keyword' },
        categoryId: { type: 'keyword' },
        categoryName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        categorySlug: { type: 'keyword' },
        estimateLow: { type: 'float' },
        estimateHigh: { type: 'float' },
        currentPrice: { type: 'float' },
        sellerId: { type: 'keyword' },
        sellerName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        artistId: { type: 'keyword' },
        artistName: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: { keyword: { type: 'keyword' } },
        },
        imageUrl: { type: 'keyword', index: false },
        tags: { type: 'keyword' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        suggest: {
          type: 'completion',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
        },
        indexedAt: { type: 'date' },
      },
    },
  },
  'muzayede-auctions': {
    settings: {
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
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'turkish_asciifold', 'edge_ngram_filter'],
          },
          autocomplete_search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'turkish_asciifold'],
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
          edge_ngram_filter: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 15,
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
          fields: {
            keyword: { type: 'keyword' },
            autocomplete: {
              type: 'text',
              analyzer: 'autocomplete_analyzer',
              search_analyzer: 'autocomplete_search_analyzer',
            },
          },
        },
        slug: { type: 'keyword' },
        description: {
          type: 'text',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
        },
        type: { type: 'keyword' },
        status: { type: 'keyword' },
        currentPrice: { type: 'float' },
        startPrice: { type: 'float' },
        reservePrice: { type: 'float' },
        buyNowPrice: { type: 'float' },
        buyNowEnabled: { type: 'boolean' },
        minIncrement: { type: 'float' },
        currency: { type: 'keyword' },
        startDate: { type: 'date' },
        endDate: { type: 'date' },
        categoryName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        categorySlug: { type: 'keyword' },
        createdBy: { type: 'keyword' },
        sellerName: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        },
        auctionHouseId: { type: 'keyword' },
        bidCount: { type: 'integer' },
        viewCount: { type: 'integer' },
        imageUrl: { type: 'keyword', index: false },
        isLiveStreaming: { type: 'boolean' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        suggest: {
          type: 'completion',
          analyzer: 'turkish_analyzer',
          search_analyzer: 'turkish_search_analyzer',
        },
        indexedAt: { type: 'date' },
      },
    },
  },
};

@Injectable()
export class ElasticsearchWrapperService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchWrapperService.name);
  private client: Client;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const node = this.configService.get<string>(
      'ELASTICSEARCH_URL',
      'http://localhost:9200',
    );
    const username = this.configService.get<string>(
      'ELASTICSEARCH_USERNAME',
      '',
    );
    const password = this.configService.get<string>(
      'ELASTICSEARCH_PASSWORD',
      '',
    );

    const clientOptions: any = {
      node,
      maxRetries: 5,
      requestTimeout: 30000,
      sniffOnStart: false,
    };

    if (username && password) {
      clientOptions.auth = { username, password };
    }

    this.client = new Client(clientOptions);

    try {
      const info = await this.client.info();
      this.logger.log(
        `Connected to Elasticsearch cluster: ${info.cluster_name} (v${info.version.number})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to connect to Elasticsearch at ${node}: ${error.message}`,
      );
    }

    await this.ensureIndices();
  }

  /**
   * Returns the raw ES client for advanced operations.
   */
  getClient(): Client {
    return this.client;
  }

  // ─── Index Management ──────────────────────────────────────────────

  async indexExists(indexName: string): Promise<boolean> {
    try {
      return await this.client.indices.exists({ index: indexName });
    } catch (error: any) {
      this.logger.error(
        `Failed to check index existence for ${indexName}: ${error.message}`,
      );
      return false;
    }
  }

  async createIndex(indexName: string): Promise<boolean> {
    const definition = INDEX_DEFINITIONS[indexName];
    if (!definition) {
      this.logger.error(
        `No index definition found for "${indexName}". Known indices: ${Object.keys(INDEX_DEFINITIONS).join(', ')}`,
      );
      return false;
    }

    try {
      await this.client.indices.create({
        index: indexName,
        body: {
          settings: definition.settings,
          mappings: definition.mappings,
        },
      });
      this.logger.log(`Index created: ${indexName}`);
      return true;
    } catch (error: any) {
      if (
        error.meta?.body?.error?.type === 'resource_already_exists_exception'
      ) {
        this.logger.debug(`Index already exists: ${indexName}`);
        return true;
      }
      this.logger.error(
        `Failed to create index ${indexName}: ${error.message}`,
      );
      return false;
    }
  }

  async deleteIndex(indexName: string): Promise<boolean> {
    try {
      await this.client.indices.delete({ index: indexName });
      this.logger.log(`Index deleted: ${indexName}`);
      return true;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        this.logger.debug(`Index not found for deletion: ${indexName}`);
        return true;
      }
      this.logger.error(
        `Failed to delete index ${indexName}: ${error.message}`,
      );
      return false;
    }
  }

  async recreateIndex(indexName: string): Promise<boolean> {
    await this.deleteIndex(indexName);
    return this.createIndex(indexName);
  }

  // ─── Document Operations ──────────────────────────────────────────

  async indexDocument(
    indexName: string,
    id: string,
    document: Record<string, any>,
  ): Promise<boolean> {
    try {
      await this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: 'wait_for',
      });
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to index document ${indexName}/${id}: ${error.message}`,
      );
      return false;
    }
  }

  async deleteDocument(indexName: string, id: string): Promise<boolean> {
    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for',
      });
      return true;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        this.logger.debug(`Document not found: ${indexName}/${id}`);
        return true;
      }
      this.logger.error(
        `Failed to delete document ${indexName}/${id}: ${error.message}`,
      );
      return false;
    }
  }

  async bulkIndex(
    operations: Array<{
      index: string;
      id: string;
      document: Record<string, any>;
    }>,
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    if (operations.length === 0) {
      return { successful: 0, failed: 0, errors: [] };
    }

    const body: any[] = [];
    for (const op of operations) {
      body.push({ index: { _index: op.index, _id: op.id } });
      body.push(op.document);
    }

    try {
      const result = await this.client.bulk({ body, refresh: true });

      const errors: any[] = [];
      let failed = 0;

      if (result.errors) {
        for (const item of result.items) {
          if (item.index?.error) {
            failed++;
            errors.push({
              id: item.index._id,
              error: item.index.error,
            });
          }
        }
      }

      const successful = operations.length - failed;

      if (failed > 0) {
        this.logger.warn(
          `Bulk index: ${successful} successful, ${failed} failed`,
        );
      } else {
        this.logger.log(
          `Bulk index: ${successful} documents indexed successfully`,
        );
      }

      return { successful, failed, errors };
    } catch (error: any) {
      this.logger.error(`Bulk index failed: ${error.message}`);
      return {
        successful: 0,
        failed: operations.length,
        errors: [{ error: error.message }],
      };
    }
  }

  async bulkDelete(
    operations: Array<{ index: string; id: string }>,
  ): Promise<{ successful: number; failed: number }> {
    if (operations.length === 0) {
      return { successful: 0, failed: 0 };
    }

    const body: any[] = [];
    for (const op of operations) {
      body.push({ delete: { _index: op.index, _id: op.id } });
    }

    try {
      const result = await this.client.bulk({ body, refresh: true });

      let failed = 0;
      if (result.errors) {
        for (const item of result.items) {
          if (item.delete?.error) {
            failed++;
          }
        }
      }

      return { successful: operations.length - failed, failed };
    } catch (error: any) {
      this.logger.error(`Bulk delete failed: ${error.message}`);
      return { successful: 0, failed: operations.length };
    }
  }

  // ─── Search Operations ────────────────────────────────────────────

  async search(
    indexName: string | string[],
    query: Record<string, any>,
  ): Promise<any> {
    const index = Array.isArray(indexName) ? indexName.join(',') : indexName;

    try {
      const result = await this.client.search({
        index,
        body: query,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Search failed on ${index}: ${error.message}`);
      throw error;
    }
  }

  async count(
    indexName: string,
    query?: Record<string, any>,
  ): Promise<number> {
    try {
      const result = await this.client.count({
        index: indexName,
        body: query ? { query } : undefined,
      });
      return result.count;
    } catch (error: any) {
      this.logger.error(`Count failed on ${indexName}: ${error.message}`);
      return 0;
    }
  }

  // ─── Cluster Health ───────────────────────────────────────────────

  async getClusterHealth(): Promise<Record<string, any> | null> {
    try {
      return await this.client.cluster.health();
    } catch (error: any) {
      this.logger.error(`Failed to get cluster health: ${error.message}`);
      return null;
    }
  }

  async getIndexStats(
    indexName: string,
  ): Promise<Record<string, any> | null> {
    try {
      return await this.client.indices.stats({ index: indexName });
    } catch (error: any) {
      this.logger.error(
        `Failed to get index stats for ${indexName}: ${error.message}`,
      );
      return null;
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private async ensureIndices(): Promise<void> {
    for (const indexName of Object.keys(INDEX_DEFINITIONS)) {
      try {
        const exists = await this.indexExists(indexName);
        if (!exists) {
          await this.createIndex(indexName);
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
}
