import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Lightweight JWT Guard for microservices that don't depend on passport.
 * Verifies HS256 JWT tokens using Node.js crypto (no external deps needed).
 * Attaches decoded payload to request.user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'muzayede-secret-key',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = this.verifyToken(token);
      request.user = payload;
      return true;
    } catch (error: any) {
      this.logger.warn(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return null;

    return token;
  }

  private verifyToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature (HS256)
    const expectedSignature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload: JwtPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    );

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    if (!payload.sub || !payload.email) {
      throw new Error('Invalid token: missing required claims');
    }

    return payload;
  }
}
