import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [DbModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
