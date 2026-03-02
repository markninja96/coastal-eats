import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || '';

export const googleOAuthConfigured = Boolean(
  googleClientId && googleClientSecret && googleCallbackUrl,
);

const googleConfig = googleOAuthConfigured
  ? {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrl,
      scope: ['email', 'profile'],
      state: true,
    }
  : {
      clientID: '',
      clientSecret: '',
      callbackURL: '',
      scope: [],
      state: true,
    };

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly authService: AuthService) {
    super(googleConfig);

    if (!googleOAuthConfigured) {
      this.logger.warn('Google OAuth is not configured; skipping strategy.');
    }
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return this.authService.handleGoogleProfile(profile);
  }
}
