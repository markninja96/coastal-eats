import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, lte, or, isNull, gt, inArray } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import {
  availabilityExceptions,
  availabilityWindows,
  locations,
  managerLocations,
  skills,
  shiftAssignments,
  shifts,
  staffLocations,
  staffSkills,
  users,
} from '../db/schema';
import type { AuthUser } from '../auth/auth.types';
import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  MIN_START_MINUTES,
} from './shifts.constants';

type DbClient = Omit<typeof db, '$client'>;

type ShiftInput = {
  locationId: string;
  startAt: Date;
  endAt: Date;
  requiredSkillId: string;
  headcount: number;
  title: string;
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

  private assertShiftTiming(startAt: Date, endAt: Date) {
    const minStart = Date.now() + MIN_START_MINUTES * 60 * 1000;
    if (startAt.getTime() < minStart) {
      throw new BadRequestException(
        'Shift start must be at least 30 minutes from now',
      );
    }

    const diffMinutes = (endAt.getTime() - startAt.getTime()) / 60000;
    if (diffMinutes <= 0) {
      throw new BadRequestException('Shift end must be after start');
    }
    if (diffMinutes < MIN_DURATION_MINUTES) {
      throw new BadRequestException('Shift must be at least 30 minutes');
    }
    if (diffMinutes > MAX_DURATION_MINUTES) {
      throw new BadRequestException('Shift cannot exceed 12 hours');
    }
  }

  private async assertSkillExists(skillId: string) {
    const [row] = await this.database
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.id, skillId))
      .limit(1);
    if (!row) {
      throw new BadRequestException('Invalid required skill');
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

    const query = this.database
      .select({
        shift: shifts,
        assignment: shiftAssignments,
        staff: users,
      })
      .from(shifts)
      .leftJoin(shiftAssignments, eq(shiftAssignments.shiftId, shifts.id))
      .leftJoin(users, eq(shiftAssignments.staffId, users.id));

    const rows = whereClause ? await query.where(whereClause) : await query;
    const byId = new Map<
      string,
      typeof shifts.$inferSelect & {
        assignments: Array<{
          id: string;
          staffId: string;
          staffName: string;
          status: string;
        }>;
      }
    >();
    const assignmentIdsByShift = new Map<string, Set<string>>();

    rows.forEach((row) => {
      const shift = row.shift;
      const existing = byId.get(shift.id) ?? {
        ...shift,
        assignments: [],
      };
      const assignmentIds = assignmentIdsByShift.get(shift.id) ?? new Set();
      if (
        row.assignment?.id &&
        row.staff?.id &&
        row.assignment.status === 'assigned'
      ) {
        if (!assignmentIds.has(row.assignment.id)) {
          existing.assignments.push({
            id: row.assignment.id,
            staffId: row.assignment.staffId,
            staffName: row.staff.name,
            status: row.assignment.status,
          });
          assignmentIds.add(row.assignment.id);
        }
      }
      byId.set(shift.id, existing);
      assignmentIdsByShift.set(shift.id, assignmentIds);
    });

    return Array.from(byId.values());
  }

  async create(user: AuthUser, input: ShiftInput) {
    await this.assertLocationAccess(user, input.locationId);
    this.assertShiftTiming(input.startAt, input.endAt);
    await this.assertSkillExists(input.requiredSkillId);

    const [created] = await this.database
      .insert(shifts)
      .values({
        locationId: input.locationId,
        startAt: input.startAt,
        endAt: input.endAt,
        requiredSkillId: input.requiredSkillId,
        headcount: input.headcount,
        status: 'draft',
        title: input.title,
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

    const nextStart = input.startAt ?? existing.startAt;
    const nextEnd = input.endAt ?? existing.endAt;
    if (existing.status === 'published') {
      this.assertCutoff(nextStart);
    }
    if (input.startAt || input.endAt) {
      this.assertShiftTiming(nextStart, nextEnd);
    }

    if (
      input.requiredSkillId &&
      input.requiredSkillId !== existing.requiredSkillId
    ) {
      await this.assertSkillExists(input.requiredSkillId);
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
        title: input.title ?? existing.title,
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
      const violation = this.checkOverlapOrRestViolation(assignment, shift);
      if (violation) {
        violations.push(violation);
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

    const { shiftDays } = this.getShiftDateInfo(shift, timezone);

    const exceptions = await dbClient
      .select()
      .from(availabilityExceptions)
      .where(
        and(
          eq(availabilityExceptions.staffId, staffId),
          lte(availabilityExceptions.date, shift.endAt),
          gte(availabilityExceptions.date, shift.startAt),
        ),
      );

    const windows = await dbClient
      .select()
      .from(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.staffId, staffId),
          inArray(availabilityWindows.dayOfWeek, shiftDays),
        ),
      );

    return this.evaluateStaffAvailability(shift, exceptions, windows);
  }

  private async bulkCheckAvailability(
    dbClient: DbClient,
    shift: typeof shifts.$inferSelect,
    staffIds: string[],
  ) {
    const results = new Map<string, { available: boolean; reason?: string }>();
    if (!staffIds.length) return results;

    const [location] = await dbClient
      .select()
      .from(locations)
      .where(eq(locations.id, shift.locationId))
      .limit(1);
    const timezone = location?.timezone || 'UTC';

    const { shiftDays } = this.getShiftDateInfo(shift, timezone);

    const exceptions = await dbClient
      .select()
      .from(availabilityExceptions)
      .where(
        and(
          inArray(availabilityExceptions.staffId, staffIds),
          lte(availabilityExceptions.date, shift.endAt),
          gte(availabilityExceptions.date, shift.startAt),
        ),
      );

    const windows = await dbClient
      .select()
      .from(availabilityWindows)
      .where(
        and(
          inArray(availabilityWindows.staffId, staffIds),
          inArray(availabilityWindows.dayOfWeek, shiftDays),
        ),
      );

    const exceptionsByStaff = new Map<string, typeof exceptions>();
    exceptions.forEach((exception) => {
      const list = exceptionsByStaff.get(exception.staffId) ?? [];
      list.push(exception);
      exceptionsByStaff.set(exception.staffId, list);
    });

    const windowsByStaff = new Map<string, typeof windows>();
    windows.forEach((window) => {
      const list = windowsByStaff.get(window.staffId) ?? [];
      list.push(window);
      windowsByStaff.set(window.staffId, list);
    });

    staffIds.forEach((staffId) => {
      const staffExceptions = exceptionsByStaff.get(staffId) ?? [];
      const staffWindows = windowsByStaff.get(staffId) ?? [];
      const availability = this.evaluateStaffAvailability(
        shift,
        staffExceptions,
        staffWindows,
      );
      results.set(staffId, availability);
    });

    return results;
  }

  private toDateKey(date: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private getLocalDateParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const values: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== 'literal') values[part.type] = Number(part.value);
    }
    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
      second: values.second,
    };
  }

  private getLocalTimestamp(date: Date, timeZone: string) {
    const parts = this.getLocalDateParts(date, timeZone);
    return Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
  }

  private parseTimeParts(value: string) {
    const [hour, minute, second] = value.split(':').map(Number);
    return {
      hour: Number.isFinite(hour) ? hour : 0,
      minute: Number.isFinite(minute) ? minute : 0,
      second: Number.isFinite(second) ? second : 0,
    };
  }

  private getShiftDateInfo(
    shift: typeof shifts.$inferSelect,
    timeZone: string,
  ) {
    const startDate = this.toDateKey(shift.startAt, timeZone);
    const endDate = this.toDateKey(shift.endAt, timeZone);
    const dateKeys = new Set([startDate, endDate]);
    const shiftDays = Array.from(dateKeys).map((dateKey) => {
      const [month, day, year] = dateKey.split('/').map(Number);
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    });
    return { shiftDays };
  }

  private evaluateStaffAvailability(
    shift: typeof shifts.$inferSelect,
    exceptions: Array<typeof availabilityExceptions.$inferSelect>,
    windows: Array<typeof availabilityWindows.$inferSelect>,
  ) {
    const exceptionHit = exceptions.find((exception) => {
      const exceptionDate = this.toDateKey(exception.date, exception.timezone);
      const shiftDateKeys = new Set([
        this.toDateKey(shift.startAt, exception.timezone),
        this.toDateKey(shift.endAt, exception.timezone),
      ]);
      if (!shiftDateKeys.has(exceptionDate)) return false;
      if (exception.locationId && exception.locationId !== shift.locationId) {
        return false;
      }
      const shiftStartMs = this.getLocalTimestamp(
        shift.startAt,
        exception.timezone,
      );
      let shiftEndMs = this.getLocalTimestamp(shift.endAt, exception.timezone);
      if (shiftEndMs <= shiftStartMs) {
        shiftEndMs += 24 * 60 * 60 * 1000;
      }

      const exceptionDateParts = this.getLocalDateParts(
        exception.date,
        exception.timezone,
      );
      const exceptionStartParts = exception.startTime
        ? this.parseTimeParts(exception.startTime)
        : { hour: 0, minute: 0, second: 0 };
      const exceptionEndParts = exception.endTime
        ? this.parseTimeParts(exception.endTime)
        : { hour: 24, minute: 0, second: 0 };
      const exceptionStartMs = Date.UTC(
        exceptionDateParts.year,
        exceptionDateParts.month - 1,
        exceptionDateParts.day,
        exceptionStartParts.hour,
        exceptionStartParts.minute,
        exceptionStartParts.second,
      );
      let exceptionEndMs = Date.UTC(
        exceptionDateParts.year,
        exceptionDateParts.month - 1,
        exceptionDateParts.day,
        exceptionEndParts.hour,
        exceptionEndParts.minute,
        exceptionEndParts.second,
      );
      if (exceptionEndMs <= exceptionStartMs) {
        exceptionEndMs += 24 * 60 * 60 * 1000;
      }

      if (!exception.startTime || !exception.endTime) {
        return true;
      }
      const overlaps =
        exceptionStartMs <= shiftEndMs && exceptionEndMs >= shiftStartMs;
      const fullyCovers =
        exceptionStartMs <= shiftStartMs && exceptionEndMs >= shiftEndMs;
      if (exception.type === 'unavailable') return overlaps;
      return fullyCovers;
    });

    if (exceptionHit?.type === 'unavailable') {
      return { available: false, reason: 'Staff marked unavailable' };
    }
    if (exceptionHit?.type === 'available') {
      return { available: true };
    }

    const matchingWindow = windows.find((window) => {
      if (window.locationId && window.locationId !== shift.locationId) {
        return false;
      }
      const shiftStartMs = this.getLocalTimestamp(
        shift.startAt,
        window.timezone,
      );
      let shiftEndMs = this.getLocalTimestamp(shift.endAt, window.timezone);
      if (shiftEndMs <= shiftStartMs) {
        shiftEndMs += 24 * 60 * 60 * 1000;
      }

      const startParts = this.getLocalDateParts(shift.startAt, window.timezone);
      const endParts = this.getLocalDateParts(shift.endAt, window.timezone);
      const startDay = new Date(
        Date.UTC(startParts.year, startParts.month - 1, startParts.day),
      ).getUTCDay();
      const endDay = new Date(
        Date.UTC(endParts.year, endParts.month - 1, endParts.day),
      ).getUTCDay();
      let windowDate = startParts;
      if (window.dayOfWeek === endDay) {
        windowDate = endParts;
      } else if (window.dayOfWeek === startDay) {
        windowDate = startParts;
      }

      const windowStartParts = this.parseTimeParts(window.startTime);
      const windowEndParts = this.parseTimeParts(window.endTime);
      const windowStartMs = Date.UTC(
        windowDate.year,
        windowDate.month - 1,
        windowDate.day,
        windowStartParts.hour,
        windowStartParts.minute,
        windowStartParts.second,
      );
      let windowEndMs = Date.UTC(
        windowDate.year,
        windowDate.month - 1,
        windowDate.day,
        windowEndParts.hour,
        windowEndParts.minute,
        windowEndParts.second,
      );
      if (windowEndMs <= windowStartMs) {
        windowEndMs += 24 * 60 * 60 * 1000;
      }

      return windowStartMs <= shiftStartMs && windowEndMs >= shiftEndMs;
    });

    if (!matchingWindow) {
      return {
        available: false,
        reason: 'No availability window for this time',
      };
    }

    return { available: true };
  }

  async listStaffAvailability(user: AuthUser, shiftId: string) {
    const shift = await this.getShiftOrThrow(shiftId);
    await this.assertLocationAccess(user, shift.locationId);

    const baseConditions = [
      eq(users.role, 'staff'),
      eq(staffLocations.locationId, shift.locationId),
      or(
        isNull(staffLocations.decertifiedAt),
        gt(staffLocations.decertifiedAt, shift.endAt),
      ),
    ];

    const staffList = await this.database
      .selectDistinct({ id: users.id, name: users.name })
      .from(users)
      .innerJoin(staffLocations, eq(staffLocations.staffId, users.id))
      .innerJoin(staffSkills, eq(staffSkills.staffId, users.id))
      .where(
        and(...baseConditions, eq(staffSkills.skillId, shift.requiredSkillId)),
      );

    const availabilityByStaff = await this.bulkCheckAvailability(
      this.database,
      shift,
      staffList.map((staff) => staff.id),
    );

    const results = [] as Array<{
      id: string;
      name: string;
      availability: 'available' | 'unavailable';
      reason?: string;
    }>;

    for (const staff of staffList) {
      const availability = availabilityByStaff.get(staff.id) ?? {
        available: false,
        reason: 'No availability window for this time',
      };
      const conflict = availability.available
        ? await this.checkAssignmentConflicts(this.database, staff.id, shift)
        : null;
      const isAvailable = availability.available && !conflict;
      results.push({
        id: staff.id,
        name: staff.name,
        availability: isAvailable ? 'available' : 'unavailable',
        reason: conflict ? conflict.reason : availability.reason,
      });
    }

    return results;
  }

  private async checkAssignmentConflicts(
    dbClient: DbClient,
    staffId: string,
    shift: typeof shifts.$inferSelect,
  ) {
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

    for (const assignment of assignments) {
      const violation = this.checkOverlapOrRestViolation(assignment, shift);
      if (violation) {
        return {
          available: false,
          reason: violation.message,
        };
      }
    }

    return null;
  }

  private checkOverlapOrRestViolation(
    assignment: { startAt: Date; endAt: Date },
    shift: typeof shifts.$inferSelect,
  ) {
    const overlaps =
      assignment.startAt < shift.endAt && assignment.endAt > shift.startAt;
    if (overlaps) {
      return {
        code: 'overlap',
        message: 'Staff is already assigned to an overlapping shift',
      } as const;
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
      return {
        code: 'rest',
        message: 'Staff does not have 10 hours between shifts',
      } as const;
    }

    return null;
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
      .selectDistinct({ id: users.id, name: users.name })
      .from(users)
      .innerJoin(staffLocations, eq(staffLocations.staffId, users.id));

    const staffList = await baseQuery
      .innerJoin(staffSkills, eq(staffSkills.staffId, users.id))
      .where(
        and(...conditions, eq(staffSkills.skillId, shift.requiredSkillId)),
      );
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
