/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import passport from 'passport';
import { COOKIE_SECURITY_DEFAULTS } from './auth/auth.cookies';
import type { AuthUser } from './auth/auth.types';
import { UsersService } from './auth/users.service';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.enableCors({
    origin: ['http://localhost:4200', 'https://coastal-eats-iac4.onrender.com'],
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET must be set');
  }
  // Intentionally keep express-session on the default MemoryStore because this
  // session is only used for short-lived Passport/OAuth handoff state. API auth
  // is persisted via the coastal-eats.auth cookie rather than server
  // sessions, so we intentionally keep this as a browser-session cookie (no maxAge).
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { ...COOKIE_SECURITY_DEFAULTS },
    }),
  );
  const usersService = app.get(UsersService);
  passport.serializeUser((user: unknown, done) =>
    done(null, (user as AuthUser).id),
  );
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await usersService.findById(id);
      if (!user) {
        return done(new Error('User not found'));
      }
      return done(null, usersService.toSafeUser(user));
    } catch (error) {
      return done(error as Error);
    }
  });
  app.use(passport.initialize());
  app.use(passport.session());
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
