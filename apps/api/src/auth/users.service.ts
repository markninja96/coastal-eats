import { Inject, Injectable } from '@nestjs/common';
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
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.email, email))
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
    const byGoogle = await this.findByGoogleId(input.googleId);
    if (byGoogle) return byGoogle;

    const byEmail = await this.findByEmail(input.email);
    if (byEmail) {
      if (!byEmail.googleId) {
        await this.attachGoogleId(byEmail.id, input.googleId);
      }
      return { ...byEmail, googleId: input.googleId };
    }

    return this.createFromGoogle(input);
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
