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

  private summarizeRequest(request: {
    originalUrl?: string;
    sessionID?: string;
    session?: unknown;
    headers?: {
      cookie?: string;
      host?: string;
      'x-forwarded-proto'?: string;
      'x-forwarded-host'?: string;
      'user-agent'?: string;
    };
  }): string {
    const cookies = request.headers?.cookie ?? '';
    return [
      `url=${request.originalUrl ?? 'unknown'}`,
      `sessionID=${request.sessionID ?? 'none'}`,
      `hasSession=${Boolean(request.session)}`,
      `hasConnectSidCookie=${cookies.includes('connect.sid=')}`,
      `hasAnyCookie=${cookies.length > 0}`,
      `host=${request.headers?.host ?? 'unknown'}`,
      `xfProto=${request.headers?.['x-forwarded-proto'] ?? 'unknown'}`,
      `xfHost=${request.headers?.['x-forwarded-host'] ?? 'unknown'}`,
      `ua=${request.headers?.['user-agent'] ?? 'unknown'}`,
    ].join(' ');
  }

  private serializeForLog(value: unknown): string {
    if (value instanceof Error) {
      return JSON.stringify({
        name: value.name,
        message: value.message,
        stack: value.stack,
      });
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  override canActivate(context: ExecutionContext) {
    if (!googleOAuthConfigured) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    const request = context.switchToHttp().getRequest<{
      originalUrl?: string;
      sessionID?: string;
      session?: unknown;
      headers?: {
        cookie?: string;
        host?: string;
        'x-forwarded-proto'?: string;
        'x-forwarded-host'?: string;
        'user-agent'?: string;
      };
    }>();
    this.logger.log(`Google OAuth request ${this.summarizeRequest(request)}`);

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
        `Google OAuth callback failed for ${request.originalUrl ?? '/api/auth/google/callback'}: err=${this.serializeForLog(err)} info=${this.serializeForLog(info)}`,
      );
    }

    return super.handleRequest(err, user, info, context);
  }
}
