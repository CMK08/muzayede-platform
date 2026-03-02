import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'placeholder-not-configured';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder-not-configured';
    super({
      clientID,
      clientSecret,
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/api/v1/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
    if (clientID === 'placeholder-not-configured') {
      this.logger.warn('Google OAuth is not configured (GOOGLE_CLIENT_ID missing). Google login will not work.');
    }
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos } = profile;

    const user = {
      id: profile.id,
      email: emails?.[0]?.value,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      picture: photos?.[0]?.value,
    };

    done(null, user);
  }
}
