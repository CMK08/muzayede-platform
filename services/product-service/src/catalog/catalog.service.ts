import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cdnBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET', 'muzayede-media');
    this.cdnBaseUrl = this.configService.get<string>(
      'CDN_BASE_URL',
      `https://${this.bucketName}.s3.amazonaws.com`,
    );

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'eu-west-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async generateCatalog(auctionId: string): Promise<string> {
    this.logger.log(`Generating catalog PDF for auction: ${auctionId}`);

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lots: {
          orderBy: { lotNumber: 'asc' },
          include: {
            product: {
              include: {
                media: { orderBy: { sortOrder: 'asc' }, take: 1 },
                attributes: true,
                artist: { select: { name: true, nationality: true, birthYear: true, deathYear: true } },
                category: { select: { name: true } },
              },
            },
          },
        },
        creator: {
          select: {
            profile: { select: { firstName: true, lastName: true } },
            sellerProfile: { select: { storeName: true, companyName: true } },
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    const pdfBuffer = await this.buildPdf(auction);

    const pdfKey = `catalogs/${auctionId}/${uuidv4()}.pdf`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        CacheControl: 'max-age=86400',
        Metadata: { auctionId },
      }),
    );

    const pdfUrl = `${this.cdnBaseUrl}/${pdfKey}`;

    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { catalogPdfUrl: pdfUrl },
    });

    this.logger.log(`Catalog PDF generated and uploaded: ${pdfUrl}`);
    return pdfUrl;
  }

  private async buildPdf(auction: any): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `${auction.title} - Auction Catalog`,
          Author: 'Muzayede Platform',
          Subject: `Catalog for auction: ${auction.title}`,
        },
      });

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const auctionHouse =
        auction.creator?.sellerProfile?.storeName ||
        auction.creator?.sellerProfile?.companyName ||
        'Muzayede';
      const creatorName = auction.creator?.profile
        ? `${auction.creator.profile.firstName} ${auction.creator.profile.lastName}`
        : 'Muzayede Platform';

      // --- COVER PAGE ---
      doc.moveDown(6);
      doc.fontSize(36).font('Helvetica-Bold').text('MUZAYEDE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(auctionHouse, { align: 'center' });
      doc.moveDown(3);

      doc.moveTo(100, doc.y).lineTo(495, doc.y).lineWidth(2).stroke('#333333');
      doc.moveDown(1.5);

      doc.fontSize(22).font('Helvetica-Bold').text(auction.title, { align: 'center' });
      doc.moveDown(1);

      const startDate = new Date(auction.startDate).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const startTime = new Date(auction.startDate).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.fontSize(14).font('Helvetica').text(`${startDate} - ${startTime}`, { align: 'center' });
      doc.moveDown(0.5);

      if (auction.description) {
        doc.moveDown(1);
        doc.fontSize(11).font('Helvetica').text(auction.description, { align: 'center', width: 400 });
      }

      doc.moveDown(4);
      doc.moveTo(100, doc.y).lineTo(495, doc.y).lineWidth(1).stroke('#999999');
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica').text(`${auction.lots.length} lots`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').text(`Organized by: ${creatorName}`, { align: 'center' });

      // --- TABLE OF CONTENTS ---
      doc.addPage();
      doc.fontSize(20).font('Helvetica-Bold').text('Table of Contents', { align: 'center' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
      doc.moveDown(0.5);

      for (const lot of auction.lots) {
        const product = lot.product;
        const lotLine = `Lot ${lot.lotNumber}`;
        const titleText = product.title;
        const estimateText = this.formatEstimate(product.estimateLow, product.estimateHigh);

        doc.fontSize(10).font('Helvetica-Bold').text(lotLine, 50, doc.y, { continued: true });
        doc.font('Helvetica').text(`  ${titleText}`, { continued: true });
        if (estimateText) {
          doc.font('Helvetica').text(`  ${estimateText}`, { align: 'right' });
        } else {
          doc.text('');
        }
        doc.moveDown(0.3);

        if (doc.y > 730) {
          doc.addPage();
          doc.fontSize(20).font('Helvetica-Bold').text('Table of Contents (cont.)', { align: 'center' });
          doc.moveDown(1);
        }
      }

      // --- LOT PAGES ---
      for (const lot of auction.lots) {
        doc.addPage();
        const product = lot.product;

        // Lot header
        doc.fontSize(10).font('Helvetica').fillColor('#888888').text(`Lot ${lot.lotNumber}`, 50, 50);
        doc.fillColor('#000000');
        doc.moveDown(0.5);

        // Product title
        doc.fontSize(18).font('Helvetica-Bold').text(product.title);
        doc.moveDown(0.5);

        // Artist info
        if (product.artist) {
          let artistLine = product.artist.name;
          if (product.artist.nationality) {
            artistLine += ` (${product.artist.nationality}`;
            if (product.artist.birthYear) {
              artistLine += `, ${product.artist.birthYear}`;
              if (product.artist.deathYear) {
                artistLine += `-${product.artist.deathYear}`;
              }
            }
            artistLine += ')';
          }
          doc.fontSize(12).font('Helvetica-Oblique').text(artistLine);
          doc.moveDown(0.3);
        }

        // Category
        if (product.category) {
          doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`Category: ${product.category.name}`);
          doc.fillColor('#000000');
          doc.moveDown(0.5);
        }

        // Separator
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#cccccc');
        doc.moveDown(0.5);

        // Description
        if (product.descriptionHtml) {
          const plainText = this.stripHtml(product.descriptionHtml);
          doc.fontSize(11).font('Helvetica').text(plainText, { width: 495 });
          doc.moveDown(0.5);
        }

        if (product.shortDescription) {
          doc.fontSize(11).font('Helvetica').text(product.shortDescription, { width: 495 });
          doc.moveDown(0.5);
        }

        // Condition
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Bold').text('Condition: ', { continued: true });
        doc.font('Helvetica').text(this.formatCondition(product.condition));
        doc.moveDown(0.3);

        // Provenance
        if (product.provenanceText) {
          doc.fontSize(10).font('Helvetica-Bold').text('Provenance: ', { continued: true });
          doc.font('Helvetica').text(product.provenanceText);
          doc.moveDown(0.3);
        }

        // Attributes
        if (product.attributes && product.attributes.length > 0) {
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica-Bold').text('Details:');
          doc.moveDown(0.2);
          for (const attr of product.attributes) {
            doc.fontSize(10).font('Helvetica').text(`  ${attr.key}: ${attr.value}`);
          }
          doc.moveDown(0.3);
        }

        // Estimate
        const estimate = this.formatEstimate(product.estimateLow, product.estimateHigh);
        if (estimate) {
          doc.moveDown(0.5);
          doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#cccccc');
          doc.moveDown(0.3);
          doc.fontSize(12).font('Helvetica-Bold').text(`Estimate: ${estimate}`);
        }
      }

      // --- BACK PAGE: TERMS AND CONDITIONS ---
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').text('Terms and Conditions', { align: 'center' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
      doc.moveDown(1);

      const terms = [
        '1. All items are sold as described in the catalog. Buyers are responsible for inspecting items before bidding.',
        '2. The highest bidder acknowledged by the auctioneer shall be the buyer. In case of any dispute, the auctioneer has the final decision.',
        '3. A buyer\'s premium will be added to the hammer price. The applicable rate is stated in the auction listing.',
        '4. Payment is due within 7 business days of the auction conclusion. Accepted methods include credit card, bank transfer, and escrow.',
        '5. Items must be collected or shipping arranged within 14 business days of payment confirmation.',
        '6. The auction house reserves the right to withdraw any lot before or during the sale.',
        '7. All lots are sold with applicable VAT (KDV) at the current rate in Turkey.',
        '8. Estimates provided are for guidance only and are not guarantees of the final sale price.',
        '9. Any claims regarding purchased items must be raised within 30 days of delivery.',
        '10. These terms are governed by the laws of the Republic of Turkey.',
      ];

      for (const term of terms) {
        doc.fontSize(10).font('Helvetica').text(term, { width: 495 });
        doc.moveDown(0.5);
      }

      doc.moveDown(2);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#888888')
        .text(
          `This catalog was generated by Muzayede Platform on ${new Date().toLocaleDateString('tr-TR')}`,
          { align: 'center' },
        );
      doc.fillColor('#000000');

      doc.end();
    });
  }

  private formatEstimate(low: any, high: any): string {
    const formatNum = (n: any) => {
      if (!n) return null;
      const num = typeof n === 'object' && n.toNumber ? n.toNumber() : Number(n);
      if (isNaN(num)) return null;
      return num.toLocaleString('tr-TR');
    };

    const lowStr = formatNum(low);
    const highStr = formatNum(high);

    if (lowStr && highStr) return `${lowStr} - ${highStr} TRY`;
    if (lowStr) return `${lowStr}+ TRY`;
    if (highStr) return `Up to ${highStr} TRY`;
    return '';
  }

  private formatCondition(condition: string): string {
    const map: Record<string, string> = {
      NEW: 'New',
      USED: 'Used',
      RESTORED: 'Restored',
    };
    return map[condition] || condition;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
