import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import {
  AUTH_COOKIE_MAX_AGE_MS,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from './auth.cookies';
import { GoogleAuthGuard } from './google.guard';
import { JwtAuthGuard } from './jwt.guard';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .refine(
      (password) => Buffer.byteLength(password, 'utf8') <= 72,
      'password must be at most 72 bytes when UTF-8 encoded',
    ),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Req() req: { body: unknown },
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid login payload',
        issues: parsed.error.flatten(),
      });
    }

    const user = await this.authService.validateUser(
      parsed.data.email,
      parsed.data.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.authService.login(user.id);
    this.setAuthCookie(res, session.token);
    return { user: session.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @Req()
    req: {
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    },
  ) {
    return req.user;
  }

  @Post('register')
  async register(
    @Req() req: { body: unknown },
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid registration payload',
        issues: parsed.error.flatten(),
      });
    }

    const session = await this.authService.register(
      parsed.data.name,
      parsed.data.email,
      parsed.data.password,
    );
    this.setAuthCookie(res, session.token);
    return { user: session.user };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: { user: { id: string } },
    @Res() res: Response,
  ) {
    const session = await this.authService.login(req.user.id);
    this.setAuthCookie(res, session.token);
    return res.redirect(this.getFrontendRedirectUrl());
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS);
    return;
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE_NAME, token, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
  }

  private getFrontendRedirectUrl() {
    const frontendUrl =
      process.env.WEB_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:4200';
    const normalizedBase = frontendUrl.replace(/\/$/, '');
    return `${normalizedBase}/`;
  }
}
