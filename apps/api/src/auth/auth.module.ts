import { Module } from '@nestjs/common';
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
        expiresIn: (process.env.JWT_EXPIRES_IN ||
          '1d') as unknown as import('ms').StringValue,
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
