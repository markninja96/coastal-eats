import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google.guard';
import { JwtAuthGuard } from './jwt.guard';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Req() req: { body: unknown }) {
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

    return this.authService.login(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: { user: { sub: string } }) {
    return this.authService.profile(req.user.sub);
  }

  @Post('register')
  async register(@Req() req: { body: unknown }) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid registration payload',
        issues: parsed.error.flatten(),
      });
    }

    return this.authService.register(
      parsed.data.name,
      parsed.data.email,
      parsed.data.password,
    );
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: { user: { id: string } }) {
    return this.authService.login(req.user.id);
  }
}
