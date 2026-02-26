// ---------------------------------------------------------------------------
// Auth API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, User } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
  preferredLanguage?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  requiresTwoFactor: boolean;
}

export interface OtpVerifyRequest {
  code: string;
  sessionToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export class AuthApi extends BaseApiClient {
  /**
   * Authenticate with email and password.
   * Returns user data and JWT tokens.
   */
  async login(payload: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/auth/login', payload);
  }

  /**
   * Register a new user account.
   */
  async register(payload: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/auth/register', payload);
  }

  /**
   * Verify OTP / 2FA code to complete login.
   */
  async verifyOtp(payload: OtpVerifyRequest): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/auth/otp/verify', payload);
  }

  /**
   * Request a password reset email.
   */
  async requestPasswordReset(
    payload: PasswordResetRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/password/reset', payload);
  }

  /**
   * Confirm a password reset with new password.
   */
  async confirmPasswordReset(
    payload: PasswordResetConfirmRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/password/reset/confirm', payload);
  }

  /**
   * Logout and invalidate the refresh token.
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/logout');
  }

  /**
   * Get the currently authenticated user.
   */
  async me(): Promise<ApiResponse<User>> {
    return this.get<User>('/auth/me');
  }

  /**
   * Resend email verification link.
   */
  async resendVerificationEmail(): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/email/resend-verification');
  }

  /**
   * Verify email with token from verification link.
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/email/verify', { token });
  }

  /**
   * Enable two-factor authentication.
   */
  async enableTwoFactor(): Promise<
    ApiResponse<{ qrCodeUrl: string; secret: string; backupCodes: string[] }>
  > {
    return this.post('/auth/2fa/enable');
  }

  /**
   * Disable two-factor authentication.
   */
  async disableTwoFactor(code: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/2fa/disable', { code });
  }
}
