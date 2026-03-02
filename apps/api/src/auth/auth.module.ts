import { Module } from '@nestjs/common';
import ms, { type StringValue } from 'ms';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DbModule } from '../db/db.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google.guard';
import { GoogleStrategy, googleOAuthConfigured } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from './users.service';

@Module({
  imports: [
    DbModule,
    PassportModule,
    JwtModule.register({
      secret: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET must be set');
        }
        return secret;
      })(),
      signOptions: {
        expiresIn: (() => {
          const raw = process.env.JWT_EXPIRES_IN || '1d';
          const numeric = Number(raw);
          if (!Number.isNaN(numeric) && raw.trim() !== '') {
            return numeric;
          }
          const parsed = ms(raw as StringValue);
          if (!parsed && raw !== '0') {
            throw new Error('JWT_EXPIRES_IN must be a valid duration');
          }
          return raw as StringValue;
        })(),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    JwtStrategy,
    GoogleAuthGuard,
    ...(googleOAuthConfigured ? [GoogleStrategy] : []),
  ],
  exports: [AuthService],
})
export class AuthModule {}
