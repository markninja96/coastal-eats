import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import { locations, managerLocations, staffLocations } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';

type LocationInput = {
  name: string;
  city?: string;
  region?: string;
  country?: string;
  timezone: string;
};

const locationSelect = {
  id: locations.id,
  name: locations.name,
  city: locations.city,
  region: locations.region,
  country: locations.country,
  timezone: locations.timezone,
  createdAt: locations.createdAt,
  updatedAt: locations.updatedAt,
};

@Injectable()
export class LocationsService {
  constructor(@Inject(DB) private readonly database: typeof db) {}

  async list(user: AuthUser) {
    if (user.role === 'admin') {
      return this.database.select(locationSelect).from(locations);
    }

    if (user.role === 'manager') {
      return this.database
        .select(locationSelect)
        .from(locations)
        .innerJoin(
          managerLocations,
          eq(managerLocations.locationId, locations.id),
        )
        .where(eq(managerLocations.managerId, user.id));
    }

    return this.database
      .select(locationSelect)
      .from(locations)
      .innerJoin(staffLocations, eq(staffLocations.locationId, locations.id))
      .where(eq(staffLocations.staffId, user.id));
  }

  async create(user: AuthUser, input: LocationInput) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create locations');
    }

    const [created] = await this.database
      .insert(locations)
      .values({
        name: input.name,
        city: input.city ?? null,
        region: input.region ?? null,
        country: input.country ?? null,
        timezone: input.timezone,
      })
      .returning(locationSelect);

    return created;
  }
}
