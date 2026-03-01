import { Module } from '@nestjs/common';
import { db } from './db';

export const DB = 'DB';

@Module({
  providers: [
    {
      provide: DB,
      useValue: db,
    },
  ],
  exports: [DB],
})
export class DbModule {}
