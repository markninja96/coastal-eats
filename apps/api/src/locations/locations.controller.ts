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
import { LocationsService } from './locations.service';

const createSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2).optional(),
  region: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  timezone: z.string().min(2),
});

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async list(@Req() req: { user: AuthUser }) {
    return this.locationsService.list(req.user);
  }

  @Post()
  async create(@Req() req: { user: AuthUser }, @Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.locationsService.create(req.user, parsed.data);
  }
}
