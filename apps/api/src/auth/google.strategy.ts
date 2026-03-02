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

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: googleOAuthConfigured ? googleClientId : '',
      clientSecret: googleOAuthConfigured ? googleClientSecret : '',
      callbackURL: googleOAuthConfigured ? googleCallbackUrl : '',
      scope: googleOAuthConfigured ? ['email', 'profile'] : [],
      state: true,
    });

    if (!googleOAuthConfigured) {
      Logger.warn(
        'Google OAuth is not configured; skipping strategy.',
        GoogleStrategy.name,
      );
    }
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return this.authService.handleGoogleProfile(profile);
  }
}
