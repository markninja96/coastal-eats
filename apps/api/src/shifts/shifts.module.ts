import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [DbModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
})
export class ShiftsModule {}
