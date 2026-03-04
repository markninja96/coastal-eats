import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DB } from '../db/db.module';
import { db } from '../db/db';
import { skills } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';

type SkillInput = {
  name: string;
};

const skillSelect = {
  id: skills.id,
  name: skills.name,
  createdAt: skills.createdAt,
  updatedAt: skills.updatedAt,
};

@Injectable()
export class SkillsService {
  constructor(@Inject(DB) private readonly database: typeof db) {}

  async list() {
    return this.database.select(skillSelect).from(skills);
  }

  async create(user: AuthUser, input: SkillInput) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create skills');
    }

    const [created] = await this.database
      .insert(skills)
      .values({ name: input.name })
      .returning(skillSelect);

    if (!created) {
      throw new Error('Failed to create skill');
    }

    return created;
  }
}
