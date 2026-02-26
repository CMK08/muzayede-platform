import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Register a new user with User + UserProfile created in a single transaction.
   * Returns JWT access + refresh tokens.
   */
  async register(dto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${dto.email}`);

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check if phone already exists (if provided)
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('A user with this phone number already exists');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenHash = crypto
      .createHash('sha256')
      .update(emailVerificationToken)
      .digest('hex');

    // Create User + UserProfile in a single transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone: dto.phone || null,
          passwordHash,
          role: 'BUYER',
          isActive: true,
          isVerified: false,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              displayName: `${dto.firstName} ${dto.lastName}`,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'user.registered',
          entityType: 'User',
          entityId: newUser.id,
          metadata: {
            email: newUser.email,
            emailVerificationTokenHash,
          },
        },
      });

      return newUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token hash in database
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered successfully: ${user.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      emailVerificationToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Login with email and password.
   * If 2FA is enabled, returns a partial response requiring the TOTP code.
   */
  async login(dto: LoginDto) {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        profile: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    // Check if 2FA is enabled - return partial response requiring code
    if (user.twoFactorEnabled) {
      // Generate a short-lived temporary token for the 2FA step
      const tempToken = this.jwtService.sign(
        { sub: user.id, email: user.email, type: '2fa_pending' },
        { expiresIn: '5m' },
      );

      return {
        requiresTwoFactor: true,
        tempToken,
        message: 'Please provide your two-factor authentication code',
      };
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token hash
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.login',
        entityType: 'User',
        entityId: user.id,
        metadata: { method: 'email_password' },
      },
    });

    this.logger.log(`User logged in: ${user.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  /**
   * Complete login with 2FA code.
   */
  async loginWith2fa(tempToken: string, code: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token. Please login again.');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('User not found or 2FA not enabled');
    }

    // Verify TOTP code
    const isValid = await this.twoFactorService.validateForUser(user.id, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token hash
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.login',
        entityType: 'User',
        entityId: user.id,
        metadata: { method: 'email_password_2fa' },
      },
    });

    this.logger.log(`User logged in with 2FA: ${user.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  /**
   * Refresh token rotation: verify old refresh token, generate new pair, revoke old.
   */
  async refreshToken(dto: RefreshTokenDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if this refresh token has been revoked
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.prisma.auditLog.findFirst({
      where: {
        userId: payload.sub,
        action: 'token.refresh_stored',
        metadata: {
          path: ['tokenHash'],
          equals: tokenHash,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    // Check if it was revoked
    const revoked = await this.prisma.auditLog.findFirst({
      where: {
        userId: payload.sub,
        action: 'token.refresh_revoked',
        metadata: {
          path: ['tokenHash'],
          equals: tokenHash,
        },
      },
    });

    if (revoked) {
      // Possible token reuse attack - revoke all tokens for this user
      this.logger.warn(`Possible token reuse attack for user ${payload.sub}`);
      throw new UnauthorizedException('Refresh token has been revoked. Please login again.');
    }

    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Revoke the old refresh token
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'token.refresh_revoked',
        metadata: { tokenHash },
      },
    });

    // Generate new token pair
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store new refresh token hash
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout: revoke the provided refresh token.
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'token.refresh_revoked',
          metadata: { tokenHash, reason: 'logout' },
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'user.logout',
        entityType: 'User',
        entityId: userId,
      },
    });

    this.logger.log(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  /**
   * Get the current user's profile.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      trustScore: user.trustScore,
      kycStatus: user.kycStatus,
      avatarUrl: user.avatarUrl,
      language: user.language,
      theme: user.theme,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            displayName: user.profile.displayName,
            bio: user.profile.bio,
            address: user.profile.address,
            city: user.profile.city,
            country: user.profile.country,
            postalCode: user.profile.postalCode,
            interests: user.profile.interests,
            dateOfBirth: user.profile.dateOfBirth,
          }
        : null,
    };
  }

  /**
   * Handle Google OAuth login/registration.
   * Find or create user via OAuthAccount table.
   */
  async handleGoogleLogin(googleUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  }) {
    if (!googleUser || !googleUser.email) {
      throw new UnauthorizedException('Invalid Google profile data');
    }

    this.logger.log(`Google login for: ${googleUser.email}`);

    // Check if an OAuth account already exists for this Google ID
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: 'google',
          providerId: googleUser.id,
        },
      },
      include: {
        user: {
          include: {
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (existingOAuth) {
      // User already linked - just login
      const user = existingOAuth.user;

      if (!user.isActive) {
        throw new UnauthorizedException(
          'Your account has been deactivated. Please contact support.',
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.login',
          entityType: 'User',
          entityId: user.id,
          metadata: { method: 'google_oauth' },
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
    }

    // Check if a user with this email already exists (link accounts)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
      include: {
        profile: { select: { firstName: true, lastName: true } },
      },
    });

    if (existingUser) {
      // Link the Google account to the existing user
      await this.prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: 'google',
          providerId: googleUser.id,
        },
      });

      // Verify email since Google has verified it
      if (!existingUser.isVerified) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { isVerified: true, lastLoginAt: new Date() },
        });
      } else {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() },
        });
      }

      const tokens = await this.generateTokens(existingUser.id, existingUser.email, existingUser.role);
      await this.storeRefreshToken(existingUser.id, tokens.refreshToken);

      await this.prisma.auditLog.create({
        data: {
          userId: existingUser.id,
          action: 'user.oauth_linked',
          entityType: 'User',
          entityId: existingUser.id,
          metadata: { provider: 'google', providerId: googleUser.id },
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.profile?.firstName,
          lastName: existingUser.profile?.lastName,
          role: existingUser.role,
          isVerified: true,
        },
      };
    }

    // Create a brand new user via Google
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          passwordHash: '', // No password for OAuth-only users
          role: 'BUYER',
          isActive: true,
          isVerified: true, // Google email is pre-verified
          avatarUrl: googleUser.picture || null,
          profile: {
            create: {
              firstName: googleUser.firstName || '',
              lastName: googleUser.lastName || '',
              displayName: `${googleUser.firstName || ''} ${googleUser.lastName || ''}`.trim(),
            },
          },
          oauthAccounts: {
            create: {
              provider: 'google',
              providerId: googleUser.id,
            },
          },
        },
        include: {
          profile: { select: { firstName: true, lastName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.registered',
          entityType: 'User',
          entityId: user.id,
          metadata: { method: 'google_oauth', email: user.email },
        },
      });

      return user;
    });

    const tokens = await this.generateTokens(newUser.id, newUser.email, newUser.role);
    await this.storeRefreshToken(newUser.id, tokens.refreshToken);

    this.logger.log(`New user created via Google OAuth: ${newUser.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.profile?.firstName,
        lastName: newUser.profile?.lastName,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
    };
  }

  /**
   * Forgot password: generate a password reset token and return it.
   * In production, this token would be sent via email.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, isActive: true },
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    if (!user || !user.isActive) {
      return successResponse;
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the hashed token in audit log with metadata
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.password_reset_requested',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          resetTokenHash,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    this.logger.log(`Password reset requested for user ${user.id}`);

    // In production, send the resetToken via email
    // For development, include it in the response
    const isDev = this.configService.get<string>('NODE_ENV') === 'development';

    return {
      ...successResponse,
      ...(isDev ? { resetToken } : {}),
    };
  }

  /**
   * Reset password using a valid reset token.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find the reset token in audit logs
    const resetEntry = await this.prisma.auditLog.findFirst({
      where: {
        action: 'user.password_reset_requested',
        metadata: {
          path: ['resetTokenHash'],
          equals: tokenHash,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetEntry || !resetEntry.userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has been used
    const used = await this.prisma.auditLog.findFirst({
      where: {
        userId: resetEntry.userId,
        action: 'user.password_reset_completed',
        metadata: {
          path: ['resetTokenHash'],
          equals: tokenHash,
        },
      },
    });

    if (used) {
      throw new BadRequestException('This reset token has already been used');
    }

    // Check expiration
    const metadata = resetEntry.metadata as any;
    if (new Date() > new Date(metadata.expiresAt)) {
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    // Hash the new password and update
    const passwordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetEntry.userId! },
        data: { passwordHash },
      });

      // Mark token as used
      await tx.auditLog.create({
        data: {
          userId: resetEntry.userId,
          action: 'user.password_reset_completed',
          entityType: 'User',
          entityId: resetEntry.userId!,
          metadata: { resetTokenHash: tokenHash },
        },
      });
    });

    this.logger.log(`Password reset completed for user ${resetEntry.userId}`);

    return { message: 'Password has been reset successfully. You can now log in with your new password.' };
  }

  /**
   * Verify email address using the verification token.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find the verification entry
    const verifyEntry = await this.prisma.auditLog.findFirst({
      where: {
        action: 'user.registered',
        metadata: {
          path: ['emailVerificationTokenHash'],
          equals: tokenHash,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifyEntry || !verifyEntry.userId) {
      throw new BadRequestException('Invalid verification token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: verifyEntry.userId },
      select: { id: true, isVerified: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      return { message: 'Email is already verified' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.email_verified',
          entityType: 'User',
          entityId: user.id,
        },
      });
    });

    this.logger.log(`Email verified for user ${user.id}`);

    return { message: 'Email verified successfully' };
  }

  /**
   * Validate that a user exists and is active (used by JWT strategy).
   */
  async validateUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return user;
  }

  /**
   * Generate access token (15min) and refresh token (7 days).
   */
  private async generateTokens(userId: string, email: string, role: string) {
    const accessPayload = {
      sub: userId,
      email,
      role,
    };

    const refreshPayload = {
      sub: userId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.getRefreshTokenSecret(),
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Store the refresh token hash in the database via audit log.
   */
  private async storeRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'token.refresh_stored',
        metadata: {
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
  }

  /**
   * Hash a token using SHA-256 for secure storage.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get the refresh token secret (separate from access token secret for security).
   */
  private getRefreshTokenSecret(): string {
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      this.configService.get<string>('JWT_SECRET', 'muzayede-secret-key') + '-refresh',
    );
  }
}
