import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';

export interface BulkUploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  private readonly REQUIRED_COLUMNS = ['title', 'description', 'condition', 'categorySlug'];

  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async processBulkUpload(file: Express.Multer.File, sellerId: string): Promise<BulkUploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(
      `Processing bulk upload: ${file.originalname} (${file.size} bytes) for seller: ${sellerId}`,
    );

    let rows: Record<string, any>[];

    const filename = file.originalname.toLowerCase();
    if (filename.endsWith('.csv')) {
      rows = this.parseCsv(file.buffer);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      rows = this.parseExcel(file.buffer);
    } else {
      throw new BadRequestException(
        'Unsupported file format. Please upload CSV or Excel (.xlsx, .xls) files.',
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded file contains no data rows');
    }

    return this.processRows(rows, sellerId);
  }

  async processFile(file: Express.Multer.File): Promise<BulkUploadResult> {
    return this.processBulkUpload(file, '');
  }

  private parseCsv(buffer: Buffer): Record<string, any>[] {
    try {
      return parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to parse CSV: ${error.message || 'Invalid CSV format'}`,
      );
    }
  }

  private parseExcel(buffer: Buffer): Record<string, any>[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No sheets found in the workbook');
      }
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet);
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to parse Excel file: ${error.message || 'Invalid Excel format'}`,
      );
    }
  }

  private async processRows(
    rows: Record<string, any>[],
    sellerId: string,
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const validationErrors = this.validateRow(row);
      if (validationErrors.length > 0) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: validationErrors.join('; '),
        });
        continue;
      }

      try {
        const categorySlug = String(row['categorySlug'] || row['category_slug'] || row['category']).trim();

        let category;
        try {
          category = await this.categoriesService.findBySlug(categorySlug);
        } catch {
          result.failed++;
          result.errors.push({
            row: rowNum,
            message: `Category with slug "${categorySlug}" not found`,
          });
          continue;
        }

        const conditionValue = String(row['condition']).trim().toUpperCase();
        const validConditions = ['NEW', 'USED', 'RESTORED'];
        const condition = validConditions.includes(conditionValue) ? conditionValue : 'USED';

        const tags = row['tags']
          ? String(row['tags']).split(',').map((t: string) => t.trim()).filter(Boolean)
          : undefined;

        const attributes: { key: string; value: string }[] = [];
        const attributePrefix = 'attr_';
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith(attributePrefix) && value) {
            attributes.push({
              key: key.substring(attributePrefix.length),
              value: String(value).trim(),
            });
          }
        }

        await this.productsService.create(
          {
            title: String(row['title']).trim(),
            descriptionHtml: String(row['description']).trim(),
            shortDescription: row['shortDescription']
              ? String(row['shortDescription']).trim()
              : undefined,
            categoryId: category.id,
            condition,
            provenanceText: row['provenance'] ? String(row['provenance']).trim() : undefined,
            estimateLow: row['estimateLow'] ? Number(row['estimateLow']) : undefined,
            estimateHigh: row['estimateHigh'] ? Number(row['estimateHigh']) : undefined,
            artistId: row['artistId'] ? String(row['artistId']).trim() : undefined,
            tags,
            attributes: attributes.length > 0 ? attributes : undefined,
          },
          sellerId,
        );

        result.successful++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: error.message || 'Unknown error processing row',
        });
      }
    }

    this.logger.log(
      `Bulk upload complete: ${result.successful} success, ${result.failed} errors out of ${result.total} rows`,
    );

    return result;
  }

  private validateRow(row: Record<string, any>): string[] {
    const errors: string[] = [];

    for (const col of this.REQUIRED_COLUMNS) {
      const value = row[col] || row[col.replace(/([A-Z])/g, '_$1').toLowerCase()];
      if (!value || String(value).trim() === '') {
        errors.push(`Missing required column: ${col}`);
      }
    }

    if (row['estimateLow'] && isNaN(Number(row['estimateLow']))) {
      errors.push('estimateLow must be a valid number');
    }
    if (row['estimateHigh'] && isNaN(Number(row['estimateHigh']))) {
      errors.push('estimateHigh must be a valid number');
    }

    return errors;
  }
}
