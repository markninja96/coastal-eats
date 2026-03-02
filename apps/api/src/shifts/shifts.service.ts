import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/db';
import { managerLocations, shifts } from '../db/schema';

type AuthUser = {
  id: string;
  role: 'admin' | 'manager' | 'staff';
};

type ShiftInput = {
  locationId: string;
  startAt: Date;
  endAt: Date;
  requiredSkillId?: string | null;
  headcount: number;
  notes?: string | null;
};

@Injectable()
export class ShiftsService {
  constructor(private readonly database: typeof db) {}

  private async assertLocationAccess(user: AuthUser, locationId: string) {
    if (user.role === 'admin') return;
    if (user.role === 'manager') {
      const [row] = await this.database
        .select()
        .from(managerLocations)
        .where(
          and(
            eq(managerLocations.managerId, user.id),
            eq(managerLocations.locationId, locationId),
          ),
        )
        .limit(1);
      if (!row) {
        throw new ForbiddenException('Manager not assigned to location');
      }
      return;
    }
    throw new ForbiddenException('Staff cannot manage shifts');
  }

  private assertCutoff(startAt: Date) {
    const cutoffHours = Number(process.env.SCHEDULE_CUTOFF_HOURS || 48);
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    if (startAt.getTime() - Date.now() < cutoffMs) {
      throw new BadRequestException(
        `Changes are locked within ${cutoffHours} hours of the shift start`,
      );
    }
  }

  async list(
    user: AuthUser,
    params: { locationId?: string; start?: Date; end?: Date },
  ) {
    if (params.locationId) {
      await this.assertLocationAccess(user, params.locationId);
    }

    const conditions = [] as Array<ReturnType<typeof and>>;
    if (params.locationId) {
      conditions.push(and(eq(shifts.locationId, params.locationId)));
    }
    if (params.start) {
      conditions.push(and(gte(shifts.startAt, params.start)));
    }
    if (params.end) {
      conditions.push(and(lte(shifts.endAt, params.end)));
    }

    const whereClause = conditions.length
      ? conditions.reduce((acc, clause) => (acc ? and(acc, clause) : clause))
      : undefined;

    const query = this.database.select().from(shifts);
    return whereClause ? query.where(whereClause) : query;
  }

  async create(user: AuthUser, input: ShiftInput) {
    await this.assertLocationAccess(user, input.locationId);
    if (input.endAt <= input.startAt) {
      throw new BadRequestException('Shift end must be after start');
    }

    const [created] = await this.database
      .insert(shifts)
      .values({
        locationId: input.locationId,
        startAt: input.startAt,
        endAt: input.endAt,
        requiredSkillId: input.requiredSkillId ?? null,
        headcount: input.headcount,
        status: 'draft',
        notes: input.notes ?? null,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();

    return created;
  }

  async update(user: AuthUser, shiftId: string, input: Partial<ShiftInput>) {
    const [existing] = await this.database
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    if (!existing) throw new NotFoundException('Shift not found');

    await this.assertLocationAccess(user, existing.locationId);
    if (existing.status === 'published') {
      this.assertCutoff(existing.startAt);
    }

    const nextStart = input.startAt ?? existing.startAt;
    const nextEnd = input.endAt ?? existing.endAt;
    if (nextEnd <= nextStart) {
      throw new BadRequestException('Shift end must be after start');
    }

    const [updated] = await this.database
      .update(shifts)
      .set({
        locationId: input.locationId ?? existing.locationId,
        startAt: nextStart,
        endAt: nextEnd,
        requiredSkillId:
          input.requiredSkillId !== undefined
            ? input.requiredSkillId
            : existing.requiredSkillId,
        headcount: input.headcount ?? existing.headcount,
        notes: input.notes ?? existing.notes,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, shiftId))
      .returning();

    return updated;
  }

  async publish(user: AuthUser, shiftId: string) {
    const [existing] = await this.database
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    if (!existing) throw new NotFoundException('Shift not found');
    await this.assertLocationAccess(user, existing.locationId);
    this.assertCutoff(existing.startAt);

    const [updated] = await this.database
      .update(shifts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, shiftId))
      .returning();

    return updated;
  }

  async unpublish(user: AuthUser, shiftId: string) {
    const [existing] = await this.database
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    if (!existing) throw new NotFoundException('Shift not found');
    await this.assertLocationAccess(user, existing.locationId);
    this.assertCutoff(existing.startAt);

    const [updated] = await this.database
      .update(shifts)
      .set({
        status: 'draft',
        publishedAt: null,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, shiftId))
      .returning();

    return updated;
  }
}
