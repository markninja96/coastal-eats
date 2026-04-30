import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Patch,
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
import { passwordSchema } from './auth.schemas';
import { GoogleAuthGuard } from './google.guard';
import { JwtAuthGuard } from './jwt.guard';

const loginSchema = z.object({
  email: z.email(),
  password: passwordSchema,
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: passwordSchema,
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2),
});

const updatePreferencesSchema = z.object({
  homeTimezone: z.string().trim().min(2),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
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
        issues: z.treeifyError(parsed.error),
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

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: { body: unknown; user: { id: string } }) {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid profile payload',
        issues: z.treeifyError(parsed.error),
      });
    }
    return this.authService.updateProfile(req.user.id, parsed.data);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(@Req() req: { body: unknown; user: { id: string } }) {
    const parsed = updatePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid preferences payload',
        issues: z.treeifyError(parsed.error),
      });
    }
    return this.authService.updatePreferences(req.user.id, parsed.data);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(@Req() req: { body: unknown; user: { id: string } }) {
    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid password payload',
        issues: z.treeifyError(parsed.error),
      });
    }
    return this.authService.updatePassword(req.user.id, parsed.data);
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
        issues: z.treeifyError(parsed.error),
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
