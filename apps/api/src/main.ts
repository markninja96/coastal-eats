/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import passport from 'passport';
import { createClient } from 'redis';
import { COOKIE_SECURITY_DEFAULTS } from './auth/auth.cookies';
import type { AuthUser } from './auth/auth.types';
import { UsersService } from './auth/users.service';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  app.set('trust proxy', true);
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://coastal-eats-iac4.onrender.com',
      'https://app.njihiaplayground.space',
    ],
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET must be set');
  }
  const redisUrl = process.env.REDIS_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  let redisClient: ReturnType<typeof createClient> | undefined;
  const sessionOptions: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { ...COOKIE_SECURITY_DEFAULTS },
  };

  if (redisUrl) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (error) => {
      Logger.error(`Redis session client error: ${String(error)}`);
    });
    await redisClient.connect();
    sessionOptions.store = new RedisStore({ client: redisClient });
    Logger.log('Redis session store initialized');
  } else if (isProduction) {
    throw new Error('REDIS_URL must be set in production for OAuth sessions');
  }

  // This session is primarily for short-lived Passport/OAuth handoff state.
  // API auth is persisted in the coastal-eats.auth cookie, so this remains a
  // browser-session cookie (no maxAge).
  app.use(session(sessionOptions));
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
  const server = await app.listen(port);
  server.on('close', async () => {
    if (!redisClient) {
      return;
    }
    try {
      await redisClient.quit();
    } catch (error) {
      Logger.error(`Failed to disconnect Redis client: ${String(error)}`);
    }
  });
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
