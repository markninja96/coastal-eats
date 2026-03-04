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
import type { AuthUser } from '../auth/auth.types';
import { ShiftsService } from './shifts.service';

const idSchema = z.string().uuid();
const assignmentSchema = z.object({
  staffId: z.string().uuid(),
});
const MIN_START_MINUTES = 30;
const MIN_DURATION_MINUTES = 30;
const WARN_DURATION_MINUTES = 8 * 60;
const MAX_DURATION_MINUTES = 12 * 60;

type ShiftWarning = {
  code: 'duration';
  message: string;
};

const getShiftWarnings = (startAt: Date, endAt: Date): ShiftWarning[] => {
  const diffMinutes = (endAt.getTime() - startAt.getTime()) / 60000;
  if (diffMinutes > WARN_DURATION_MINUTES) {
    return [{ code: 'duration', message: 'Shift exceeds 8 hours.' }];
  }
  return [];
};

const shiftInputBaseSchema = z.object({
  locationId: z.string().uuid(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  requiredSkillId: z.string().uuid(),
  headcount: z.number().int().positive(),
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
});

const shiftInputSchema = shiftInputBaseSchema.superRefine((data, ctx) => {
  const minStart = Date.now() + MIN_START_MINUTES * 60000;
  if (data.startAt.getTime() < minStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startAt'],
      message: 'Start time must be at least 30 minutes from now.',
    });
  }

  const diffMinutes = (data.endAt.getTime() - data.startAt.getTime()) / 60000;
  if (diffMinutes <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endAt'],
      message: 'Shift end must be after start.',
    });
    return;
  }
  if (diffMinutes < MIN_DURATION_MINUTES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endAt'],
      message: 'Shift must be at least 30 minutes.',
    });
  }
  if (diffMinutes > MAX_DURATION_MINUTES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endAt'],
      message: 'Shift cannot exceed 12 hours.',
    });
  }
});

const shiftUpdateSchema = shiftInputBaseSchema.partial();

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
    const shift = await this.shiftsService.create(req.user, parsed.data);
    return {
      shift,
      warnings: getShiftWarnings(parsed.data.startAt, parsed.data.endAt),
    };
  }

  @Patch(':id')
  async update(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException('Invalid shift id');
    }
    const parsed = shiftUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.shiftsService.update(req.user, idParsed.data, parsed.data);
  }

  @Post(':id/publish')
  async publish(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException('Invalid shift id');
    }
    return this.shiftsService.publish(req.user, idParsed.data);
  }

  @Post(':id/unpublish')
  async unpublish(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException('Invalid shift id');
    }
    return this.shiftsService.unpublish(req.user, idParsed.data);
  }

  @Post(':id/assignments')
  async assign(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException('Invalid shift id');
    }
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.shiftsService.assign(
      req.user,
      idParsed.data,
      parsed.data.staffId,
    );
  }

  @Get(':id/staff')
  async listStaff(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException('Invalid shift id');
    }
    return this.shiftsService.listStaffAvailability(req.user, idParsed.data);
  }

  @Post(':id/assignments/:assignmentId/unassign')
  async unassign(
    @Req() req: { user: AuthUser },
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException('Invalid shift id');
    }
    const assignmentParsed = idSchema.safeParse(assignmentId);
    if (!assignmentParsed.success) {
      throw new BadRequestException('Invalid assignment id');
    }
    return this.shiftsService.unassign(
      req.user,
      idParsed.data,
      assignmentParsed.data,
    );
  }
}
