import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [DbModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
