import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { AuthUser } from '../auth/auth.types';
import { SkillsService } from './skills.service';

const createSchema = z.object({
  name: z.string().min(2),
});

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async list() {
    return this.skillsService.list();
  }

  @Post()
  async create(@Req() req: { user: AuthUser }, @Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.skillsService.create(req.user, parsed.data);
  }
}
