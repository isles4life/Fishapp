import { Module } from '@nestjs/common';
import { TournamentEntryService } from './tournament-entry.service';
import { TournamentEntryController } from './tournament-entry.controller';
import { PrismaModule } from '../common/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TournamentEntryController],
  providers: [TournamentEntryService],
  exports: [TournamentEntryService],
})
export class TournamentEntryModule {}
