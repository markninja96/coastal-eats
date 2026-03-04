import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [DbModule],
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
