import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user?.passwordHash) return null;
    if (!compareSync(password, user.passwordHash)) return null;
    return user;
  }

  async login(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.usersService.toSafeUser(user),
    };
  }

  async profile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return this.usersService.toSafeUser(user);
  }

  async handleGoogleProfile(profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Google account missing email');
    }

    const name = profile.displayName || email;
    const googleId = profile.id;

    const user = await this.usersService.findOrCreateGoogleUser({
      email,
      name,
      googleId,
    });

    return user;
  }
}
