import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [DbModule, AuthModule, ShiftsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
