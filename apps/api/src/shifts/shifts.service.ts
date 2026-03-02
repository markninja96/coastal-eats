import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, lte, or, isNull, gt } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import {
  availabilityExceptions,
  availabilityWindows,
  locations,
  managerLocations,
  shiftAssignments,
  shifts,
  staffLocations,
  staffSkills,
  users,
} from '../db/schema';
import type { AuthUser } from '../auth/auth.types';

type DbClient = Omit<typeof db, '$client'>;

type ShiftInput = {
  locationId: string;
  startAt: Date;
  endAt: Date;
  requiredSkillId?: string | null;
  headcount: number;
  notes?: string | null;
};

type ConstraintViolation = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type Suggestion = {
  id: string;
  name: string;
  detail?: string;
};

@Injectable()
export class ShiftsService {
  constructor(@Inject(DB) private readonly database: typeof db) {}

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
    if (user.role !== 'admin' && !params.locationId) {
      throw new ForbiddenException('Location filter required');
    }
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
    if (input.locationId && input.locationId !== existing.locationId) {
      await this.assertLocationAccess(user, input.locationId);
    }
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

  async assign(user: AuthUser, shiftId: string, staffId: string) {
    try {
      return await this.database.transaction(async (tx) => {
        const [shift] = await tx
          .select()
          .from(shifts)
          .where(eq(shifts.id, shiftId))
          .for('update')
          .limit(1);
        if (!shift) throw new NotFoundException('Shift not found');

        await this.assertLocationAccess(user, shift.locationId);

        const [staff] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, staffId), eq(users.role, 'staff')))
          .limit(1);
        if (!staff) {
          throw new BadRequestException('Staff member not found');
        }

        const violations = await this.checkConstraints(tx, { staffId, shift });
        if (violations.length) {
          const suggestions = await this.suggestStaff(tx, shift);
          throw new BadRequestException({
            message: 'Assignment violates constraints',
            violations,
            suggestions,
          });
        }

        const [assignment] = await tx
          .insert(shiftAssignments)
          .values({
            shiftId: shift.id,
            staffId,
            status: 'assigned',
            assignedBy: user.id,
          })
          .returning();

        return assignment;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const suggestions = await this.suggestStaff(
          this.database,
          await this.getShiftOrThrow(shiftId),
        );
        throw new BadRequestException({
          message: 'Assignment violates constraints',
          violations: [
            {
              code: 'duplicate',
              message: 'Staff is already assigned to this shift',
            },
          ],
          suggestions,
        });
      }
      throw error;
    }
  }

  private async getShiftOrThrow(shiftId: string) {
    const [shift] = await this.database
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async unassign(user: AuthUser, shiftId: string, assignmentId: string) {
    const [shift] = await this.database
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    if (!shift) throw new NotFoundException('Shift not found');

    await this.assertLocationAccess(user, shift.locationId);

    const [updated] = await this.database
      .update(shiftAssignments)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(
        and(
          eq(shiftAssignments.id, assignmentId),
          eq(shiftAssignments.shiftId, shiftId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Assignment not found');
    }

    return updated;
  }

  private async checkConstraints(
    dbClient: DbClient,
    {
      staffId,
      shift,
    }: {
      staffId: string;
      shift: typeof shifts.$inferSelect;
    },
  ): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];

    const locationCheck = await dbClient
      .select()
      .from(staffLocations)
      .where(
        and(
          eq(staffLocations.staffId, staffId),
          eq(staffLocations.locationId, shift.locationId),
          or(
            isNull(staffLocations.decertifiedAt),
            gt(staffLocations.decertifiedAt, shift.endAt),
          ),
        ),
      )
      .limit(1);
    if (!locationCheck.length) {
      violations.push({
        code: 'location',
        message: 'Staff is not certified for this location',
      });
    }

    if (shift.requiredSkillId) {
      const skillCheck = await dbClient
        .select()
        .from(staffSkills)
        .where(
          and(
            eq(staffSkills.staffId, staffId),
            eq(staffSkills.skillId, shift.requiredSkillId),
          ),
        )
        .limit(1);
      if (!skillCheck.length) {
        violations.push({
          code: 'skill',
          message: 'Staff lacks required skill',
        });
      }
    }

    const windowStart = new Date(shift.startAt.getTime() - 10 * 60 * 60 * 1000);
    const windowEnd = new Date(shift.endAt.getTime() + 10 * 60 * 60 * 1000);
    const assignments = await dbClient
      .select({
        startAt: shifts.startAt,
        endAt: shifts.endAt,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(shiftAssignments.staffId, staffId),
          eq(shiftAssignments.status, 'assigned'),
          lte(shifts.startAt, windowEnd),
          gte(shifts.endAt, windowStart),
        ),
      );

    assignments.forEach((assignment) => {
      const overlaps =
        assignment.startAt < shift.endAt && assignment.endAt > shift.startAt;
      if (overlaps) {
        violations.push({
          code: 'overlap',
          message: 'Staff is already assigned to an overlapping shift',
        });
      }

      const restBefore =
        assignment.endAt <= shift.startAt &&
        shift.startAt.getTime() - assignment.endAt.getTime() <
          10 * 60 * 60 * 1000;
      const restAfter =
        assignment.startAt >= shift.endAt &&
        assignment.startAt.getTime() - shift.endAt.getTime() <
          10 * 60 * 60 * 1000;
      if (restBefore || restAfter) {
        violations.push({
          code: 'rest',
          message: 'Staff does not have 10 hours between shifts',
        });
      }
    });

    const availability = await this.checkAvailability(dbClient, staffId, shift);
    if (!availability.available) {
      violations.push({
        code: 'availability',
        message: availability.reason || 'Staff is unavailable for this shift',
      });
    }

    return violations;
  }

  private async checkAvailability(
    dbClient: DbClient,
    staffId: string,
    shift: typeof shifts.$inferSelect,
  ) {
    const [location] = await dbClient
      .select()
      .from(locations)
      .where(eq(locations.id, shift.locationId))
      .limit(1);
    const timezone = location?.timezone || 'UTC';

    const shiftDate = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(shift.startAt);
    const [month, day, year] = shiftDate.split('/').map(Number);
    const shiftDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    const exceptions = await dbClient
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.staffId, staffId));

    const toDateKey = (date: Date, tz: string) =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);

    const toTimeKey = (date: Date, tz: string) =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date) + ':00';

    const exceptionHit = exceptions.find((exception) => {
      const exceptionDate = toDateKey(exception.date, exception.timezone);
      if (exceptionDate !== shiftDate) return false;
      if (exception.locationId && exception.locationId !== shift.locationId) {
        return false;
      }
      if (!exception.startTime || !exception.endTime) return true;
      const shiftStartKey = toTimeKey(shift.startAt, exception.timezone);
      const shiftEndKey = toTimeKey(shift.endAt, exception.timezone);
      const overlaps =
        exception.startTime <= shiftEndKey &&
        exception.endTime >= shiftStartKey;
      const fullyCovers =
        exception.startTime <= shiftStartKey &&
        exception.endTime >= shiftEndKey;
      if (exception.type === 'unavailable') return overlaps;
      return fullyCovers;
    });

    if (exceptionHit?.type === 'unavailable') {
      return { available: false, reason: 'Staff marked unavailable' };
    }
    if (exceptionHit?.type === 'available') {
      return { available: true };
    }

    const windows = await dbClient
      .select()
      .from(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.staffId, staffId),
          eq(availabilityWindows.dayOfWeek, shiftDay),
        ),
      );

    const matchingWindow = windows.find((window) => {
      if (window.locationId && window.locationId !== shift.locationId) {
        return false;
      }
      const shiftStartKey = toTimeKey(shift.startAt, window.timezone);
      const shiftEndKey = toTimeKey(shift.endAt, window.timezone);
      return window.startTime <= shiftStartKey && window.endTime >= shiftEndKey;
    });

    if (!matchingWindow) {
      return {
        available: false,
        reason: 'No availability window for this time',
      };
    }

    return { available: true };
  }

  private async suggestStaff(
    dbClient: DbClient,
    shift: typeof shifts.$inferSelect,
  ): Promise<Suggestion[]> {
    const conditions = [
      eq(users.role, 'staff'),
      eq(staffLocations.locationId, shift.locationId),
      or(
        isNull(staffLocations.decertifiedAt),
        gt(staffLocations.decertifiedAt, shift.endAt),
      ),
    ];

    const baseQuery = dbClient
      .select({ id: users.id, name: users.name })
      .from(users)
      .innerJoin(staffLocations, eq(staffLocations.staffId, users.id))
      .where(and(...conditions));

    const staffList = shift.requiredSkillId
      ? await dbClient
          .select({ id: users.id, name: users.name })
          .from(users)
          .innerJoin(staffLocations, eq(staffLocations.staffId, users.id))
          .innerJoin(staffSkills, eq(staffSkills.staffId, users.id))
          .where(
            and(...conditions, eq(staffSkills.skillId, shift.requiredSkillId)),
          )
      : await baseQuery;
    const suggestions: Suggestion[] = [];

    for (const staff of staffList) {
      const violations = await this.checkConstraints(dbClient, {
        staffId: staff.id,
        shift,
      });
      if (!violations.length) {
        suggestions.push({ id: staff.id, name: staff.name });
      }
      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }
}
