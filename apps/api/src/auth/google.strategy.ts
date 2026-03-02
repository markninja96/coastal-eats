import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

export const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL,
);

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly authService: AuthService) {
    const clientID = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || '';

    if (!googleOAuthConfigured) {
      super({
        clientID: '',
        clientSecret: '',
        callbackURL: '',
        scope: [],
        state: true,
      });
      this.logger.warn('Google OAuth is not configured; skipping strategy.');
      return;
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      state: true,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return this.authService.handleGoogleProfile(profile);
  }
}
