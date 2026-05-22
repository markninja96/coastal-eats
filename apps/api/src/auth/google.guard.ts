import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { googleOAuthConfigured } from './google.strategy';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  override canActivate(context: ExecutionContext) {
    if (!googleOAuthConfigured) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    return super.canActivate(context as ExecutionContext);
  }

  override getAuthenticateOptions() {
    return {};
  }

  override handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const request = context.switchToHttp().getRequest<{ originalUrl?: string }>();
      this.logger.warn(
        `Google OAuth callback failed for ${request.originalUrl ?? '/api/auth/google/callback'}: err=${String(err)} info=${String(info)}`,
      );
    }

    return super.handleRequest(err, user, info, context);
  }
}
