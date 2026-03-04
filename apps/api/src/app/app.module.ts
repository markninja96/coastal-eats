import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { LocationsModule } from '../locations/locations.module';
import { SkillsModule } from '../skills/skills.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    DbModule,
    AuthModule,
    ShiftsModule,
    LocationsModule,
    SkillsModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
