import {
  BadRequestException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { googleOAuthConfigured } from './google.strategy';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override canActivate(context: ExecutionContext) {
    if (!googleOAuthConfigured) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    return super.canActivate(context as ExecutionContext);
  }

  override getAuthenticateOptions(_context: ExecutionContext) {
    return {};
  }
}
