import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ShiftsService } from './shifts.service';

type AuthUser = {
  id: string;
  role: 'admin' | 'manager' | 'staff';
};

const shiftInputSchema = z.object({
  locationId: z.string().uuid(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  requiredSkillId: z.string().uuid().nullable().optional(),
  headcount: z.number().int().positive(),
  notes: z.string().nullable().optional(),
});

const shiftUpdateSchema = shiftInputSchema.partial();

const listSchema = z.object({
  locationId: z.string().uuid().optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
});

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  async list(@Req() req: { user: AuthUser }, @Query() query: unknown) {
    const parsed = listSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.shiftsService.list(req.user, parsed.data);
  }

  @Post()
  async create(@Req() req: { user: AuthUser }, @Body() body: unknown) {
    const parsed = shiftInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.shiftsService.create(req.user, parsed.data);
  }

  @Patch(':id')
  async update(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = shiftUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.shiftsService.update(req.user, id, parsed.data);
  }

  @Post(':id/publish')
  async publish(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.shiftsService.publish(req.user, id);
  }

  @Post(':id/unpublish')
  async unpublish(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.shiftsService.unpublish(req.user, id);
  }
}
