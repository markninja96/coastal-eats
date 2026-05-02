import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import { users } from '../db/schema';

export type UserRecord = typeof users.$inferSelect;

type GoogleUserInput = {
  email: string;
  name: string;
  googleId: string;
};

type LocalUserInput = {
  email: string;
  name: string;
  passwordHash: string;
};

type UpdateProfileInput = {
  name: string;
};

type UpdatePreferencesInput = {
  homeTimezone: string;
};

type UpdatePasswordInput = {
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly database: typeof db) {}

  async findById(id: string) {
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    return user;
  }

  async findByGoogleId(googleId: string) {
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    return user;
  }

  async attachGoogleId(userId: string, googleId: string) {
    await this.database
      .update(users)
      .set({ googleId })
      .where(eq(users.id, userId));
  }

  async createFromGoogle({ email, name, googleId }: GoogleUserInput) {
    const [user] = await this.database
      .insert(users)
      .values({
        email,
        name,
        role: 'staff',
        homeTimezone: 'America/Los_Angeles',
        googleId,
      })
      .returning();
    return user;
  }

  async findOrCreateGoogleUser(input: GoogleUserInput) {
    try {
      return await this.database.transaction(async (tx) => {
        const [byGoogle] = await tx
          .select()
          .from(users)
          .where(eq(users.googleId, input.googleId))
          .limit(1);
        if (byGoogle) return byGoogle;

        const [byEmail] = await tx
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        if (byEmail) {
          if (byEmail.googleId && byEmail.googleId !== input.googleId) {
            throw new ConflictException('Google account already linked');
          }
          if (!byEmail.googleId) {
            await tx
              .update(users)
              .set({ googleId: input.googleId })
              .where(eq(users.id, byEmail.id));
          }
          return { ...byEmail, googleId: input.googleId };
        }

        const [created] = await tx
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            role: 'staff',
            homeTimezone: 'America/Los_Angeles',
            googleId: input.googleId,
          })
          .returning();
        return created;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Google account already linked');
      }
      throw error;
    }
  }

  async createLocalUser(input: LocalUserInput) {
    try {
      const normalizedEmail = input.email.trim().toLowerCase();
      const [created] = await this.database
        .insert(users)
        .values({
          email: normalizedEmail,
          name: input.name,
          role: 'staff',
          homeTimezone: 'America/Los_Angeles',
          passwordHash: input.passwordHash,
        })
        .returning();
      return created;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const [updated] = await this.database
      .update(users)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const [updated] = await this.database
      .update(users)
      .set({
        homeTimezone: input.homeTimezone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updatePassword(userId: string, input: UpdatePasswordInput) {
    const [updated] = await this.database
      .update(users)
      .set({
        passwordHash: input.passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  toSafeUser(user: UserRecord) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      homeTimezone: user.homeTimezone,
    };
  }
}
