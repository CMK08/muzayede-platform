import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto, SortBy } from './dto/query-users.dto';
import { BlacklistUserDto } from './dto/blacklist-user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScoreService: TrustScoreService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      kycStatus,
      sortBy = SortBy.CREATED_AT,
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    // Search filter: case-insensitive contains on email, firstName, lastName
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          profile: {
            firstName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          profile: {
            lastName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Role filter
    if (role) {
      where.role = role as Prisma.EnumUserRoleFilter['equals'];
    }

    // Active status filter
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // KYC status filter
    if (kycStatus) {
      where.kycStatus = kycStatus as Prisma.EnumKycStatusFilter['equals'];
    }

    // Build orderBy
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sortBy === SortBy.TRUST_SCORE) {
      orderBy.trustScore = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          profile: true,
        },
        omit: {
          passwordHash: true,
          twoFactorSecret: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string) {
    this.logger.log(`Finding user: ${id}`);

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        sellerProfile: true,
        badges: true,
      },
      omit: {
        passwordHash: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Log access in audit log (fire-and-forget)
    this.prisma.auditLog
      .create({
        data: {
          userId: id,
          action: 'user.profile_viewed',
          entityType: 'User',
          entityId: id,
          metadata: { viewedAt: new Date().toISOString() },
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to create audit log for profile view: ${err.message}`);
      });

    return user;
  }

  async update(id: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating user: ${id}`);

    // Verify user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Validate unique email constraint if email is being changed
    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new ConflictException(`Email ${dto.email} is already in use`);
      }
    }

    // Validate unique phone constraint if phone is being changed
    if (dto.phone && dto.phone !== existingUser.phone) {
      const phoneExists = await this.prisma.user.findFirst({
        where: { phone: dto.phone, id: { not: id } },
      });
      if (phoneExists) {
        throw new ConflictException(`Phone number ${dto.phone} is already in use`);
      }
    }

    // Separate user-level fields from profile-level fields
    const userUpdateData: Prisma.UserUpdateInput = {};
    if (dto.email) userUpdateData.email = dto.email;
    if (dto.phone !== undefined) userUpdateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) userUpdateData.avatarUrl = dto.avatarUrl;
    if (dto.language) userUpdateData.language = dto.language;
    if (dto.theme) userUpdateData.theme = dto.theme as 'LIGHT' | 'DARK' | 'SYSTEM';

    // Profile-level fields
    const profileData: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      bio?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      interests?: string[];
      dateOfBirth?: Date;
    } = {};

    if (dto.firstName) profileData.firstName = dto.firstName;
    if (dto.lastName) profileData.lastName = dto.lastName;
    if (dto.displayName !== undefined) profileData.displayName = dto.displayName;
    if (dto.bio !== undefined) profileData.bio = dto.bio;
    if (dto.address !== undefined) profileData.address = dto.address;
    if (dto.city !== undefined) profileData.city = dto.city;
    if (dto.country !== undefined) profileData.country = dto.country;
    if (dto.postalCode !== undefined) profileData.postalCode = dto.postalCode;
    if (dto.interests) profileData.interests = dto.interests;
    if (dto.dateOfBirth) profileData.dateOfBirth = new Date(dto.dateOfBirth);

    // Build profile upsert if there are profile fields to update
    const hasProfileFields = Object.keys(profileData).length > 0;
    if (hasProfileFields) {
      // For upsert, create needs firstName and lastName
      const createFirstName = profileData.firstName || existingUser.profile?.firstName || 'Kullanici';
      const createLastName = profileData.lastName || existingUser.profile?.lastName || 'Adi';

      userUpdateData.profile = {
        upsert: {
          create: {
            firstName: createFirstName,
            lastName: createLastName,
            ...profileData,
          },
          update: profileData,
        },
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: userUpdateData,
      include: {
        profile: true,
        sellerProfile: true,
        badges: true,
      },
      omit: {
        passwordHash: true,
        twoFactorSecret: true,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId: id,
        action: 'user.profile_updated',
        entityType: 'User',
        entityId: id,
        metadata: {
          updatedFields: Object.keys(dto).filter(
            (key) => dto[key as keyof UpdateProfileDto] !== undefined,
          ),
        },
      },
    });

    return updatedUser;
  }

  async softDelete(id: string): Promise<void> {
    this.logger.log(`Soft-deleting user: ${id}`);

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const timestamp = Date.now();

    // Set isActive = false and anonymize email (KVKK compliance - no hard delete)
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `${user.email}_deleted_${timestamp}`,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId: id,
        action: 'user.soft_deleted',
        entityType: 'User',
        entityId: id,
        metadata: {
          originalEmail: user.email,
          deletedAt: new Date().toISOString(),
        },
      },
    });
  }

  async getTrustScore(userId: string) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.trustScoreService.calculateTrustScore(userId);
  }

  async blacklist(userId: string, dto: BlacklistUserDto) {
    this.logger.warn(`Blacklisting user: ${userId}, reason: ${dto.reason}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if already blacklisted
    const existingBlacklist = await this.prisma.userBlacklist.findFirst({
      where: { userId },
    });
    if (existingBlacklist) {
      throw new ConflictException(`User ${userId} is already blacklisted`);
    }

    // Use a transaction to ensure atomicity
    await this.prisma.$transaction([
      // Create blacklist entry
      this.prisma.userBlacklist.create({
        data: {
          userId,
          reason: dto.reason,
          blockedBy: dto.blockedBy,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      }),
      // Deactivate user
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      // Create audit log
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'user.blacklisted',
          entityType: 'User',
          entityId: userId,
          metadata: {
            reason: dto.reason,
            blockedBy: dto.blockedBy,
            expiresAt: dto.expiresAt || null,
          },
        },
      }),
    ]);

    return { message: `User ${userId} has been blacklisted`, reason: dto.reason };
  }

  async removeFromBlacklist(userId: string) {
    this.logger.log(`Removing user from blacklist: ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const blacklistEntry = await this.prisma.userBlacklist.findFirst({
      where: { userId },
    });
    if (!blacklistEntry) {
      throw new NotFoundException(`User ${userId} is not blacklisted`);
    }

    await this.prisma.$transaction([
      // Delete the blacklist entry
      this.prisma.userBlacklist.delete({
        where: { id: blacklistEntry.id },
      }),
      // Reactivate user
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      }),
      // Create audit log
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'user.blacklist_removed',
          entityType: 'User',
          entityId: userId,
          metadata: {
            previousReason: blacklistEntry.reason,
            removedAt: new Date().toISOString(),
          },
        },
      }),
    ]);

    return { message: `User ${userId} removed from blacklist` };
  }
}
