import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cdnBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

  async uploadProductMedia(
    productId: string,
    files: Express.Multer.File[],
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existingMediaCount = await this.prisma.productMedia.count({
      where: { productId },
    });

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.originalname).toLowerCase();
      const mediaId = uuidv4();
      const key = `products/${productId}/${mediaId}${ext}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'max-age=31536000',
          Metadata: {
            productId,
            originalName: file.originalname,
          },
        }),
      );

      const url = `${this.cdnBaseUrl}/${key}`;
      const isFirst = existingMediaCount === 0 && i === 0;
      const mediaType = this.determineMediaType(file.mimetype);

      const media = await this.prisma.productMedia.create({
        data: {
          productId,
          type: mediaType as any,
          url,
          sortOrder: existingMediaCount + i,
          isPrimary: isFirst,
          fileSize: file.size,
        },
      });

      results.push(media);
    }

    this.logger.log(`Uploaded ${results.length} media files for product ${productId}`);
    return results;
  }

  async upload(productId: string, file: Express.Multer.File, type?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existingMediaCount = await this.prisma.productMedia.count({
      where: { productId },
    });

    const ext = path.extname(file.originalname).toLowerCase();
    const mediaId = uuidv4();
    const key = `products/${productId}/${mediaId}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'max-age=31536000',
        Metadata: {
          productId,
          originalName: file.originalname,
        },
      }),
    );

    const url = `${this.cdnBaseUrl}/${key}`;
    const isPrimary = existingMediaCount === 0;
    const mediaType = type || this.determineMediaType(file.mimetype);

    const media = await this.prisma.productMedia.create({
      data: {
        productId,
        type: mediaType as any,
        url,
        sortOrder: existingMediaCount,
        isPrimary,
        fileSize: file.size,
      },
    });

    this.logger.log(`Uploaded media ${media.id} for product ${productId}`);
    return media;
  }

  async deleteMedia(mediaId: string) {
    const media = await this.prisma.productMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    const s3Key = this.extractS3Key(media.url);
    if (s3Key) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
          }),
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete S3 object ${s3Key}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    await this.prisma.productMedia.delete({ where: { id: mediaId } });

    if (media.isPrimary) {
      const nextMedia = await this.prisma.productMedia.findFirst({
        where: { productId: media.productId },
        orderBy: { sortOrder: 'asc' },
      });

      if (nextMedia) {
        await this.prisma.productMedia.update({
          where: { id: nextMedia.id },
          data: { isPrimary: true },
        });
      }
    }

    this.logger.log(`Deleted media ${mediaId}`);
  }

  async reorderMedia(productId: string, mediaIds: string[]) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existingMedia = await this.prisma.productMedia.findMany({
      where: { productId },
      select: { id: true },
    });

    const existingIds = new Set(existingMedia.map((m) => m.id));
    for (const id of mediaIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Media ID ${id} does not belong to product ${productId}`);
      }
    }

    await this.prisma.$transaction(
      mediaIds.map((id, index) =>
        this.prisma.productMedia.update({
          where: { id },
          data: {
            sortOrder: index,
            isPrimary: index === 0,
          },
        }),
      ),
    );

    const updated = await this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    this.logger.log(`Reordered ${mediaIds.length} media for product ${productId}`);
    return updated;
  }

  async getPresignedUploadUrl(
    productId: string,
    filename: string,
    contentType: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const ext = path.extname(filename).toLowerCase();
    const mediaKey = `products/${productId}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: mediaKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      mediaKey,
      publicUrl: `${this.cdnBaseUrl}/${mediaKey}`,
    };
  }

  private determineMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    return 'IMAGE';
  }

  private extractS3Key(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
    } catch {
      return null;
    }
  }
}
