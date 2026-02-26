import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KycUploadDto } from './dto/kyc-upload.dto';
import { KycReviewDto } from './dto/kyc-review.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload a KYC document for the authenticated user.
   */
  async uploadDocument(userId: string, dto: KycUploadDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, kycStatus: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus === 'APPROVED') {
      throw new BadRequestException('KYC is already approved. No further documents needed.');
    }

    // Check if a document of this type already exists and is pending
    const existingDoc = await this.prisma.kycDocument.findFirst({
      where: {
        userId,
        documentType: dto.documentType,
        status: 'PENDING',
      },
    });

    if (existingDoc) {
      throw new BadRequestException(
        `A ${dto.documentType} document is already pending review. Please wait for the review to complete.`,
      );
    }

    const document = await this.prisma.kycDocument.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentUrl: dto.documentUrl,
        status: 'PENDING',
      },
    });

    // Update user's KYC status to PENDING if it was NOT_SUBMITTED
    if (user.kycStatus === 'NOT_SUBMITTED' || user.kycStatus === 'REJECTED') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'PENDING' },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'kyc.document_uploaded',
        entityType: 'KycDocument',
        entityId: document.id,
        metadata: { documentType: dto.documentType },
      },
    });

    this.logger.log(`KYC document uploaded by user ${userId}: ${dto.documentType}`);

    return {
      id: document.id,
      documentType: document.documentType,
      status: document.status,
      createdAt: document.createdAt,
      message: 'Document uploaded successfully. It will be reviewed shortly.',
    };
  }

  /**
   * Get the KYC status and documents for the authenticated user.
   */
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycStatus: true,
        kycDocuments: {
          select: {
            id: true,
            documentType: true,
            documentUrl: true,
            status: true,
            reviewNote: true,
            reviewedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      kycStatus: user.kycStatus,
      documents: user.kycDocuments,
    };
  }

  /**
   * Admin review of a KYC document (approve or reject).
   */
  async reviewDocument(documentId: string, adminUserId: string, dto: KycReviewDto) {
    const document = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: { id: true, kycStatus: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('KYC document not found');
    }

    if (document.status !== 'PENDING') {
      throw new BadRequestException('This document has already been reviewed');
    }

    // Verify the reviewer is an admin (extra safety check)
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only admins can review KYC documents');
    }

    const kycStatus = dto.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const updatedDocument = await this.prisma.$transaction(async (tx) => {
      // Update the document status
      const doc = await tx.kycDocument.update({
        where: { id: documentId },
        data: {
          status: kycStatus as any,
          reviewNote: dto.reviewNote || null,
          reviewedAt: new Date(),
        },
      });

      // If approved, check if all required documents are approved
      if (dto.status === 'APPROVED') {
        // Check if all user's pending documents are now reviewed
        const pendingDocs = await tx.kycDocument.count({
          where: {
            userId: document.userId,
            status: 'PENDING',
          },
        });

        if (pendingDocs === 0) {
          // Check if there are any rejected documents
          const rejectedDocs = await tx.kycDocument.count({
            where: {
              userId: document.userId,
              status: 'REJECTED',
            },
          });

          // Update user's overall KYC status
          await tx.user.update({
            where: { id: document.userId },
            data: {
              kycStatus: rejectedDocs > 0 ? 'REJECTED' : 'APPROVED',
            },
          });
        }
      } else {
        // Rejected: set user KYC status to REJECTED
        await tx.user.update({
          where: { id: document.userId },
          data: { kycStatus: 'REJECTED' },
        });
      }

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: `kyc.document_${dto.status.toLowerCase()}`,
          entityType: 'KycDocument',
          entityId: documentId,
          metadata: {
            targetUserId: document.userId,
            status: dto.status,
            reviewNote: dto.reviewNote || null,
          },
        },
      });

      return doc;
    });

    this.logger.log(
      `KYC document ${documentId} ${dto.status.toLowerCase()} by admin ${adminUserId}`,
    );

    return {
      id: updatedDocument.id,
      documentType: updatedDocument.documentType,
      status: updatedDocument.status,
      reviewNote: updatedDocument.reviewNote,
      reviewedAt: updatedDocument.reviewedAt,
      message: `Document ${dto.status.toLowerCase()} successfully`,
    };
  }
}
