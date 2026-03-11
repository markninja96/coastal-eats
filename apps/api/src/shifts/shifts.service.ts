import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, lte, or, isNull, gt, inArray, not } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import {
  availabilityExceptions,
  availabilityWindows,
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
  getShiftMaxDurationMessage,
  getShiftMinDurationMessage,
  getShiftMinStartMessage,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  MIN_REST_PERIOD_MS,
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
      throw new BadRequestException(getShiftMinStartMessage());
    }

    const diffMinutes = (endAt.getTime() - startAt.getTime()) / 60000;
    if (diffMinutes <= 0) {
      throw new BadRequestException('Shift end must be after start');
    }
    if (diffMinutes < MIN_DURATION_MINUTES) {
      throw new BadRequestException(getShiftMinDurationMessage());
    }
    if (diffMinutes > MAX_DURATION_MINUTES) {
      throw new BadRequestException(getShiftMaxDurationMessage());
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
      this.assertCutoff(existing.startAt);
      if (input.startAt) {
        this.assertCutoff(nextStart);
      }
    }
    if (input.startAt || input.endAt) {
      this.assertShiftTiming(nextStart, nextEnd);
    }

    if (
      input.requiredSkillId !== undefined &&
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
        notes: input.notes === undefined ? existing.notes : input.notes,
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

        const existingAssignments = await tx
          .select({ id: shiftAssignments.id })
          .from(shiftAssignments)
          .where(
            and(
              eq(shiftAssignments.shiftId, shift.id),
              eq(shiftAssignments.status, 'assigned'),
            ),
          )
          .for('update');
        if (existingAssignments.length >= shift.headcount) {
          const suggestions = await this.suggestStaff(tx, shift);
          throw new BadRequestException({
            message: 'Assignment violates constraints',
            violations: [
              {
                code: 'headcount',
                message: 'Shift is fully assigned',
              },
            ],
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

    const duplicateCheck = await dbClient
      .select({ id: shiftAssignments.id })
      .from(shiftAssignments)
      .where(
        and(
          eq(shiftAssignments.staffId, staffId),
          eq(shiftAssignments.shiftId, shift.id),
          eq(shiftAssignments.status, 'assigned'),
        ),
      )
      .limit(1);
    if (duplicateCheck.length) {
      violations.push({
        code: 'duplicate',
        message: 'Staff is already assigned to this shift',
      });
    }

    const windowStart = new Date(shift.startAt.getTime() - MIN_REST_PERIOD_MS);
    const windowEnd = new Date(shift.endAt.getTime() + MIN_REST_PERIOD_MS);
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
          not(eq(shiftAssignments.shiftId, shift.id)),
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
    const exceptions = await dbClient
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.staffId, staffId));

    const windows = await dbClient
      .select()
      .from(availabilityWindows)
      .where(eq(availabilityWindows.staffId, staffId));

    return this.evaluateStaffAvailability(shift, exceptions, windows);
  }

  private async bulkCheckAvailability(
    dbClient: DbClient,
    shift: typeof shifts.$inferSelect,
    staffIds: string[],
  ) {
    const results = new Map<string, { available: boolean; reason?: string }>();
    if (!staffIds.length) return results;

    const exceptions = await dbClient
      .select()
      .from(availabilityExceptions)
      .where(and(inArray(availabilityExceptions.staffId, staffIds)));

    const windows = await dbClient
      .select()
      .from(availabilityWindows)
      .where(and(inArray(availabilityWindows.staffId, staffIds)));

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
    const parts = this.getLocalDateParts(date, timeZone);
    const year = String(parts.year).padStart(4, '0');
    const month = String(parts.month).padStart(2, '0');
    const day = String(parts.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
      hourCycle: 'h23',
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

  private getDateFromLocalParts(
    parts: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      second: number;
    },
    timeZone: string,
  ) {
    const utcGuess = new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      ),
    );
    const actual = this.getLocalDateParts(utcGuess, timeZone);
    const desiredUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const diff = desiredUtc - actualUtc;
    return new Date(utcGuess.getTime() + diff);
  }

  private getPreviousLocalDateKey(date: Date, timeZone: string) {
    const parts = this.getLocalDateParts(date, timeZone);
    const prevDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    const prevParts = {
      year: prevDate.getUTCFullYear(),
      month: prevDate.getUTCMonth() + 1,
      day: prevDate.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    };
    const prevLocalDate = this.getDateFromLocalParts(prevParts, timeZone);
    return this.toDateKey(prevLocalDate, timeZone);
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

  private evaluateStaffAvailability(
    shift: typeof shifts.$inferSelect,
    exceptions: Array<typeof availabilityExceptions.$inferSelect>,
    windows: Array<typeof availabilityWindows.$inferSelect>,
  ) {
    const matchingExceptions = exceptions.filter((exception) => {
      const exceptionDate = this.toDateKey(exception.date, exception.timezone);
      const shiftDateKeys = new Set([
        this.toDateKey(shift.startAt, exception.timezone),
        this.toDateKey(shift.endAt, exception.timezone),
        this.getPreviousLocalDateKey(shift.startAt, exception.timezone),
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

      const overlaps =
        exceptionStartMs < shiftEndMs && exceptionEndMs > shiftStartMs;
      const fullyCovers =
        exceptionStartMs <= shiftStartMs && exceptionEndMs >= shiftEndMs;
      if (exception.type === 'unavailable') return overlaps;
      return fullyCovers;
    });

    if (
      matchingExceptions.some((exception) => exception.type === 'unavailable')
    ) {
      return { available: false, reason: 'Staff marked unavailable' };
    }
    if (
      matchingExceptions.some((exception) => exception.type === 'available')
    ) {
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
      const prevStartDate = new Date(
        Date.UTC(startParts.year, startParts.month - 1, startParts.day),
      );
      prevStartDate.setUTCDate(prevStartDate.getUTCDate() - 1);
      const prevStartParts = {
        year: prevStartDate.getUTCFullYear(),
        month: prevStartDate.getUTCMonth() + 1,
        day: prevStartDate.getUTCDate(),
        hour: startParts.hour,
        minute: startParts.minute,
        second: startParts.second,
      };
      const dayBeforeStart = prevStartDate.getUTCDay();
      let windowDate: typeof startParts | null = null;
      if (window.dayOfWeek === endDay) {
        windowDate = endParts;
      } else if (window.dayOfWeek === startDay) {
        windowDate = startParts;
      } else if (window.dayOfWeek === dayBeforeStart) {
        windowDate = prevStartParts;
      }
      if (!windowDate) return false;

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

    const staffIds = staffList.map((staff) => staff.id);
    const availabilityByStaff = await this.bulkCheckAvailability(
      this.database,
      shift,
      staffIds,
    );
    const assignmentsByStaff = await this.bulkFetchAssignmentsForStaff(
      this.database,
      staffIds,
      shift,
    );

    const results = staffList.map((staff) => {
      const availability = availabilityByStaff.get(staff.id) ?? {
        available: false,
        reason: 'No availability window for this time',
      };
      let conflict = null as { reason: string } | null;
      const assignments = assignmentsByStaff.get(staff.id) ?? [];
      if (assignments.some((assignment) => assignment.shiftId === shift.id)) {
        conflict = { reason: 'Already assigned to this shift' };
      }
      if (availability.available && !conflict) {
        for (const assignment of assignments) {
          if (assignment.shiftId === shift.id) continue;
          const violation = this.checkOverlapOrRestViolation(assignment, shift);
          if (violation) {
            conflict = { reason: violation.message };
            break;
          }
        }
      }
      const isAvailable = availability.available && !conflict;
      return {
        id: staff.id,
        name: staff.name,
        availability: isAvailable ? 'available' : 'unavailable',
        reason: conflict ? conflict.reason : availability.reason,
      };
    });

    return results;
  }

  private async bulkFetchAssignmentsForStaff(
    dbClient: DbClient,
    staffIds: string[],
    shift: typeof shifts.$inferSelect,
  ) {
    const assignmentsByStaff = new Map<
      string,
      Array<{ shiftId: string; startAt: Date; endAt: Date }>
    >();
    if (!staffIds.length) return assignmentsByStaff;

    const windowStart = new Date(shift.startAt.getTime() - MIN_REST_PERIOD_MS);
    const windowEnd = new Date(shift.endAt.getTime() + MIN_REST_PERIOD_MS);
    const assignments = await dbClient
      .select({
        staffId: shiftAssignments.staffId,
        shiftId: shiftAssignments.shiftId,
        startAt: shifts.startAt,
        endAt: shifts.endAt,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(
        and(
          inArray(shiftAssignments.staffId, staffIds),
          eq(shiftAssignments.status, 'assigned'),
          lte(shifts.startAt, windowEnd),
          gte(shifts.endAt, windowStart),
        ),
      );

    assignments.forEach((assignment) => {
      const list = assignmentsByStaff.get(assignment.staffId) ?? [];
      list.push({
        shiftId: assignment.shiftId,
        startAt: assignment.startAt,
        endAt: assignment.endAt,
      });
      assignmentsByStaff.set(assignment.staffId, list);
    });

    return assignmentsByStaff;
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
      shift.startAt.getTime() - assignment.endAt.getTime() < MIN_REST_PERIOD_MS;
    const restAfter =
      assignment.startAt >= shift.endAt &&
      assignment.startAt.getTime() - shift.endAt.getTime() < MIN_REST_PERIOD_MS;
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
    const staffIds = staffList.map((staff) => staff.id);
    const availabilityByStaff = await this.bulkCheckAvailability(
      dbClient,
      shift,
      staffIds,
    );
    const assignmentsByStaff = await this.bulkFetchAssignmentsForStaff(
      dbClient,
      staffIds,
      shift,
    );
    const suggestions: Suggestion[] = [];

    for (const staff of staffList) {
      let hasViolation = false;
      const availability = availabilityByStaff.get(staff.id) ?? {
        available: false,
      };
      if (!availability.available) {
        hasViolation = true;
      }
      const assignments = assignmentsByStaff.get(staff.id) ?? [];
      if (assignments.some((assignment) => assignment.shiftId === shift.id)) {
        hasViolation = true;
      }
      if (!hasViolation) {
        for (const assignment of assignments) {
          if (assignment.shiftId === shift.id) continue;
          const violation = this.checkOverlapOrRestViolation(assignment, shift);
          if (violation) {
            hasViolation = true;
            break;
          }
        }
      }
      if (!hasViolation) {
        suggestions.push({ id: staff.id, name: staff.name });
      }
      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }
}
