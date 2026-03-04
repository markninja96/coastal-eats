import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import { managerLocations, staffLocations, users } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';

@Injectable()
export class StaffService {
  constructor(@Inject(DB) private readonly database: typeof db) {}

  async list(user: AuthUser, locationId?: string) {
    if (user.role === 'staff') {
      throw new ForbiddenException('Staff cannot view roster');
    }

    if (user.role === 'manager') {
      if (!locationId) {
        throw new ForbiddenException('Location filter required');
      }

      const [allowed] = await this.database
        .select()
        .from(managerLocations)
        .where(
          and(
            eq(managerLocations.managerId, user.id),
            eq(managerLocations.locationId, locationId),
          ),
        )
        .limit(1);
      if (!allowed) {
        throw new ForbiddenException('Manager not assigned to location');
      }
    }

    if (!locationId) {
      return this.database
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.role, 'staff'));
    }

    const query = this.database
      .selectDistinct({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(staffLocations, eq(staffLocations.staffId, users.id));

    return query.where(
      and(
        eq(users.role, 'staff'),
        eq(staffLocations.locationId, locationId),
        or(
          isNull(staffLocations.decertifiedAt),
          gt(staffLocations.decertifiedAt, new Date()),
        ),
      ),
    );
  }
}
