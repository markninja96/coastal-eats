import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async validateUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user?.passwordHash) return null;
    try {
      const matches = await compare(password, user.passwordHash);
      if (!matches) return null;
      return user;
    } catch {
      return null;
    }
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
      token: this.jwtService.sign(payload),
      user: this.usersService.toSafeUser(user),
    };
  }

  async register(name: string, email: string, password: string) {
    const passwordHash = await hash(password, 10);
    const user = await this.usersService.createLocalUser({
      name,
      email,
      passwordHash,
    });
    return this.login(user.id);
  }

  async profile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return this.usersService.toSafeUser(user);
  }

  async updateProfile(userId: string, input: { name: string }) {
    const user = await this.usersService.updateProfile(userId, input);
    if (!user) throw new UnauthorizedException('User not found');
    return this.usersService.toSafeUser(user);
  }

  async updatePreferences(userId: string, input: { homeTimezone: string }) {
    const user = await this.usersService.updatePreferences(userId, input);
    if (!user) throw new UnauthorizedException('User not found');
    return this.usersService.toSafeUser(user);
  }

  async updatePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Password sign-in is not enabled for this account',
      );
    }
    const isCurrentValid = await compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await hash(input.newPassword, 10);
    const updatedUser = await this.usersService.updatePassword(userId, {
      passwordHash,
    });
    if (!updatedUser) {
      throw new UnauthorizedException('User not found');
    }
    return { success: true };
  }

  async handleGoogleProfile(profile: Profile) {
    const email = profile.emails?.find((entry) => {
      const verified = (
        entry as { verified?: boolean; verified_email?: boolean }
      ).verified;
      const verifiedEmail = (
        entry as { verified?: boolean; verified_email?: boolean }
      ).verified_email;
      return verified || verifiedEmail;
    })?.value;
    if (!email) {
      throw new UnauthorizedException('Google account missing verified email');
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
