import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_COOKIE_NAME } from './auth.cookies';
import { UsersService } from './users.service';

const cookieExtractor = (req: Request | undefined) => {
  const header = req?.headers?.cookie;
  if (!header) return null;
  const tokenCookie = header
    .split(';')
    .map((entry: string) => entry.trim())
    .find((entry: string) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!tokenCookie) return null;
  const rawValue = tokenCookie.slice(AUTH_COOKIE_NAME.length + 1);
  return rawValue ? decodeURIComponent(rawValue) : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET must be set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.usersService.toSafeUser(user);
  }
}
